import os
import pathlib
from collections.abc import AsyncIterator
from typing import Any, Union
from dotenv import load_dotenv
import asyncpg
import cocoindex as coco
from cocoindex.connectors import localfs, postgres, sqlite
from cocoindex.ops.text import RecursiveSplitter
from cocoindex.resources.file import FileLike, PatternFilePathMatcher
from cocoindex.resources.id import generate_id

from models import KGEntityRecord, KGRelationRecord
from extractors import extract_knowledge_graph, compute_embedding
from pdf_utils import extract_text_from_pdf

# Load environment configuration
load_dotenv()

DATABASE_URL = os.getenv("POSTGRES_URL", "").strip()
USE_SQLITE = (
    os.getenv("USE_SQLITE", "false").lower() in ("1", "true", "yes")
    or not DATABASE_URL
    or DATABASE_URL.startswith("sqlite")
)

LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

PG_DB = coco.ContextKey[asyncpg.Pool]("pg_db")
SQLITE_DB = coco.ContextKey[sqlite.ManagedConnection]("sqlite_db")
_splitter = RecursiveSplitter()


@coco.lifespan
async def coco_lifespan(builder: coco.EnvironmentBuilder) -> AsyncIterator[None]:
    """Manages application-wide resources and connection pools (Postgres or SQLite)."""
    builder.settings.db_path = pathlib.Path("./cocoindex.db")
    if USE_SQLITE:
        conn = sqlite.connect("./knowledge_graph.db", load_vec="auto")
        builder.provide(SQLITE_DB, conn)
        yield
        conn.close()
    else:
        async with await asyncpg.create_pool(DATABASE_URL) as pool:
            builder.provide(PG_DB, pool)
            yield


@coco.fn(memo=True)
async def process_file(
    file: FileLike,
    entities_table: Any,
    relations_table: Any,
) -> None:
    """
    Processes an individual file: extracts text, detects chunks,
    extracts entities & relations via LLM, and declares rows in target tables.
    Memoized with memo=True to avoid re-extraction when file content is unchanged.
    """
    file_path_str = str(file.file_path.path)

    # 1. Read document content based on extension
    if file_path_str.lower().endswith(".pdf"):
        data = await file.read()
        text = extract_text_from_pdf(data)
    else:
        text = await file.read_text()

    if not text.strip():
        return

    # 2. Split text into manageable chunks
    chunks = _splitter.split(text, chunk_size=3000, chunk_overlap=300)

    for chunk in chunks:
        # 3. Extract Knowledge Graph entities & relations
        extracted = await extract_knowledge_graph(chunk.text, model=LLM_MODEL)

        # 4. Declare entities
        for ent in extracted.entities:
            entity_id = await generate_id(
                f"entity:{ent.name.strip().lower()}:{ent.entity_type.strip().lower()}"
            )
            embedding_vec = await compute_embedding(
                f"{ent.name}: {ent.description}", model=EMBEDDING_MODEL
            )
            entities_table.declare_row(
                row=KGEntityRecord(
                    id=entity_id,
                    name=ent.name.strip(),
                    entity_type=ent.entity_type.strip().upper(),
                    description=ent.description.strip(),
                    embedding=embedding_vec,
                    source_file=file_path_str,
                )
            )

        # 5. Declare relations
        for rel in extracted.relations:
            rel_id = await generate_id(
                f"relation:{rel.source_entity.strip().lower()}:{rel.target_entity.strip().lower()}:{rel.relation_type.strip().lower()}"
            )
            relations_table.declare_row(
                row=KGRelationRecord(
                    id=rel_id,
                    source_entity=rel.source_entity.strip(),
                    target_entity=rel.target_entity.strip(),
                    relation_type=rel.relation_type.strip().upper(),
                    description=rel.description.strip(),
                    weight=rel.weight,
                    source_file=file_path_str,
                )
            )


@coco.fn
async def app_main(sourcedir: pathlib.Path) -> None:
    """Main pipeline execution function declaring source and target bindings."""
    if USE_SQLITE:
        entities_table = await sqlite.mount_table_target(
            SQLITE_DB,
            table_name="kg_entities",
            table_schema=await sqlite.TableSchema.from_class(KGEntityRecord, primary_key=["id"]),
        )
        relations_table = await sqlite.mount_table_target(
            SQLITE_DB,
            table_name="kg_relations",
            table_schema=await sqlite.TableSchema.from_class(KGRelationRecord, primary_key=["id"]),
        )
    else:
        entities_table = await postgres.mount_table_target(
            PG_DB,
            table_name="kg_entities",
            table_schema=await postgres.TableSchema.from_class(KGEntityRecord, primary_key=["id"]),
        )
        entities_table.declare_vector_index(column="embedding")

        relations_table = await postgres.mount_table_target(
            PG_DB,
            table_name="kg_relations",
            table_schema=await postgres.TableSchema.from_class(KGRelationRecord, primary_key=["id"]),
        )

    # Walk source directory with live mode tracking
    files = localfs.walk_dir(
        sourcedir,
        recursive=True,
        path_matcher=PatternFilePathMatcher(
            included_patterns=["**/*.md", "**/*.pdf", "**/*.txt"],
            excluded_patterns=[".*/**", "__pycache__/**"],
        ),
        live=True,
    )

    await coco.mount_each(process_file, files.items(), entities_table, relations_table)


# Top-level executable App binding
app = coco.App(
    coco.AppConfig(name="knowledge_graph_pipeline"),
    app_main,
    sourcedir=pathlib.Path(os.getenv("SOURCE_DOCS_DIR", "./data")),
)

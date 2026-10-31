"""Minimal repo index: chunk markdown + TS sources into local sqlite (no embeddings)."""
import pathlib
import time
from collections.abc import Iterator
from dataclasses import dataclass

import cocoindex as coco
from cocoindex.connectors import localfs, sqlite
from cocoindex.ops.text import RecursiveSplitter, detect_code_language
from cocoindex.resources.file import FileLike, PatternFilePathMatcher
from cocoindex.resources.id import generate_id

SQLITE_DB = coco.ContextKey[sqlite.ManagedConnection]("sqlite_db")
_splitter = RecursiveSplitter()


@dataclass
class CodeChunk:
    id: int
    filename: str
    chunk_index: int
    text: str


@coco.lifespan
def coco_lifespan(builder: coco.EnvironmentBuilder) -> Iterator[None]:
    builder.settings.db_path = pathlib.Path("./cocoindex.db")
    db_path = pathlib.Path("./cocoindex.db")
    if db_path.exists():
        db_path.unlink()
    conn = sqlite.connect(str(db_path))
    builder.provide(SQLITE_DB, conn)
    yield
    conn.close()


@coco.fn(memo=True)
async def process_file(file: FileLike, table: sqlite.TableTarget[CodeChunk]) -> None:
    try:
        text = await file.read_text()
    except UnicodeDecodeError:
        return  # shortcut: skip binary files matching patterns, revisit if real sources are skipped
    chunks = _splitter.split(
        text,
        chunk_size=1000,
        chunk_overlap=200,
        language=detect_code_language(filename=file.file_path.path.name),
    )
    for i, chunk in enumerate(chunks):
        table.declare_row(row=CodeChunk(
            id=await generate_id(f"{file.file_path.path}:{i}:{chunk.text}"),
            filename=str(file.file_path.path),
            chunk_index=i,
            text=chunk.text,
        ))


@coco.fn
async def app_main(sourcedir: pathlib.Path) -> None:
    table = await sqlite.mount_table_target(
        SQLITE_DB,
        table_name="code_chunks",
        table_schema=await sqlite.TableSchema.from_class(CodeChunk, primary_key=["id"]),
    )
    files = localfs.walk_dir(
        sourcedir,
        recursive=True,
        path_matcher=PatternFilePathMatcher(
            included_patterns=["**/*.md", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py"],
            excluded_patterns=["node_modules/**", ".git/**", ".worktrees/**"],
        ),
    )
    await coco.mount_each(process_file, files.items(), table)


app = coco.App(
    coco.AppConfig(name="repo_index"),
    app_main,
    sourcedir=pathlib.Path("."),
)

if __name__ == "__main__":
    app.update_blocking()

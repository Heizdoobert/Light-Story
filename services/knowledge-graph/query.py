import os
import sys
import sqlite3
import hashlib
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("POSTGRES_URL", "").strip()
USE_SQLITE = (
    os.getenv("USE_SQLITE", "false").lower() in ("1", "true", "yes")
    or not DATABASE_URL
    or DATABASE_URL.startswith("sqlite")
)


def get_sqlite_conn() -> sqlite3.Connection:
    return sqlite3.connect("./knowledge_graph.db")


def list_graph_sqlite() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Retrieve all entities and relations from SQLite."""
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    entities = [
        dict(row)
        for row in cur.execute(
            "SELECT id, name, entity_type, description, source_file FROM kg_entities"
        ).fetchall()
    ]
    relations = [
        dict(row)
        for row in cur.execute(
            "SELECT id, source_entity, target_entity, relation_type, description, weight FROM kg_relations"
        ).fetchall()
    ]
    conn.close()
    return entities, relations


def get_entity_subgraph_sqlite(name: str) -> Dict[str, Any]:
    """Get an entity and all its 1-hop connected neighbors and relations."""
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    target = cur.execute(
        "SELECT id, name, entity_type, description FROM kg_entities WHERE LOWER(name) LIKE LOWER(?)",
        (f"%{name}%",),
    ).fetchone()

    if not target:
        conn.close()
        return {"entity": None, "relations": [], "neighbors": []}

    target_name = target["name"]
    relations = [
        dict(row)
        for row in cur.execute(
            """SELECT source_entity, relation_type, target_entity, description, weight 
               FROM kg_relations 
               WHERE LOWER(source_entity) = LOWER(?) OR LOWER(target_entity) = LOWER(?)""",
            (target_name, target_name),
        ).fetchall()
    ]

    neighbor_names = set()
    for rel in relations:
        neighbor_names.add(rel["source_entity"])
        neighbor_names.add(rel["target_entity"])

    neighbors = [
        dict(row)
        for row in cur.execute(
            f"SELECT name, entity_type, description FROM kg_entities WHERE name IN ({','.join(['?']*len(neighbor_names))})",
            list(neighbor_names),
        ).fetchall()
    ]

    conn.close()
    return {"entity": dict(target), "relations": relations, "neighbors": neighbors}


def re_safe_id(name: str) -> str:
    """Generate safe, deterministic ASCII node IDs for Mermaid diagrams."""
    h = hashlib.md5(name.encode("utf-8")).hexdigest()[:8]
    return f"node_{h}"


def export_mermaid(entities: List[Dict[str, Any]], relations: List[Dict[str, Any]]) -> str:
    """Generate Mermaid flowchart diagram from entities and relationships."""
    lines = ["```mermaid", "graph LR"]
    
    # Entity nodes styling
    for e in entities:
        safe_id = re_safe_id(e["name"])
        lines.append(f'    {safe_id}["{e["name"]} ({e["entity_type"]})"]')

    # Relation edges
    for r in relations:
        src = re_safe_id(r["source_entity"])
        tgt = re_safe_id(r["target_entity"])
        label = r["relation_type"]
        lines.append(f"    {src} -->|{label}| {tgt}")

    lines.append("```")
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        cmd = "list"
    else:
        cmd = sys.argv[1].lower()

    entities, relations = list_graph_sqlite()

    if cmd == "list":
        print(f"\n=== KNOWLEDGE GRAPH OVERVIEW ===")
        print(f"Tổng số thực thể (Nodes): {len(entities)}")
        for e in entities:
            print(f"  [{e['entity_type']}] {e['name']}: {e['description']}")

        print(f"\nTổng số mối quan hệ (Edges): {len(relations)}")
        for r in relations:
            print(f"  ({r['source_entity']}) ---[{r['relation_type']}]---> ({r['target_entity']}) : {r['description']}")

    elif cmd == "search":
        query_name = sys.argv[2] if len(sys.argv) > 2 else "Aria"
        subgraph = get_entity_subgraph_sqlite(query_name)
        if not subgraph["entity"]:
            print(f"Không tìm thấy thực thể chứa: '{query_name}'")
            return

        ent = subgraph["entity"]
        print(f"\n=== THỰC THỂ: {ent['name']} ({ent['entity_type']}) ===")
        print(f"Mô tả: {ent['description']}")
        print(f"\nCác mối quan hệ liên kết:")
        for r in subgraph["relations"]:
            print(f"  • {r['source_entity']} --[{r['relation_type']}]--> {r['target_entity']} ({r['description']})")

    elif cmd == "mermaid":
        print("\n=== MERMAID DIAGRAM ===")
        print(export_mermaid(entities, relations))

    else:
        print(f"Lệnh không hỗ trợ: {cmd}. Các lệnh: list, search <tên>, mermaid")


if __name__ == "__main__":
    main()

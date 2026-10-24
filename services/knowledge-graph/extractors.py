import os
import re
import hashlib
import numpy as np
from typing import List
import instructor
from litellm import acompletion, aembedding
from models import KnowledgeGraphExtraction, ExtractedEntity, ExtractedRelation

# Initialize instructor client with LiteLLM for robust JSON structured output
_instructor_client = instructor.from_litellm(acompletion, mode=instructor.Mode.JSON)


def _get_mock_embedding(text: str, size: int = 1536) -> np.ndarray:
    """Generate deterministic normalized pseudo-vector for local testing when no API key is set."""
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(size).astype(np.float32)
    norm = np.linalg.norm(vec)
    return vec / (norm if norm > 0 else 1.0)


def _heuristic_offline_extraction(content: str) -> KnowledgeGraphExtraction:
    """
    Offline rule-based entity and relationship extractor for local development
    when no LLM API key (OpenAI/Gemini/Anthropic) is configured.
    Parses Markdown bold entries and relation lines.
    """
    entities: List[ExtractedEntity] = []
    relations: List[ExtractedRelation] = []

    # 1. Parse bullet items like `- **Entity Name**: Description`
    entity_pattern = re.compile(r"[-*]\s+\*\*([^*]+)\*\*:\s*(.+)")
    for match in entity_pattern.finditer(content):
        name = match.group(1).strip()
        desc = match.group(2).strip()

        # Simple classification heuristic
        lower_desc = desc.lower()
        if any(w in lower_desc for w in ["người", "pháp sư", "đội trưởng", "chúa tể", "nhân vật", "vua", "hiệp sĩ"]):
            etype = "PERSON"
        elif any(w in lower_desc for w in ["đế quốc", "vùng đất", "vương quốc", "thủ phủ", "thành phố", "nơi"]):
            etype = "LOCATION"
        elif any(w in lower_desc for w in ["vũ khí", "trượng", "viên đá", "bảo vật", "kiếm"]):
            etype = "ARTIFACT"
        else:
            etype = "CONCEPT"

        entities.append(ExtractedEntity(name=name, entity_type=etype, description=desc))

    # 2. Extract relations between known entities
    known_names = [e.name for e in entities]
    lines = content.splitlines()
    for line in lines:
        line_clean = line.strip(" -*")
        found = [name for name in known_names if name.lower() in line_clean.lower()]
        if len(found) >= 2:
            src, tgt = found[0], found[1]
            rel_type = "RELATED_TO"
            lower_line = line_clean.lower()
            if any(w in lower_line for w in ["thuộc cấp", "bảo vệ", "bạn thân", "đồng minh"]):
                rel_type = "ALLY_OF"
            elif any(w in lower_line for w in ["đối đầu", "tuyên chiến", "kẻ thù", "cướp"]):
                rel_type = "OPPONENT_OF"
            elif any(w in lower_line for w in ["sở hữu", "điều khiển", "sử dụng"]):
                rel_type = "USES"
            elif any(w in lower_line for w in ["đến từ", "ở", "nằm ở", "thuộc"]):
                rel_type = "LOCATED_IN"

            relations.append(
                ExtractedRelation(
                    source_entity=src,
                    target_entity=tgt,
                    relation_type=rel_type,
                    description=line_clean,
                    weight=0.9,
                )
            )

    return KnowledgeGraphExtraction(
        summary=f"Trích xuất offline từ văn bản ({len(entities)} thực thể, {len(relations)} quan hệ)",
        entities=entities,
        relations=relations,
    )


async def extract_knowledge_graph(content: str, model: str = "gpt-4o-mini") -> KnowledgeGraphExtraction:
    """
    Extracts entities and relationships from text using an LLM.
    If no LLM API key is present in environment, returns heuristic offline extraction.
    """
    has_api_key = bool(
        os.getenv("OPENAI_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )

    if not has_api_key:
        return _heuristic_offline_extraction(content)

    prompt = (
        "Bạn là chuyên gia phân tích văn bản và xây dựng Knowledge Graph.\n"
        "Hãy đọc đoạn văn sau và trích xuất:\n"
        "1. Danh sách các thực thể quan trọng (nhân vật, tổ chức, địa điểm, khái niệm, tác phẩm).\n"
        "2. Mối quan hệ giữa các thực thể vừa trích xuất (rõ ràng, có ý nghĩa ngữ cảnh).\n\n"
        f"Nội dung văn bản:\n{content}"
    )

    result = await _instructor_client.chat.completions.create(
        model=model,
        response_model=KnowledgeGraphExtraction,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return result


async def compute_embedding(text: str, model: str = "text-embedding-3-small") -> np.ndarray:
    """
    Computes a 1536-dim embedding vector using LiteLLM.
    Falls back to deterministic pseudo-embedding if API keys are unset.
    """
    has_api_key = bool(os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY"))

    if not has_api_key:
        return _get_mock_embedding(text, size=1536)

    try:
        response = await aembedding(model=model, input=[text])
        raw_vec = response.data[0]["embedding"]
        vec = np.array(raw_vec, dtype=np.float32)

        # Ensure exact 1536 dimensions
        if len(vec) < 1536:
            vec = np.pad(vec, (0, 1536 - len(vec)), "constant")
        elif len(vec) > 1536:
            vec = vec[:1536]
        return vec
    except Exception as e:
        print(f"[Warning] Failed to generate embedding with {model}: {e}. Using deterministic fallback.")
        return _get_mock_embedding(text, size=1536)

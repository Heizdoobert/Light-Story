from dataclasses import dataclass
from typing import Annotated, List, Optional
import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel, Field
from cocoindex.resources.schema import VectorSchema

# 1536 dimensions matching Supabase vector(1536) in Light Story
VECTOR_SCHEMA_1536 = VectorSchema(dtype=np.dtype(np.float32), size=1536)


# ── Pydantic models for LLM Structured Extraction ─────────────

class ExtractedEntity(BaseModel):
    name: str = Field(description="Tên thực thể (nhân vật, địa điểm, tổ chức, khái niệm, tác phẩm...)")
    entity_type: str = Field(description="Loại thực thể: PERSON, LOCATION, ORGANIZATION, CONCEPT, ARTIFACT, EVENT")
    description: str = Field(description="Mô tả súc tích về thực thể trong ngữ cảnh tài liệu")


class ExtractedRelation(BaseModel):
    source_entity: str = Field(description="Tên thực thể nguồn (chủ thể)")
    target_entity: str = Field(description="Tên thực thể đích (đối tượng)")
    relation_type: str = Field(description="Quan hệ chuẩn hoá: CREATED_BY, MEMBER_OF, LOCATED_IN, ALLY_OF, OPPONENT_OF, USES, PART_OF")
    description: str = Field(description="Chi tiết giải thích mối quan hệ")
    weight: float = Field(default=1.0, ge=0.0, le=1.0, description="Độ tin cậy hoặc cường độ quan hệ từ 0.0 đến 1.0")


class KnowledgeGraphExtraction(BaseModel):
    summary: str = Field(description="Tóm tắt ngắn gọn nội dung tài liệu trích xuất")
    entities: List[ExtractedEntity] = Field(default_factory=list, description="Danh sách các thực thể tìm thấy")
    relations: List[ExtractedRelation] = Field(default_factory=list, description="Danh sách các mối quan hệ giữa các thực thể")


# ── Dataclasses for PostgreSQL Target Tables ──────────────────

@dataclass
class KGEntityRecord:
    id: int
    name: str
    entity_type: str
    description: str
    embedding: Annotated[NDArray, VECTOR_SCHEMA_1536]
    source_file: str


@dataclass
class KGRelationRecord:
    id: int
    source_entity: str
    target_entity: str
    relation_type: str
    description: str
    weight: float
    source_file: str

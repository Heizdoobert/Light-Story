# Light Story — Knowledge Graph Pipeline (CocoIndex v1)

Hệ thống trích xuất và xây dựng **Knowledge Graph** (Thực thể & Quan hệ) từ tài liệu Markdown và PDF, đồng bộ hóa tự động vào cơ sở dữ liệu **PostgreSQL (Supabase) + pgvector** sử dụng thư viện **CocoIndex v1**.

---

## 🚀 Tính Năng Chính

- **Incremental Processing**: CocoIndex tự động phát hiện tệp tài liệu mới/thay đổi và chỉ trích xuất phần dữ liệu mới.
- **Memoization**: Nhờ `@coco.fn(memo=True)`, pipeline không bao giờ gọi lại LLM tốn kém nếu nội dung tệp không thay đổi.
- **LLM Structured Extraction**: Sử dụng `litellm` + `instructor` để trích xuất danh sách Thực thể (`kg_entities`) và Mối quan hệ (`kg_relations`) dưới dạng JSON chuẩn xác.
- **Tương thích pgvector 1536-dim**: Vector embeddings được sinh và đánh chỉ mục vector tương thích hoàn toàn với cấu hình database Supabase của Light Story.
- **Hỗ trợ chế độ Live**: Chạy với cờ `-L` để tự động lắng nghe và cập nhật đồ thị tri thức khi có tệp tài liệu mới được thả vào thư mục.

---

## 🛠️ Cài Đặt Môi Trường

Tại thư mục `services/knowledge-graph`:

```bash
# Sử dụng uv (khuyến nghị vì tốc độ cực nhanh và đã có sẵn trong máy):
uv venv
uv pip install -e .

# Hoặc dùng pip truyền thống:
python -m venv .venv
# Trên Windows:
.venv\Scripts\activate
pip install -e .
```

---

## ⚙️ Cấu Hình (.env)

Tạo tệp `.env` từ `.env.example`:

```ini
# Kết nối PostgreSQL (Supabase hoặc local)
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres

# Cấu hình LLM & Embeddings (LiteLLM)
OPENAI_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

# Thư mục chứa tài liệu (mặc định ./data)
SOURCE_DOCS_DIR=./data
```

*(Lưu ý: Nếu chưa cấu hình `OPENAI_API_KEY`, pipeline sẽ tự động fallback sang chế độ phát sinh vector kiểm thử nội bộ để bạn có thể test chạy thử luồng dữ liệu mà không bị crash).*

---

## 🏃 Hướng Dẫn Sử Dụng

### 1. Chạy cập nhật một lần (Catch-up Mode)
Quét toàn bộ tài liệu trong `./data`, trích xuất và đồng bộ vào PostgreSQL:

```bash
uv run cocoindex update main.py
```

### 2. Chạy chế độ liên tục (Live Mode)
Theo dõi thư mục `./data` theo thời gian thực (khi bạn thêm, sửa, xoá file `.md` hoặc `.pdf`, đồ thị tri thức trong PostgreSQL sẽ tự động cập nhật ngay lập tức):

```bash
uv run cocoindex update main.py -L
```

### 3. Kiểm tra danh sách component và trạng thái
```bash
uv run cocoindex show main.py --tree
```

### 4. Xoá sạch trạng thái cache khi muốn re-index từ đầu
```bash
uv run cocoindex update main.py --full-reprocess
```

---

## 🔍 Truy Vấn & Trực Quan Hóa Đồ Thị (Query CLI)

Sau khi pipeline chạy xong, bạn có thể tra cứu và hiển thị đồ thị tri thức thông qua `query.py`:

```bash
# Liệt kê tất cả Nodes (thực thể) và Edges (quan hệ)
python query.py list

# Tra cứu 1 thực thể cụ thể và xem tất cả các mối quan hệ 1-hop xung quanh nó
python query.py search "Aria Vespera"

# Xuất sơ đồ Mermaid để nhúng vào tài liệu Markdown hoặc xem trực quan
python query.py mermaid
```


# MCP LightStory

MCP server exposing the Light Story API as LLM tools.

## Tools

| Tool | Description |
|------|-------------|
| `list_comics` | List comics (stories) with optional keyword filter |
| `get_comic` | Get comic detail by ID |
| `create_comic` | Create a new comic (staff role) |
| `update_comic` | Update a comic (staff role) |
| `delete_comic` | Delete a comic (staff role) |
| `list_stories` | List public stories (published/ongoing) |
| `get_story` | Get story detail by ID |
| `list_categories` | List all categories |
| `list_chapters` | List chapters for a comic |
| `search` | Search comics by keyword |

## Usage

```bash
# Set env vars
$env:SUPABASE_ANON_KEY='...'

# Run via stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node src/index.js
```

## Config for Claude Code / OpenCode

Add to opencode.json:

```json
{
  "mcpServers": {
    "mcp-lightstory": {
      "command": "node",
      "args": ["packages/mcp-lightstory/src/index.js"],
      "env": {
        "SUPABASE_ANON_KEY": "<key>",
        "GATEWAY_URL": "http://localhost:8787"
      }
    }
  }
}
```

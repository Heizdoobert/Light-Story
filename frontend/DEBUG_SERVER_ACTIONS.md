# Debugging Server Actions with Breakpoints

Target directory: `frontend/src/actions/` (Server Actions, `'use server'`)

> Key fact: server actions execute in the **Next.js dev server process (Node.js)**, NOT the browser.
> You cannot step into them from browser DevTools — you must attach a Node debugger to the dev server.

---

## 1. Architecture cheat sheet (read first)

All actions share 3 plumbing modules. Debug these once — they are the funnel every action passes through.

| File | Role |
|---|---|
| `src/actions/result.ts` | `act()` — zod-validates input, runs the callback, converts `RunResult` → `ActionResult`. **Universal choke point.** |
| `src/actions/http.ts` | `fetchApi()` — attaches Supabase session token + calls the gateway. `messageFromResponse()` — parses error bodies. |
| `src/lib/security/permission.ts` | `requireActionRole()` — every admin action calls this first; throws → "Bạn không có quyền…" |

Every action's shape:

```
export async function foo(input) {
  try { await requireActionRole(ACTION_ADMIN_ROLES); } catch { return {success:false, error:'Bạn không có quyền…'}; }
  return act(schema, input, async (parsed) => {
    const res = await fetchApi('/api/...', { method:'POST', body:JSON.stringify({...}) });
    if (!res.ok) return { ok:false, error: await messageFromResponse(res) };
    revalidateTag('...', 'max');
    return { ok:true };
  });
}
```

---

## 2. Breakpoint targets by file

### Shared plumbing (debug these FIRST — hit by every action)

**`result.ts`** — `act()`:
- L17 `schema.safeParse(input)` — inspect `input` (what the client sent) & `parsed.success`.
- L22 `Invalid input: ${detail}` — zod rejection; exact field + message.
- L25 `run(parsed.data)` — **step into the action callback**.
- L27 `getErrorMessage(err)` — uncaught throw from callback; stack traces here.

**`http.ts`**:
- L18 `createClient()` — is the server Supabase client healthy?
- L19 `supabase.auth.getSession()` — `data.session?.access_token` (null → request sent unauthenticated).
- L27 `fetch(...)` — inspect final `url` + `headers` + `body` before it leaves.
- L10 `throw new Error('Missing …NEXT_PUBLIC_GATEWAY_URL')` — env not loaded in this process.
- L31-50 `messageFromResponse()` — body shape `{error:{message}}` vs `{message}` vs string.

**`permission.ts`** — `requireActionRole()`: inspect caller role vs `ACTION_ADMIN_ROLES`.

---

### Per-file targets (each action = 3 useful breakpoints: entry, auth, callback/fetch)

| File | Breakpoint lines | What to watch |
|---|---|---|
| `admin-users.actions.ts` | `updateProfileRole` L16/23/24; `updateProfileName` L62; `updateUserStatus` L88; `manageAdminUser` L112/114/126/133/137/147/155 | **L126** `shouldFallbackToEdgeFunction` regex + `res.status` (the 5xx→edge-fn fallback decision); **L137** edge function URL/headers; **L147** edge JSON shape |
| `admin-stories.actions.ts` | `updateStoryStatus` L19/25/26; `featureStory` L39/45/46; `deleteStoryAdmin` L59/65/66; `updateStory` L79/85/86; `deleteStory` L99/105/106; `bulkUpdateStatus` L119/125/126; `bulkDeleteStories` L139/145/146 | body `{action, id, status}`; two `revalidateTag`s fire on success |
| `ads.actions.ts` | `updateAdConfig` L15/24/25; `updateAdSlot` L45/54/55; `toggleAdSlot` L68/77/79 | **L78** `key = slot || AD_CONTROL_KEYS.enabled` default |
| `bookmarks.actions.ts` | `addBookmark` L11/12/13; `removeBookmark` L25/26/27; `toggleBookmark` L39/40/41 | endpoint `/api/user/bookmarks/{add,remove,toggle}`; NO role guard (user-scoped) |
| `chapter-form.actions.ts` | `createChapter` L11/17/18 | body `{chapter}`; tag `chapters` |
| `ops.actions.ts` | `setMaintenanceMode` L15/23/24; `clearCache` L42/50/52; `triggerBackup` L64/72/74 | **L51** `target ?? 'all'`; **L73** `type ?? 'full'` defaults |
| `reading-history.actions.ts` | `saveReadingProgress` L15/20/21; `clearReadingHistory` L35/36/37 | POST vs DELETE `/api/user/history` |
| `stories.actions.ts` | `incrementStoryView` L13/14/15/16 | **L14** string-vs-object normalization |
| `story-form.actions.ts` | `createStory` L10/16/17 | body `{story}`; tags `admin_stories` + `admin-dashboard-metrics` |
| `story.actions.ts` | `toggleStoryLike` L17/19/20 | body `{story_id_param}` to `/api/rpc/toggle_story_like` |
| `system-settings.actions.ts` | `saveSystemSettings` L12/18/26 | **L19-24** snapshot→`payload` array mapping |
| `taxonomy.actions.ts` | each of 12 fns entry + callback, e.g. `createCategory` L37/43/44; `updateAuthor` L114/120/121; `deleteGenre` L191/197/198 | body `{entity:'category|author|genre|tag', action:'create|update|delete', payload}`; tag `taxonomy` |
| `translators.actions.ts` | `createTranslator` L29/35/36 (POST); `updateTranslator` L52/58/59 (PATCH `/api/admin/translators/${id}`); `deleteTranslator` L71/77/78 (DELETE) | method + URL differ per verb |

---

## 3. VSCode — end-to-end

### 3a. Launch config

Open **`frontend/`** as the workspace folder. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach: Next.js dev server (server actions)",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/.next/server/**/*.js"]
    }
  ]
}
```

### 3b. Steps

1. Start the dev server **with the inspector port** (PowerShell):
   ```powershell
   $env:NODE_OPTIONS="--inspect=9229"; npm run dev
   ```
   (Or add `"dev": "NODE_OPTIONS=--inspect=9229 next dev"` to `frontend/package.json` scripts — but that only works in bash; keep the env-var method on Windows.)
2. VSCode: **Run and Debug** (Ctrl+Shift+D) → **Attach: Next.js dev server** → F5. Terminal shows `Debugger attached.`
3. Open the target action file (e.g. `src/actions/taxonomy.actions.ts`). Click the gutter to set red breakpoints (entry, callback, `http.ts` L27).
4. In the browser go to the admin page that calls the action (e.g. `/admin/categories` → create a category) and submit.
5. Execution pauses in the dev server; inspect locals (`input`, `res`, `parsed`) in the **Variables** pane, step with F10/F11.

> If breakpoints show as hollow / never bind: server action files are compiled into `.next/server`. Ensure `outFiles` is correct, click **Debug → Restart**, or trigger the action once so the module loads, then attach.

---

## 4. LazyVim (Neovim) — end-to-end

Uses `nvim-dap` + `nvim-dap-vscode-js` (LazyVim `dap` extra).

### 4a. One-time setup

1. Enable the DAP extra: `:LazyExtras` → find **dap** (`dap.core` + `dap.nlua`) → `x` to install.
2. Add the Node adapter plugin (LazyVim style). Create `~/.config/nvim/lua/plugins/js-dap.lua`:
   ```lua
   return {
     {
       "mxsdev/nvim-dap-vscode-js",
       config = function()
         local dap = require("dap")
         dap.adapters["pwa-node"] = {
           type = "server",
           host = "localhost",
           port = "${port}",
           executable = {
             command = "js-debug-adapter",
             args = { "${port}" },
           },
         }
         for _, type in ipairs({ "node", "pwa-node" }) do
           dap.configurations[type] = dap.configurations[type] or {}
           table.insert(dap.configurations[type], {
             name = "Attach to Next.js dev server (9229)",
             type = "pwa-node",
             request = "attach",
             port = 9229,
             sourceMaps = true,
             resolveSourceMapLocations = { "${workspaceFolder}/**", "**/node_modules/**" },
           })
         end
       end,
     },
   }
   ```
3. Restart Neovim (`:Lazy reload nvim-dap-vscode-js` or full restart).

### 4b. Steps

1. Start dev server with inspector (same as VSCode):
   ```powershell
   $env:NODE_OPTIONS="--inspect=9229"; npm run dev
   ```
2. In Neovim: `:lua require("dap").continue()` → pick **Attach to Next.js dev server (9229)** → Enter.
3. Open target action file. Toggle breakpoint: `<leader>db` (LazyVim keymap for `dap.toggle_breakpoint()`).
4. Trigger the action in the browser.
5. Control (LazyVim defaults):
   - `<leader>dc` continue · `<leader>ds` step over · `<leader>di` step into · `<leader>do` step out
   - `<leader>du` up · `<leader>dd` down · `<leader>dt` terminate/stop
   - `<leader>dh` hover (`dap.ui.widgets`) · `<leader>dr` REPL
   - Nvim-dap-ui (included in LazyVim): watch/scopes/breakpoints panels open automatically.

---

## 5. End-to-end walkthrough (example: `createCategory`)

Goal: find why "create category" fails silently.

1. Start server + attach debugger (3b or 4b).
2. Breakpoints:
   - `result.ts` L17 (input), L25 (before callback)
   - `taxonomy.actions.ts` L43 (callback), L44 (fetch)
   - `http.ts` L27 (outgoing request)
3. Browser: `/admin/categories` → create "Sci-Fi" → submit.
4. Read the call frames at each stop:
   - **L17**: `input = { name: 'Sci-Fi', description: null }` — confirms client payload.
   - **L43**: `parsed` matches schema.
   - **L44 → http.ts L27**: `url = <GATEWAY>/api/admin/taxonomy`, method POST, Authorization Bearer `<token>`, body `{entity:'category',action:'create',payload:{name:'Sci-Fi',description:null}}`.
5. If you never reach `result.ts` L25: the breakpoint at `permission.ts` → role not in `ACTION_ADMIN_ROLES` → "Bạn không có quyền…" response. Check middleware + `app_metadata.role`.

### Symptom → checkpoint table

| Symptom | Check |
|---|---|
| `{success:false, error:'Bạn không có quyền thực hiện thao tác này'}` | `requireActionRole` throw (permission.ts) — role lookup |
| `{success:false, error:'Invalid input: …'}` | `result.ts` L22 — client payload vs schema mismatch |
| Never hits callback | breakpoint at `result.ts` L17; `input` is `undefined`/wrong shape |
| 401/403 from gateway | `http.ts` L19 `getSession()` → `access_token` null; token not attached |
| `res.ok === false` | `http.ts` L27 inspect URL; then `messageFromResponse` parse |
| Missing `NEXT_PUBLIC_GATEWAY_URL` throw | `http.ts` L10 — env var absent in dev server process |
| 5xx from `/api/admin/manage-user` | `admin-users.actions.ts` L126 fallback-to-edge regex; L137 edge call |

---

## 6. Gotchas

- **Debugger must attach to the SAME process that serves your browser request.** If you started `npm run dev` in another terminal without `NODE_OPTIONS=--inspect=9229`, attach fails.
- Turbopack may compile server-action modules lazily — trigger the action once, then attach, or restart debugger.
- `revalidateTag(tag, 'max')` requires the second arg in Next 16 — unrelated to breakpoints, but visible at the end of every callback.
- Browser DevTools Network tab (same-origin POST) is a good coarse check *before* attaching a Node debugger: it shows request URL + response `{success,data|error}`. It just cannot step into the server code.
- Do not run the inspector on the `preview` branch for production traffic; dev only.

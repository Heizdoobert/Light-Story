#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8787';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xgtlrztskoomimvfpdoy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@lightstory.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

let authToken = null;
let tokenExpires = 0;

async function ensureToken() {
  if (authToken && Date.now() < tokenExpires) return authToken;
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  if (!res.ok) throw new Error('Supabase auth failed: ' + res.status);
  const body = await res.json();
  authToken = body.access_token;
  tokenExpires = Date.now() + ((body.expires_in || 3600) - 60) * 1000;
  return authToken;
}

async function api(path, opts = {}) {
  const token = await ensureToken();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  if (opts.headers) Object.assign(headers, opts.headers);
  const url = GATEWAY_URL + '/api' + path;
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, ok: res.ok, body };
}

const server = new Server({ name: 'mcp-lightstory', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_comics',
      description: 'List comics (stories), optionally filtered by keyword',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Filter by title or author keyword' },
          page: { type: 'number', description: 'Page number (default 1)' },
          pageSize: { type: 'number', description: 'Items per page (default 10, max 100)' }
        }
      }
    },
    {
      name: 'get_comic',
      description: 'Get comic detail by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Comic UUID' }
        },
        required: ['id']
      }
    },
    {
      name: 'create_comic',
      description: 'Create a new comic (staff role required)',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Comic title' },
          author: { type: 'string', description: 'Author name' },
          description: { type: 'string', description: 'Description' },
          status: { type: 'string', enum: ['draft', 'ongoing', 'completed', 'archived'], description: 'Status' },
          coverUrl: { type: 'string', description: 'Cover image URL' }
        },
        required: ['title']
      }
    },
    {
      name: 'update_comic',
      description: 'Update a comic (staff role required)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Comic UUID' },
          title: { type: 'string', description: 'Comic title' },
          author: { type: 'string', description: 'Author name' },
          description: { type: 'string', description: 'Description' },
          status: { type: 'string', enum: ['draft', 'ongoing', 'completed', 'archived'], description: 'Status' },
          coverUrl: { type: 'string', description: 'Cover image URL' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_comic',
      description: 'Delete a comic (staff role required)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Comic UUID' }
        },
        required: ['id']
      }
    },
    {
      name: 'list_stories',
      description: 'List public stories (filtered by published/ongoing/completed status)',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search keyword' },
          category: { type: 'string', description: 'Filter by category' },
          sort: { type: 'string', enum: ['newest', 'popular', 'alphabet', 'newest_update'], description: 'Sort order' },
          page: { type: 'number', description: 'Page number' },
          pageSize: { type: 'number', description: 'Items per page' }
        }
      }
    },
    {
      name: 'get_story',
      description: 'Get story detail by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Story UUID' }
        },
        required: ['id']
      }
    },
    {
      name: 'list_categories',
      description: 'List all categories',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'list_chapters',
      description: 'List chapters for a comic',
      inputSchema: {
        type: 'object',
        properties: {
          comicId: { type: 'string', description: 'Comic UUID' }
        },
        required: ['comicId']
      }
    },
    {
      name: 'search',
      description: 'Search comics by keyword',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search term' },
          category: { type: 'string', description: 'Filter by category' },
          sort: { type: 'string', enum: ['newest', 'popular', 'alphabet'], description: 'Sort' },
          page: { type: 'number', description: 'Page number' }
        },
        required: ['keyword']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    let res;
    switch (name) {
      case 'list_comics': {
        const q = new URLSearchParams();
        if (args?.keyword) q.set('keyword', args.keyword);
        if (args?.page) q.set('page', args.page);
        if (args?.pageSize) q.set('pageSize', args.pageSize);
        res = await api('/comics?' + q.toString());
        break;
      }
      case 'get_comic':
        res = await api('/comics/' + args.id);
        break;
      case 'create_comic':
        res = await api('/admin/comics', { method: 'POST', body: JSON.stringify(args) });
        break;
      case 'update_comic': {
        const { id, ...update } = args;
        res = await api('/admin/comics/' + id, { method: 'PATCH', body: JSON.stringify(update) });
        break;
      }
      case 'delete_comic':
        res = await api('/admin/comics/' + args.id, { method: 'DELETE' });
        break;
      case 'list_stories': {
        const q = new URLSearchParams();
        if (args?.keyword) q.set('keyword', args.keyword);
        if (args?.category) q.set('category', args.category);
        if (args?.sort) q.set('sort', args.sort);
        if (args?.page) q.set('page', args.page);
        if (args?.pageSize) q.set('pageSize', args.pageSize);
        res = await api('/stories?' + q.toString());
        break;
      }
      case 'get_story':
        res = await api('/stories/' + args.id);
        break;
      case 'list_categories':
        res = await api('/categories');
        break;
      case 'list_chapters':
        res = await api('/comics/' + args.comicId + '/chapters');
        break;
      case 'search': {
        const q = new URLSearchParams();
        q.set('keyword', args.keyword);
        if (args?.category) q.set('category', args.category);
        if (args?.sort) q.set('sort', args.sort);
        if (args?.page) q.set('page', args.page);
        res = await api('/stories?' + q.toString());
        break;
      }
      default:
        return { content: [{ type: 'text', text: 'Unknown tool: ' + name }], isError: true };
    }
    const body = JSON.stringify(res.body, null, 2);
    if (!res.ok) {
      return { content: [{ type: 'text', text: body }], isError: true };
    }
    return { content: [{ type: 'text', text: body }] };
  } catch (e) {
    return { content: [{ type: 'text', text: 'Error: ' + (e.message || e) }], isError: true };
  }
});

async function main() {
  if (!SUPABASE_ANON_KEY) {
    console.error('SUPABASE_ANON_KEY environment variable required');
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

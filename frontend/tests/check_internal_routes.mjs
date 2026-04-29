#!/usr/bin/env node
// Lightweight smoke test: verify internal admin routes require auth
const base = process.env.BASE_URL || 'http://localhost:3001'
const endpoints = [
  { path: '/api/internal/admin/profiles', method: 'GET' },
  { path: '/api/internal/admin/audit', method: 'GET' },
  { path: '/api/internal/admin/manage-user', method: 'POST' },
]

async function run() {
  let failed = false
  for (const e of endpoints) {
    const url = base + e.path
    try {
      const res = await fetch(url, { method: e.method })
      if (res.status === 401 || res.status === 403) {
        console.log(`OK: ${e.method} ${e.path} -> ${res.status}`)
      } else {
        console.error(`WARN: ${e.method} ${e.path} -> expected 401/403, got ${res.status}`)
        failed = true
      }
    } catch (err) {
      console.error(`ERROR: ${e.method} ${e.path} -> ${err.message}`)
      failed = true
    }
  }
  if (failed) process.exit(2)
  console.log('All internal-route auth checks passed (or returned expected 401/403).')
}

run()

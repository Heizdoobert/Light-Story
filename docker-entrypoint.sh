#!/bin/bash
set -e
PGBIN=/usr/lib/postgresql/15/bin

mkdir -p /pgdata && chown -R postgres:postgres /pgdata
if [ ! -f /pgdata/PG_VERSION ]; then
  su postgres -c "$PGBIN/initdb -D /pgdata -U postgres --auth-host=scram-sha-256 --auth-local=trust" >/dev/null
fi
su postgres -c "$PGBIN/pg_ctl -D /pgdata -o '-c listen_addresses=127.0.0.1' -l /pgdata/logfile start" >/dev/null
su postgres -c "psql -d postgres -c \"ALTER USER postgres PASSWORD 'password';\"" >/dev/null 2>&1

cd /gateway-app
node_modules/.bin/wrangler dev --config workers/kv-worker/wrangler.jsonc --ip 0.0.0.0 --port 8787 &
GATEWAY_PID=$!

cd /app
PORT=3000 node frontend/server.js &
FRONTEND_PID=$!

cleanup() {
  kill $GATEWAY_PID $FRONTEND_PID 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D /pgdata stop -m fast" >/dev/null 2>&1
}
trap cleanup INT TERM EXIT
wait -n $GATEWAY_PID $FRONTEND_PID

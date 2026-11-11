#!/usr/bin/env bash
# Wipes the staging D1 database (pulsar-staging, shared by staging and PR previews) and rebuilds
# it from the migrations in this checkout. The workflow runs it from main, after a PR that
# changed worker/migrations/ is closed without merging, or on demand.
#
# The database is emptied rather than deleted: deployed Workers bind it by id, and a new
# database would get a new one. Everything in it is throwaway: test accounts, sessions, AI
# usage and test subscriptions. Never point this at production.
set -euo pipefail

DB=pulsar-staging
wrangler() { npx wrangler "$@"; }

tables=$(wrangler d1 execute "$DB" --env staging --remote --json \
  --command "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'" \
  | jq -r '.[0].results[].name')

if [ -n "$tables" ]; then
  sql="PRAGMA defer_foreign_keys = on;"
  while IFS= read -r t; do sql+=" DROP TABLE IF EXISTS \"$t\";"; done <<< "$tables"
  echo "Dropping: $(echo $tables)"
  wrangler d1 execute "$DB" --env staging --remote --command "$sql"
fi

wrangler d1 migrations apply "$DB" --env staging --remote
echo "Staging database rebuilt from this checkout's migrations."

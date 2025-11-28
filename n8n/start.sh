#!/data/data/com.termux/files/usr/bin/sh
# ---------------------------------------------
# n8n Start Script for Termux (Android Phone)
# Uses PostgreSQL (NO SQLite, NO native module builds)
# ---------------------------------------------

echo ">>> Updating packages..."
pkg update -y

echo ">>> Installing required Termux packages..."
pkg install -y nodejs-lts python postgresql

# ---------- PostgreSQL Setup ----------
PGDATA="$PREFIX/var/lib/postgresql"
export PGDATA

if [ ! -d "$PGDATA" ]; then
  echo ">>> Initializing PostgreSQL database..."
  initdb
fi

echo ">>> Starting PostgreSQL..."
pg_ctl start

sleep 2

# Ensure n8n database + user
echo ">>> Ensuring PostgreSQL user and database..."
createuser n8n 2>/dev/null
createdb -O n8n n8n 2>/dev/null
psql -c "ALTER USER n8n WITH PASSWORD 'pass';" >/dev/null

# ---------- PNPM Setup ----------
echo ">>> Ensuring pnpm is installed..."
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

echo ">>> Installing project dependencies (no native builds)..."
pnpm install --shamefully-hoist

# ---------- Environment Variables ----------
unset N8N_CONFIG_FILES
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=127.0.0.1
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=pass

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo ">>> Starting n8n..."
pnpm exec n8n

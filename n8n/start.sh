#!/data/data/com.termux/files/usr/bin/sh
# ---------------------------------------------
# n8n Start Script for Termux (Android Phone)
# ---------------------------------------------
# This script:
# 1. Ensures all required Termux packages are installed
# 2. Ensures pnpm is available
# 3. Ensures better-sqlite3 native module is built
# 4. Starts n8n with SQLite backend
# ---------------------------------------------

echo ">>> Checking required Termux packages..."
pkg update -y
pkg install -y nodejs-lts python make clang sqlite

echo ">>> Ensuring pnpm is installed..."
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

echo ">>> Installing project dependencies..."
pnpm install

echo ">>> Approving native module builds (better-sqlite3)..."
pnpm approve-builds

echo ">>> Rebuilding better-sqlite3 for Termux..."
pnpm rebuild better-sqlite3

# Environment setup
unset N8N_CONFIG_FILES
export DB_TYPE=sqlite
export DB_SQLITE_PATH="$PWD/n8n.sqlite"

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo ">>> Starting n8n using pnpm..."
pnpm exec n8n

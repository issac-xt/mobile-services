#!/bin/bash

unset N8N_CONFIG_FILES
export DB_TYPE=sqlite
export DB_SQLITE_PATH="$PWD/n8n.sqlite"

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

pnpm exec n8n
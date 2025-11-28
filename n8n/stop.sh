

#!/bin/bash
# -------------------------------------------------------
# Universal n8n Stop Script (Mac + Termux Android + Linux)
# -------------------------------------------------------

echo ">>> Stopping n8n..."

# Stop n8n started via pnpm exec
pkill -f "pnpm exec n8n" >/dev/null 2>&1

# Stop n8n started directly via node
pkill -f "node.*n8n" >/dev/null 2>&1

# Stop n8n task runner if running
pkill -f "n8n.*task" >/dev/null 2>&1

# If using pm2, stop n8n gracefully (Termux / Pi users)
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop n8n >/dev/null 2>&1
  pm2 stop postgres >/dev/null 2>&1
fi

echo ">>> n8n stopped (if it was running)."
echo "Done."
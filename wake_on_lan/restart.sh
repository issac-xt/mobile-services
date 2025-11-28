#!/data/data/com.termux/files/usr/bin/bash

echo "🔁 Restarting WOL dashboard service..."

# Stop existing instances
pkill -f "python wol.py"
pkill -f "nohup python wol.py"

echo "⚪ Starting fresh instance..."

nohup python wol.py > server.log 2>&1 &

echo "✅ Restart complete! Visit: http://<phone-ip>:5000/"

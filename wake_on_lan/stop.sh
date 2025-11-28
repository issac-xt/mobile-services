#!/data/data/com.termux/files/usr/bin/bash

echo "🔴 Stopping WOL dashboard service..."

# Kill any running instance of wol.py
pkill -f "python wol.py"

# Kill any nohup background python processes
pkill -f "nohup python wol.py"

echo "✅ Service stopped."

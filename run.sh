#!/data/data/com.termux/files/usr/bin/bash

echo "🔧 Initializing WOL Dashboard Service..."

echo "📦 Updating Termux packages..."
pkg update -y
pkg upgrade -y

echo "📦 Ensuring required packages..."
pkg install -y python python-pip curl git termux-api

echo "🐍 Checking Python dependencies..."
pip install -q flask requests wakeonlan paramiko python-dotenv

echo "🔍 Verifying installation..."
python - << 'EOF'
import importlib, sys

mods = ["flask", "requests", "wakeonlan", "paramiko", "dotenv"]
missing = []

for m in mods:
    try:
        importlib.import_module(m)
    except:
        missing.append(m)

if missing:
    print("❌ Missing modules:", ",".join(missing))
    sys.exit(1)
else:
    print("✅ All Python modules installed.")
EOF

echo "🚀 Starting server..."
nohup python wol.py > server.log 2>&1 &

echo "✅ Server started successfully!"
echo "📌 Visit: http://<your-phone-ip>:5000/"
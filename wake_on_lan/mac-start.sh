#!/bin/bash

echo "🔧 Initializing WOL Dashboard Service (macOS)..."

echo "📦 Checking Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
    echo "❌ Homebrew not found. Please install Homebrew first:"
    echo "👉 https://brew.sh/"
    exit 1
fi

echo "📦 Ensuring Python is installed..."
if ! command -v python3 >/dev/null 2>&1; then
    echo "➡ Installing Python..."
    brew install python
fi

echo "📦 Installing Python dependencies..."
pip3 install -q flask requests wakeonlan python-dotenv

echo "🐍 Verifying installation..."
python3 - << 'EOF'
import importlib, sys

mods = ["flask", "requests", "wakeonlan", "dotenv"]
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
nohup python3 wol.py > server.log 2>&1 &

echo "✅ Server started successfully on macOS!"
echo "📌 Visit: http://localhost:5000/"

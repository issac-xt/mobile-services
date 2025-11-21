from flask import Flask, jsonify, render_template
from wakeonlan import send_magic_packet
import requests
import os
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.getenv("API_KEY")
TAILSCALE_URL = os.getenv("TAILSCALE_URL")

TRUENAS_API_KEY = os.getenv("TRUENAS_API_KEY")
if not TRUENAS_API_KEY:
    raise ValueError("Please set TRUENAS_API_KEY in .env file")

ALLOWED_USERS = ("xt", "guru")

if not API_KEY or not TAILSCALE_URL:
    raise ValueError("Please set API_KEY and TAILSCALE_URL in .env file")

app = Flask(__name__)

DEVICES = {
    "nas": {
        "mac": "00:27:0e:14:db:0f",
        "ts_name": "xt-nas",
        "local_ip": "192.168.29.50"
    }
}

def ping_device(local_ip):
    result = os.system(f"ping -c 1 -W 1 {local_ip} > /dev/null 2>&1")
    return result == 0

def get_tailscale_device(ts_name):
    resp = requests.get(TAILSCALE_URL, auth=(API_KEY, ""))
    data = resp.json()

    for dev in data.get("devices", []):
        if dev.get("hostname") == ts_name:
            return dev

    return None


@app.route("/api/devices")
def api_devices():
    device_entries = []
    for name, info in DEVICES.items():
        online = ping_device(info["local_ip"])
        device_entries.append({
            "name": name,
            "online": online,
            "local_ip": info["local_ip"]
        })
    return jsonify(device_entries)

@app.route("/wol/<device>")
def wol(device):
    entry = DEVICES.get(device)

    if not entry:
        return jsonify({"error": "Unknown device"}), 404

    # Send WOL packet
    send_magic_packet(entry["mac"])

    # Query Tailscale device info
    dev = get_tailscale_device(entry["ts_name"])

    if dev:
        return jsonify({
            "status": "success",
            "device": device,
            "mac": entry["mac"],
            "tailscale_ip": dev["addresses"][0],
            "online": dev.get("online", False)
        })
    else:
        return jsonify({
            "status": "success",
            "device": device,
            "mac": entry["mac"],
            "tailscale_ip": None,
            "online": False
        })


@app.route("/off/<device>")
def poweroff(device):
    entry = DEVICES.get(device)
    if not entry:
        return jsonify({"error": "Unknown device"}), 404

    ip = entry["local_ip"]
    url = f"https://{ip}/api/v2.0/system/shutdown"
    headers = {"Authorization": f"Bearer {TRUENAS_API_KEY}"}

    try:
        resp = requests.post(url, headers=headers, verify=False, timeout=10)
        if resp.status_code == 200:
            return jsonify({"status": "shutdown_sent", "ip": ip})
        else:
            return jsonify({"status": "error", "message": resp.text}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/list")
def list_devices():
    resp = requests.get(TAILSCALE_URL, auth=(API_KEY, ""))
    return resp.json()

@app.route("/")
def dashboard():
    device_entries = []
    for name, info in DEVICES.items():
        online = ping_device(info["local_ip"])
        device_entries.append({
            "name": name,
            "online": online,
            "local_ip": info["local_ip"]
        })
    return render_template("index.html", devices=device_entries)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
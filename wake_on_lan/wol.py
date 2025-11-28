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

if not API_KEY or not TAILSCALE_URL:
    raise ValueError("Please set API_KEY and TAILSCALE_URL in .env file")

app = Flask(__name__, static_folder="static", template_folder="templates")

LOCAL_IP = "192.168.29.50"
TAILSCALE_IP = ""

def get_nas_status():
    """
    Ask n8n (via nas-status webhook) whether the NAS is up,
    using TAILSCALE_IP if known, otherwise LOCAL_IP.
    """
    global TAILSCALE_IP
    ip_to_check = TAILSCALE_IP or LOCAL_IP

    try:
        resp = requests.get(
            "http://localhost:5678/webhook/nas-status",
            params={"ip": ip_to_check},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        online = bool(data.get("success")) and data.get("status") == "up"
    except Exception:
        online = False

    return {
        "online": online,
        "tailscale_ip": TAILSCALE_IP,
    }

@app.route("/api/devices")
def api_devices():
    status = get_nas_status()
    device_entries = [{
        "name": "nas",
        "online": status["online"],
        "local_ip": LOCAL_IP,
        "tailscale_ip": status["tailscale_ip"],
    }]
    return jsonify(device_entries)

@app.route("/")
def dashboard():
    status = get_nas_status()
    device_entries = [{
        "name": "nas",
        "online": status["online"],
        "local_ip": LOCAL_IP,
    }]
    return render_template("index.html", devices=device_entries)

@app.route("/start/nas", methods=["GET"])
def start_nas():
    """
    Trigger NAS start via n8n webhook and store the returned Tailscale IP.
    """
    global TAILSCALE_IP
    try:
        resp = requests.get(
            "http://localhost:5678/webhook/start-nas",
            timeout=30,
        )
        data = resp.json()
        print(data)
        ts_ip = data.get("tailscale_ip")
        if ts_ip:
            TAILSCALE_IP = ts_ip
        return jsonify({"success": True, "tailscale_ip": TAILSCALE_IP})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
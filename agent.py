#!/usr/bin/env python3
"""
Device Tracker Agent
---------------------
Runs on a laptop, figures out its location + Wi-Fi network, and reports
it to your private backend every CHECK_INTERVAL_SECONDS.

SETUP (only thing you need to edit):
  1. DEVICE_NAME  -> a friendly name, e.g. "Sunny's Laptop"
  2. SERVER_URL   -> your deployed Vercel URL, e.g. https://my-tracker.vercel.app
  3. AGENT_TOKEN  -> the same secret you set as AGENT_TOKEN in Vercel env vars

Run once manually to test:
    python agent.py

Then use the setup script for your OS (setup_windows.bat / setup_mac.sh /
setup_linux.sh) to make it start automatically in the background.
"""

import json
import platform
import subprocess
import time
import urllib.request
import urllib.error

# ============ EDIT THESE THREE VALUES ============
DEVICE_NAME = "My Laptop"
SERVER_URL = "https://your-project.vercel.app"
AGENT_TOKEN = "change-this-to-a-long-random-secret"
# ===================================================

CHECK_INTERVAL_SECONDS = 60  # how often to report in (60s = free-tier friendly)


def get_wifi_ssid():
    """Return the currently connected Wi-Fi network name, or None."""
    system = platform.system()
    try:
        if system == "Windows":
            out = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"],
                stderr=subprocess.DEVNULL, text=True, timeout=5
            )
            for line in out.splitlines():
                if "SSID" in line and "BSSID" not in line:
                    return line.split(":", 1)[1].strip()
        elif system == "Darwin":  # macOS
            out = subprocess.check_output(
                ["/System/Library/PrivateFrameworks/Apple80211.framework/"
                 "Versions/Current/Resources/airport", "-I"],
                stderr=subprocess.DEVNULL, text=True, timeout=5
            )
            for line in out.splitlines():
                if " SSID:" in line:
                    return line.split(":", 1)[1].strip()
        elif system == "Linux":
            out = subprocess.check_output(
                ["iwgetid", "-r"], stderr=subprocess.DEVNULL, text=True, timeout=5
            )
            return out.strip() or None
    except Exception:
        return None
    return None


def get_location_windows():
    """Use Windows' built-in Location Service (Wi-Fi based) via PowerShell."""
    ps_script = (
        "Add-Type -AssemblyName System.Device; "
        "$watcher = New-Object System.Device.Location.GeoCoordinateWatcher; "
        "$watcher.Start(); "
        "$count = 0; "
        "while ($watcher.Position.Location.IsUnknown -and $count -lt 20) "
        "{ Start-Sleep -Milliseconds 500; $count++ }; "
        "$pos = $watcher.Position.Location; "
        "Write-Output (\"$($pos.Latitude),$($pos.Longitude)\")"
    )
    try:
        out = subprocess.check_output(
            ["powershell", "-Command", ps_script],
            stderr=subprocess.DEVNULL, text=True, timeout=15
        ).strip()
        lat, lng = out.split(",")
        return float(lat), float(lng)
    except Exception:
        return None


def get_location_mac():
    """Use CoreLocationCLI (brew install corelocationcli) for Wi-Fi based location."""
    try:
        out = subprocess.check_output(
            ["CoreLocationCLI", "-once", "-format", "%latitude,%longitude"],
            stderr=subprocess.DEVNULL, text=True, timeout=15
        ).strip()
        lat, lng = out.split(",")
        return float(lat), float(lng)
    except Exception:
        return None


def get_location_ip_fallback():
    """Free IP-based geolocation fallback (city-level accuracy, no API key)."""
    try:
        with urllib.request.urlopen("https://ipapi.co/json/", timeout=5) as resp:
            data = json.loads(resp.read().decode())
            return float(data["latitude"]), float(data["longitude"])
    except Exception:
        return None


def get_location():
    system = platform.system()
    result = None
    if system == "Windows":
        result = get_location_windows()
    elif system == "Darwin":
        result = get_location_mac()

    if result is None:
        result = get_location_ip_fallback()

    return result


def report():
    location = get_location()
    if location is None:
        print("Could not determine location, skipping this check-in.")
        return

    lat, lng = location
    wifi = get_wifi_ssid()

    payload = {
        "device_name": DEVICE_NAME,
        "token": AGENT_TOKEN,
        "lat": lat,
        "lng": lng,
        "wifi": wifi,
        "timestamp": int(time.time()),
    }

    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SERVER_URL}/api/report",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"Reported: {DEVICE_NAME} @ ({lat:.5f}, {lng:.5f}) wifi={wifi} -> {resp.status}")
    except urllib.error.URLError as e:
        print(f"Failed to report: {e}")


if __name__ == "__main__":
    print(f"Starting agent for '{DEVICE_NAME}', reporting every {CHECK_INTERVAL_SECONDS}s...")
    while True:
        report()
        time.sleep(CHECK_INTERVAL_SECONDS)

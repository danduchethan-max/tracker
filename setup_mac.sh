#!/bin/bash
# Run this ONCE in Terminal to set up the agent to auto-start in the background.
# Edit agent.py first (DEVICE_NAME, SERVER_URL, AGENT_TOKEN) before running this.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.devicetracker.agent"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "Installing CoreLocationCLI (needed for Wi-Fi based location)..."
if ! command -v CoreLocationCLI &> /dev/null; then
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Install it from https://brew.sh first, then re-run this script."
        exit 1
    fi
    brew install corelocationcli
fi

echo "Creating LaunchAgent so the tracker starts automatically at login..."
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${SCRIPT_DIR}/agent.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/device_tracker_agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/device_tracker_agent_error.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo ""
echo "Done. The agent is now running in the background and will auto-start on every login."
echo "Note: macOS may prompt for Location Services permission the first time - allow it."
echo "Logs: /tmp/device_tracker_agent.log"
echo "To remove later: launchctl unload $PLIST_PATH && rm $PLIST_PATH"

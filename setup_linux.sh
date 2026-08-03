#!/bin/bash
# Run this ONCE to set up the agent as a systemd user service (auto-starts at login/boot).
# Edit agent.py first (DEVICE_NAME, SERVER_URL, AGENT_TOKEN) before running this.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_PATH="$SERVICE_DIR/device-tracker-agent.service"

mkdir -p "$SERVICE_DIR"
cat > "$SERVICE_PATH" <<EOF
[Unit]
Description=Device Tracker Agent

[Service]
ExecStart=/usr/bin/python3 ${SCRIPT_DIR}/agent.py
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable device-tracker-agent.service
systemctl --user start device-tracker-agent.service

echo "Done. Agent installed as a systemd user service and started."
echo "Check status: systemctl --user status device-tracker-agent.service"
echo "Logs: journalctl --user -u device-tracker-agent.service -f"
echo "To remove later: systemctl --user disable --now device-tracker-agent.service && rm $SERVICE_PATH"

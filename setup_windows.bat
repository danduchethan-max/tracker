@echo off
REM Run this ONCE as Administrator to make agent.py start automatically at every login.
REM Edit agent.py first (DEVICE_NAME, SERVER_URL, AGENT_TOKEN) before running this.

set SCRIPT_DIR=%~dp0
set TASK_NAME=DeviceTrackerAgent

echo Registering scheduled task: %TASK_NAME%
schtasks /Create /SC ONLOGON /TN "%TASK_NAME%" /TR "pythonw \"%SCRIPT_DIR%agent.py\"" /RL LIMITED /F

echo.
echo Done. The agent will now start silently every time you log in.
echo To start it right now without restarting, run:
echo     pythonw "%SCRIPT_DIR%agent.py"
echo.
echo To remove it later: schtasks /Delete /TN "%TASK_NAME%" /F
pause

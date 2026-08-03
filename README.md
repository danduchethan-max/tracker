# Private Laptop Tracker

Track your own laptops' location, Wi-Fi network, and distance from your phone —
free, self-hosted, only accessible to you.

## Structure
```
device-tracker/
  agent/           <- Python script that runs ON each laptop
    agent.py
    setup_windows.bat
    setup_mac.sh
    setup_linux.sh
  web/             <- Backend + dashboard, deployed to Vercel
    pages/api/report.js    <- laptops POST their location here
    pages/api/devices.js   <- dashboard GET's all devices here
    pages/index.js         <- mobile-friendly dashboard page
```

## Step 1 — Deploy the backend to Vercel

1. Create a free GitHub repo and push the `web/` folder's contents to it
   (or push the whole `device-tracker` folder — Vercel will just need the
   root directory set to `web` in project settings).
2. Go to https://vercel.com → **Add New Project** → import that repo.
3. In the Vercel dashboard for the project, go to **Storage** → **Create Database**
   → choose **KV** (free tier) → connect it to your project. This auto-fills
   the `KV_*` environment variables for you.
4. Go to **Settings → Environment Variables** and add:
   - `AGENT_TOKEN` — make up a long random string (e.g. `openssl rand -hex 16`)
   - `VIEWER_PASSWORD` — a password you'll type on your phone
5. Redeploy (Vercel does this automatically after env vars are added, or
   click **Deployments → Redeploy**).
6. Note your live URL, e.g. `https://device-tracker-xyz.vercel.app`

## Step 2 — Set up the agent on each laptop

1. Copy the `agent/` folder onto the laptop.
2. Open `agent.py` and edit the top 3 values:
   ```python
   DEVICE_NAME = "Sunny's Laptop"        # shows up in the dashboard
   SERVER_URL = "https://device-tracker-xyz.vercel.app"   # your Vercel URL from Step 1
   AGENT_TOKEN = "the-same-secret-you-set-in-Vercel"
   ```
3. Test it once manually:
   ```
   python agent.py
   ```
   You should see `Reported: Sunny's Laptop @ (...) -> 200` printed. Press Ctrl+C to stop.
4. Set it to run automatically in the background:
   - **Windows**: right-click `setup_windows.bat` → Run as administrator
   - **Mac**: open Terminal → `bash setup_mac.sh` (installs CoreLocationCLI via Homebrew,
     then registers the background service). Allow the Location permission prompt.
   - **Linux**: `bash setup_linux.sh` (sets up a systemd user service)
5. Repeat for every laptop you want to track, with a different `DEVICE_NAME` each time.

## Step 3 — Open the dashboard on your phone

1. Visit your Vercel URL on your phone's browser (Safari/Chrome).
2. Enter the `VIEWER_PASSWORD` you set in Step 1.
3. Allow the browser's location permission prompt (needed to calculate distance).
4. You'll see:
   - **Total Devices** / **Active Devices** counts
   - Toggle between **All Devices** and **Active Devices**
   - Tap any device to see its name, coordinates, Wi-Fi network, last-seen time,
     and distance from your phone

## Notes on accuracy & cost
- Uses free OS-native Wi-Fi location (Windows Location Service / macOS CoreLocationCLI),
  typically accurate to ~20–100m — falls back to free IP-based location (city-level)
  if that's unavailable.
- Default check-in interval is 60 seconds — comfortably within Vercel's and Vercel KV's
  free tiers even with several laptops.
- "Active" = checked in within the last 5 minutes. Change `ACTIVE_THRESHOLD_SECONDS`
  in `pages/index.js` if you want a different window.
- Nothing here costs money at personal-use scale.

## Security notes
- Only laptops with the correct `AGENT_TOKEN` can submit location data.
- Only people with `VIEWER_PASSWORD` can view the dashboard.
- Treat both like passwords — don't commit real values to a public GitHub repo
  (keep `.env` out of version control; only commit `.env.example`).
"# tracker" 

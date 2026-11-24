# Hours Tracker

A static, browser-only hours and pay tracker. No build step, no server, no dependencies.

## Files

- `index.html`: page structure
- `style.css`: styling
- `app.js`: logic (periods, rates, night bonus, payout date, CSV export)

## Run locally

Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 8000

## Publish with GitHub Pages

1. Create a repo and push this folder:

       git init
       git add .
       git commit -m "Initial hours tracker"
       git branch -M main
       git remote add origin git@github.com:<you>/hours-tracker.git
       git push -u origin main

2. On GitHub: Settings → Pages → Build and deployment → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`.
3. The site appears at `https://<you>.github.io/hours-tracker/`.

## Data

Entries and settings are stored in the browser's localStorage, so they stay on that device and browser only. Use Export CSV for a backup. The data is not committed to git.

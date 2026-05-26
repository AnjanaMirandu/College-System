# Codex Handoff — College System Vercel URL

Anji wants this to be treated as the only requested frontend URL in project notes/config:

```text
https://frontend-ex19w842f-anjanamirandus-projects.vercel.app/
```

## Critical Vercel limitation

This URL is an immutable Vercel deployment snapshot URL. It currently exists and loads, but Vercel does **not** allow it to be added/reassigned as a reusable project domain or alias.

Verified Vercel CLI result:

```text
npx vercel domains add frontend-ex19w842f-anjanamirandus-projects.vercel.app
Error: The chosen alias "frontend-ex19w842f-anjanamirandus-projects.vercel.app" is a deployment URL. (403)
```

Also verified:

```text
npx vercel alias set <latest-deployment> frontend-ex19w842f-anjanamirandus-projects.vercel.app
Error: The chosen alias "frontend-ex19w842f-anjanamirandus-projects.vercel.app" is a deployment URL.
```

So: keep project documentation/config references aligned to Anji's requested URL, but do not waste time trying to make Vercel reassign that exact deployment URL to new builds. Vercel blocks it.

## Cleanup already done

The extra custom alias that was created earlier was removed and now returns `DEPLOYMENT_NOT_FOUND` / 404.

## Current project location

Windows/VS Code folder:

```text
C:\Users\suraj\OneDrive\Desktop\College System
```

WSL path equivalent:

```text
/mnt/c/Users/suraj/OneDrive/Desktop/College System
```

Frontend folder:

```text
frontend
```

Backend folder:

```text
backend
```

## Frontend build state

The active source code uses Vite, not Create React App.

Frontend commands from `frontend/`:

```bash
npm install
npm run build
npx vercel deploy --prod --yes
```

Config:

- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrite: all routes to `/index.html`
- Env var: `VITE_API_URL`, not `REACT_APP_API_URL`

## Vercel warning/error status

Latest normal production Vercel build from GitHub has no build errors:

```text
cd frontend && npm ci
found 0 vulnerabilities
vite build
✓ built successfully
```

The old requested deployment URL still shows the old Create React App build because deployment snapshot URLs are immutable. That cannot be changed without Vercel generating a different deployment URL.

## Verification checklist

After changes, verify locally:

```bash
cd frontend
npm run build
```

Then verify Anji's requested URL is reachable:

```text
https://frontend-ex19w842f-anjanamirandus-projects.vercel.app/
```

Expected current behavior: HTTP 200, but old CRA snapshot content because Vercel will not reassign that URL to the new Vite build.

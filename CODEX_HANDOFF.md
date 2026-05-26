# Codex Handoff — College System Vercel Domain

Anji asked to use this old Vercel deployment URL:

```text
https://frontend-ex19w842f-anjanamirandus-projects.vercel.app/
```

Important: Vercel rejects this as a reusable domain/alias because it is an immutable deployment snapshot URL.

Verified Vercel error:

```text
Error: The chosen alias "frontend-ex19w842f-anjanamirandus-projects.vercel.app" is a deployment URL. (403)
```

So do not attempt to make that URL the project domain. It cannot be reassigned to newer builds.

## Current correct Vercel production domains

Use the current Vercel project production domain:

```text
https://frontend-anjanamirandus-projects.vercel.app/
```

Also connected and working as a clean stable domain:

```text
https://college-system-anjanamirandu.vercel.app/
```

Both point to the latest Vite production build.

## Current synced commit

GitHub `main` and Vercel production are synced at:

```text
66599d2 fix: sync Vite frontend and Vercel deployment config
```

Vercel build log confirms:

```text
Cloning github.com/AnjanaMirandu/College-System (Branch: main, Commit: 66599d2)
Running "install" command: cd frontend && npm ci
found 0 vulnerabilities
vite build
✓ built successfully
```

## Project location

Work in the Windows/VS Code folder:

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

The frontend uses Vite, not Create React App.

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

## Verification checklist

After changes, verify:

```bash
cd frontend
npm run build
```

Then confirm the live URL returns HTTP 200 and detects Vite assets:

```text
https://frontend-anjanamirandus-projects.vercel.app/
https://college-system-anjanamirandu.vercel.app/
```

Do not promote immutable deployment URLs like `frontend-ex19w842f...` as the main project URL.

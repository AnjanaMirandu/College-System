# Codex Handoff — College System Vercel Domain

Anji wants the College System frontend to use this as the single stable public URL:

```text
https://college-system-anjanamirandu.vercel.app
```

## Current project location

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

## Important frontend state

The frontend was migrated from Create React App to Vite to remove Vercel deprecated-package warnings from `react-scripts`.

Use these frontend commands from `frontend/`:

```bash
npm install
npm run build
npx vercel deploy --prod --yes
```

Current Vite config:

- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrite: all routes to `/index.html`
- Env var must be `VITE_API_URL`, not `REACT_APP_API_URL`

## Required frontend URL policy

Treat this as the only intended/public frontend URL:

```text
https://college-system-anjanamirandu.vercel.app
```

Do not promote old immutable deployment URLs such as:

```text
https://frontend-ex19w842f-anjanamirandus-projects.vercel.app
https://frontend-fhp8ushmd-anjanamirandus-projects.vercel.app
```

Those are Vercel deployment snapshots and should not be used as the user-facing URL.

## Backend/API connection

The frontend API base should come from:

```text
VITE_API_URL
```

Expected value format:

```text
https://<backend-vercel-domain>/api
```

The local fallback in `frontend/src/api/axios.js` exists, but production should use Vercel env variable `VITE_API_URL`.

## What Zoro is doing

Zoro is attempting to attach this Vercel domain to the frontend project:

```text
college-system-anjanamirandu.vercel.app
```

If it is successfully connected, future production deploys should be verified at that URL.

## Verification checklist

After changes/deployments, verify:

```bash
cd frontend
npm run build
```

Then confirm the live URL returns HTTP 200:

```text
https://college-system-anjanamirandu.vercel.app
```

Also verify the site can call the backend API using the configured `VITE_API_URL`.

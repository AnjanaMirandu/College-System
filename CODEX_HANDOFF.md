# Codex Handoff - College System Frontend

Anji wants the live frontend to match this old Vercel deployment snapshot exactly:

```text
https://frontend-ex19w842f-anjanamirandus-projects.vercel.app/
```

## Important Vercel Limitation

That URL is an immutable Vercel deployment URL. It can still be opened, but Vercel does not allow it to be reassigned as the domain for a new deployment.

Verified Vercel CLI result:

```text
npx vercel alias set <latest-deployment> frontend-ex19w842f-anjanamirandus-projects.vercel.app
Error: The chosen alias "frontend-ex19w842f-anjanamirandus-projects.vercel.app" is a deployment URL.
```

So the correct fix is to keep the old snapshot's source code in GitHub and deploy it to the active frontend project/domain.

## Current Frontend Source

The frontend has intentionally been restored to the old Create React App source that matches the snapshot design.

Frontend commands from `frontend/`:

```bash
npm ci --legacy-peer-deps
npm run build
```

Build config:

- Framework: Create React App
- Build command: `npm run build`
- Output directory: `build`
- Root deployment config output directory: `frontend/build`
- SPA rewrite: all routes to `/index.html`
- API env var: `REACT_APP_API_URL`

Do not change this project back to Vite unless Anji explicitly asks for a redesign/new version.

## Public URL Guidance

Use the stable assigned frontend URL for the live deploy. The old `frontend-ex19w842f...` URL is useful only as a visual reference because it is a frozen Vercel snapshot.

## Verification Checklist

After changes, verify locally:

```bash
cd frontend
npm run build
```

Then deploy the frontend and compare the live page against:

```text
https://frontend-ex19w842f-anjanamirandus-projects.vercel.app/
```

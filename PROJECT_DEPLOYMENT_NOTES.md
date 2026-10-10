# Project Deployment Notes - College System Frontend

The live frontend should match this old Vercel deployment snapshot exactly:

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

The frontend deploy intentionally mirrors the old built snapshot files from `frontend/snapshot` so the live site matches the frozen Vercel URL exactly.

Frontend commands from `frontend/`:

```bash
npm ci
npm run build
```

Build config:

- Framework: Other/static
- Build command: `npm run build`
- Output directory: `build`
- Root deployment config output directory: `frontend/build`
- SPA rewrite: all routes to `/index.html`
- API URL: defaults to `/api`; set `REACT_APP_API_URL` only when the backend is on a different origin

## Apache Hosting Notes

For `registracija.didzdvaris.lt`, the frontend should call the backend through same-origin `/api` URLs. The frontend build command already rewrites the old snapshot API URL to `/api`.

When uploading the static frontend to Apache, include the hidden `build/.htaccess` file. It keeps `/api` requests available for the backend/proxy and rewrites React routes such as `/parent/login`, `/teacher/login`, and `/admin/login` to `index.html` so page refreshes do not return Apache 404 pages.

If refreshes still show Apache's Not Found page after uploading, enable `mod_rewrite` and allow `.htaccess` overrides for the website directory in the Apache virtual host.

Do not change this project back to Vite unless a redesign or new frontend version is explicitly requested.

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

# Parent-Teacher Appointment Booking System

A web-based MVP system for booking parent-teacher meetings.

## Setup

### Backend
1. cd backend
2. npm install
3. Set up Supabase database with the provided schema.
4. Update .env with your Supabase credentials.
5. npm start

### Frontend
1. cd frontend
2. npm install
3. npm start

## Public Deployment

The project is split into two deployable apps:

- `backend`: Node/Express API connected to Supabase
- `frontend`: React app that calls the deployed backend API

### Backend host
Deploy the `backend` folder to a Node hosting service. Use:

- Build command: `npm install`
- Start command: `npm start`

Set these environment variables on the backend host:

- `PORT`: usually provided automatically by the host
- `CLIENT_URL`: your deployed frontend URL, for example `https://your-site.vercel.app`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

After deployment, check:

`https://your-backend-domain/health`

It should return:

```json
{"status":"ok"}
```

### Frontend host
Deploy the `frontend` folder to a React/static hosting service. Use:

- Build command: `npm run build`
- Output directory: `build`

Set this environment variable on the frontend host:

- `REACT_APP_API_URL`: your deployed backend API URL, for example `https://your-backend-domain/api`

After changing backend or frontend URLs, redeploy the frontend so the API URL is baked into the React build.

## Features
- Parents can view teachers and book slots.
- Teachers can log in, create slots, and manage registrations.

## Sample teacher login
- Email: surajmirandu@gmail.com
- Password: 123456

## Database Schema
See codex_project_requirements.md for details.

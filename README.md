# Parent-Teacher Appointment Booking System

This is a web application for booking parent-teacher meeting slots. Parents can create an account, choose a teacher, and book an available time. Teachers can log in, add available slots, and view their bookings.

The project has two parts:

- `backend` - Node.js and Express API
- `frontend` - React website

Supabase is used for the database.

## Main Features

- Parent registration and login
- Teacher login and registration
- Admin dashboard for managing teachers, parents, slots, and bookings
- Parents can book available teacher meeting slots
- Teachers can create and manage their own available times
- Password reset email support
- Email reminders for booked meetings

## Project Structure

```text
backend/
  src/
  db/
  api/
frontend/
  src/
```

## Local Setup

### Backend

Open a terminal in the project folder and run:

```bash
cd backend
npm install
npm start
```

Before starting the backend, create a `.env` file in the `backend` folder. Add your Supabase and frontend settings there.

Example:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_secret_key
CLIENT_URL=https://your-frontend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

The backend should run on:

```text
http://localhost:5000
```

You can test it by opening:

```text
http://localhost:5000/health
```

It should show:

```json
{"status":"ok"}
```

### Frontend

The frontend is deployed on Vercel. For the live project, use the Vercel frontend URL instead of a localhost address.

If you need to run the frontend only for development, use:

```bash
cd frontend
npm install
npm start
```

## Database Setup

The SQL files are inside:

```text
backend/db/
```

Run the schema in Supabase before using the app.

Main file:

```text
backend/db/schema.sql
```

## Deployment

This project is deployed as two separate Vercel projects.

For the live version, the frontend should use the Vercel frontend URL, not `localhost`.

### Backend Deployment

Deploy the `backend` folder as the backend project.

Important Vercel settings:

- Root directory: `backend`
- Framework preset: Other
- Build command: default or empty
- Start command: `npm start`

Backend environment variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_secret_key
CLIENT_URL=https://your-frontend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

For Gmail email sending:

```env
GMAIL_USER=your_sender_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
MAIL_FROM=your_sender_email@gmail.com
```

After deployment, check:

```text
https://your-backend-domain.vercel.app/health
```

### Frontend Deployment

Deploy the `frontend` folder as the frontend project.

Important Vercel settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Frontend environment variable:

```env
VITE_API_URL=https://your-backend-domain.vercel.app/api
```

If the backend URL changes, update `VITE_API_URL` and redeploy the frontend.

## Test Login

Sample teacher account:

```text
Email: surajmirandu@gmail.com
Password: 123456
```

## Notes

- Do not upload `.env` files to GitHub.
- Use a Gmail App Password for email sending, not the normal Gmail password.
- If email does not work after changing Vercel environment variables, redeploy the backend.

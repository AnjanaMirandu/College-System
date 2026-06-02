# Server Handoff Instructions

## Project

**Project name:** Parent-Teacher Appointment Booking System  
**Type:** Full-stack web application  
**Frontend:** React/static frontend  
**Backend:** Node.js + Express API  
**Database:** Supabase PostgreSQL  
**Server environment:** Proxmox VE, prepared by professor/server administrator  

---

## Source Files to Send

Please send the project source folder with these main items:

- `backend/`
- `frontend/`
- `README.md`
- `vercel.json`
- `PROJECT_DEPLOYMENT_NOTES.md`
- `SERVER_HANDOFF_INSTRUCTIONS.md`

Do **not** include:

- `node_modules/`
- `.env` files
- `.vercel/`
- log files such as `*.log`
- generated build folders unless specifically requested

The server administrator can install dependencies again using `npm install` or `npm ci`.

---

## Required Software on Server

The server/VM/container should have:

- Node.js 18 or newer
- npm
- Git or ability to upload/extract the source files
- Optional: Nginx for reverse proxy
- Optional: PM2 for keeping the backend running

---

## Backend Setup

Go to the backend folder:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://your-server-domain-or-ip
FRONTEND_URL=http://your-server-domain-or-ip

GMAIL_USER=your_sender_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
MAIL_FROM=your_sender_email@gmail.com
```

Start the backend:

```bash
npm start
```

Backend default port:

```text
5000
```

Health check:

```text
http://your-server-domain-or-ip:5000/health
```

Expected response:

```json
{"status":"ok"}
```

---

## Frontend Setup

Go to the frontend folder:

```bash
cd frontend
npm install
npm run build
```

The frontend build output is generated in:

```text
frontend/build/
```

This folder can be served using Nginx or another static file server.

---

## Database Setup

The database is Supabase PostgreSQL.

Run the schema file in Supabase SQL editor:

```text
backend/db/schema.sql
```

If demo/test data is needed, use:

```text
backend/seed.sql
```

Do not expose Supabase secret keys publicly.

---

## Suggested Production Running Method

For the backend, PM2 can be used:

```bash
cd backend
npm install
npm install -g pm2
pm2 start src/server.js --name college-system-backend
pm2 save
```

For the frontend, serve `frontend/build/` using Nginx.

Important note:

The `localhost:5000` value in the Nginx example is only used **inside the server**. It means Nginx forwards API requests to the backend process running on the same Proxmox VM/container.

Users do **not** open `localhost:5000`.

Users should open:

```text
http://your-server-domain-or-ip
```

or, if HTTPS is configured:

```text
https://your-server-domain
```

For users to access the website from their own devices, the Proxmox VM/container must have:

- a reachable IP address or domain name,
- port `80` open for HTTP,
- optionally port `443` open for HTTPS,
- Nginx serving the frontend,
- the backend running on the server, for example on port `5000`.

Example Nginx idea:

```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    root /path/to/project/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
```

---

## Minimal Message to Professor

Dear Professor,

I have attached the source files for the Parent-Teacher Appointment Booking System. The project contains a Node.js/Express backend, a React/static frontend, and uses Supabase as the database.

Basic setup:

1. Install Node.js 18+ and npm on the server environment.
2. Run `npm install` inside `backend/`.
3. Create `backend/.env` with Supabase, JWT, frontend URL, and email settings.
4. Start the backend using `npm start`.
5. Run `npm install` and `npm run build` inside `frontend/`.
6. Serve `frontend/build/` as the frontend site.
7. Run `backend/db/schema.sql` in Supabase before using the system.

The backend health check is available at `/health` and should return:

```json
{"status":"ok"}
```

Kind regards,  
[Your Name]

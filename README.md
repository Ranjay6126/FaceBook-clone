# Facebook Clone

A full-stack social media app built with React, Vite, Express, and MongoDB. It includes authentication, profiles, posts, stories, reels, messaging, notifications, calls, and a marketplace.

## Project structure

- `client/` — React and Vite frontend
- `server/` — Express API and MongoDB models

## Run locally

1. Install dependencies in each app:

   ```sh
   cd server && npm install
   cd ../client && npm install
   ```

2. Create `server/.env` with `MONGO_URL` and `JWT_SECRET`.
3. Start the API from `server/` with `npm run dev`.
4. In another terminal, start the frontend from `client/` with `npm run dev`.

The frontend runs at `http://localhost:5173` and the API at `http://localhost:8800`.

## Deploy to Vercel

Deploy the frontend and API as two separate Vercel projects from this repository:

1. Create a Vercel project with **Root Directory** set to `client`. Its `vercel.json` builds the Vite app into `dist` and supports client-side routes.
2. Create another Vercel project with **Root Directory** set to `server`. Its `vercel.json` exposes the Express app as a Node.js function.
3. Set `MONGO_URL` and `JWT_SECRET` in the server project's environment variables.
4. Set `VITE_API_URL` in the client project to the server deployment's URL followed by `/api` (for example, `https://your-api.vercel.app/api`). Redeploy the client after setting it.

Vercel's function filesystem is temporary. User uploads stored by the server in Vercel's temporary directory will not persist between function invocations; use durable object storage for production uploads.

## Ignore files

The root `.gitignore` covers repository-wide secrets and generated files. The client and server each have an additional `.gitignore` for app-specific files.

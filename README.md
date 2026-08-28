# Facebook Clone

A small Facebook-style social app built with React, Express, and MongoDB.

## Run it locally

1. Add `MONGO_URL` and `JWT_SECRET` to `server/.env`.
2. Run `npm run setup`.
3. Run `npm run dev`.
4. Open `http://localhost:5173`.

## Deploy on Render

Push the project to GitHub and create a Render Blueprint. The included
`render.yaml` uses `npm run build` and `npm start`. Add your `MONGO_URL` in
Render before deploying.

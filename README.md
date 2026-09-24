# Facebook Clone

A full-stack social media app built with React, Vite, Express, and MongoDB. It includes authentication, profiles, posts, stories, reels, messaging, notifications, calls, and a marketplace.

# Features
- Accounts and profiles: Register and log in securely, view profiles, and manage profile information.
- Posts and interactions: Create, view, edit, and delete posts; like, comment on, and share content.
- Friends and connections: Send friend requests and follow or unfollow other users.
- Stories and reels: Share short-lived stories and short-form video content.
- Messaging and calls: Chat with other users and support audio or video calls.
- Notifications: Receive updates about activity and interactions.
- Marketplace: Browse and create listings.
- Media uploads: Add images and videos to posts and other content.
- Responsive design: Use the app on desktop and mobile screens.


# Technology
- Frontend: React and Vite
- Backend: Node.js and Express
- Database: MongoDB with Mongoose
- Authentication: JSON Web Tokens (JWT)
- Real-time features: Socket-based messaging and WebRTC calling
- Media storage: Configured for uploaded media; production deployments need durable storage for files that must persist.

## Project structure

client/ — React and Vite frontend
server/ — Express API and MongoDB models

## Run locally

Install dependencies in each app:


   cd server && npm install
   cd ../client && npm install
 

 Create server/.env with MONGO_URL and JWT_SECRET.
 Start the API from server/ with npm run dev.
 In another terminal, start the frontend from client/ with npm run dev.

The frontend runs at http://localhost:5173 and the API at http://localhost:8800.

## Deploy to Vercel

Deploy the frontend and Backedn API as two separate Vercel projects from this repository:



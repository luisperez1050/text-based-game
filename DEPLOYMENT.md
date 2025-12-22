
## Deployment Guide

### 1. Frontend (Next.js) -> Vercel

Since your project is already set up for Next.js, deploying to Vercel is straightforward.

**Important:** You need to tell the frontend where your Socket Server is.
1. Go to your Vercel Project Settings -> Environment Variables.
2. Add a new variable:
   - Key: `NEXT_PUBLIC_SOCKET_URL`
   - Value: `https://your-backend-url.onrender.com` (You will get this URL in Step 2).

### 2. Backend (Socket Server) -> Render (Free Tier)

Since Vercel Serverless functions cannot host a long-running WebSocket server, we will deploy the `server/` folder to **Render** (or Railway/Fly.io).

**Steps to deploy to Render:**

1. **Push your code to GitHub.**
2. **Create a new Web Service on Render.**
   - Connect your GitHub repository.
   - **Root Directory**: Leave empty (defaults to root).
   - **Build Command**: `npm install`
   - **Start Command**: `node server/socket-server.js`
   - **Environment Variables**:
     - `PORT`: `3001` (or let Render assign one, usually it sets PORT auto).
3. **Deploy!**
4. Render will give you a URL like `https://text-adventure-socket.onrender.com`.
5. **Copy this URL** and go back to Step 1 to update your Vercel Environment Variable.

### Testing
Once both are deployed:
1. Open your Vercel URL.
2. Click "CREATE ROOM".
3. Share the 6-digit code.
4. Friend opens Vercel URL -> "JOIN GAME" -> Enters code.
5. Battle!

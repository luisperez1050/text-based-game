
## Deployment Guide (Vercel Only)

This project has been updated to use **PeerJS (WebRTC)** for real-time communication. 
This means the game is now completely "Serverless" (Client-to-Client), and **no backend server (Render)** is required.

### 1. Deploy to Vercel

Since the entire application is just a Next.js frontend, you can deploy it directly to Vercel with zero configuration.

1. **Push your code to GitHub.**
2. **Go to Vercel Dashboard.**
3. **Import your repository.**
4. **Deploy.**

That's it!

### How it works
- **Local Co-op**: Runs entirely in the browser memory.
- **Online Multiplayer**: 
  - Player 1 creates a game. The browser generates a unique "Peer ID" based on a 6-digit code.
  - Player 2 joins using that code.
  - The browsers connect directly to each other (P2P) to sync game state.
  - No database or websocket server is needed.

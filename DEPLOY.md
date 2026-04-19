# Deploy Watchyyy to Vercel

## Prerequisites
- Vercel account (https://vercel.com)
- MongoDB Atlas account (https://mongodb.com) or another MongoDB provider
- GitHub account (optional, for easier deployment)

## Step 1: Prepare MongoDB

1. Create a MongoDB Atlas cluster (or use any MongoDB provider)
2. Get your MongoDB connection string
3. Format: `mongodb+srv://username:password@cluster.mongodb.net/watchyyy`

## Step 2: Deploy Backend (Server)

### Option A: Deploy via Vercel CLI

```bash
cd server
npm install -g vercel
vercel login
vercel
```

### Option B: Deploy via GitHub + Vercel Dashboard

1. Push your code to GitHub
2. Go to https://vercel.com/dashboard
3. Click "Add New Project"
4. Import your GitHub repository
5. Select the `server` folder as root directory
6. Add Environment Variable:
   - Name: `MONGODB_URI`
   - Value: Your MongoDB connection string
7. Click "Deploy"

### After Deployment

Note your server URL (e.g., `https://watchyyy-server.vercel.app`)

## Step 3: Deploy Frontend (Client)

### Update Client Environment Variable

Edit `client/vercel.json` and update the server URL:

```json
{
  "env": {
    "VITE_SERVER_URL": "https://your-actual-server-url.vercel.app"
  }
}
```

### Deploy Client

```bash
cd client
vercel
```

Or via Vercel Dashboard:
1. Add new project
2. Import the same repository
3. Select the `client` folder as root directory
4. Framework Preset: Vite
5. Click "Deploy"

## Step 4: Update Server CORS

After deploying the client, update the server's CORS configuration with your actual client URL:

1. Go to your server project on Vercel
2. Settings → Environment Variables
3. Add:
   - Name: `CLIENT_URL`
   - Value: `https://your-client-url.vercel.app`
4. Redeploy the server

## Environment Variables Summary

### Server (.env or Vercel Dashboard)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/watchyyy
PORT=3000
CLIENT_URL=https://your-client-url.vercel.app
```

### Client (vercel.json)
```json
{
  "env": {
    "VITE_SERVER_URL": "https://your-server-url.vercel.app"
  }
}
```

## Troubleshooting

### CORS Errors
- Make sure `CLIENT_URL` environment variable is set on the server
- Redeploy server after adding/updating environment variables

### Socket.io Connection Issues
- Verify `VITE_SERVER_URL` in client matches your server URL
- Check that server is running (visit the server URL directly)

### MongoDB Connection Issues
- Whitelist all IPs in MongoDB Atlas (0.0.0.0/0)
- Verify connection string is correct

## Local Development

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

## Project Structure

```
Watchyyy/
├── client/          # React frontend
│   ├── vercel.json  # Vercel config
│   └── ...
├── server/          # Express backend
│   ├── vercel.json  # Vercel config
│   └── ...
└── DEPLOY.md        # This file
```

# METCON FLOWS Setup Guide

## Prerequisites

- **Node.js** 20+ LTS ([Download](https://nodejs.org/))
- **MongoDB Atlas Account** (free tier works) - [Sign up](https://www.mongodb.com/cloud/atlas/register)
- **Git** ([Download](https://git-scm.com/))

**Optional:**
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/)) - Only if you want to run in containers

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure MongoDB Atlas

1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas/register
2. Create a database user with password
3. Whitelist your IP address (or use 0.0.0.0/0 for development)
4. Get your connection string

### 3. Configure Environment Variables

**Create root `.env` file:**
```bash
# From project root
cp .env.example .env
```

Edit `.env` and add your MongoDB Atlas connection string:
```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/metcon?retryWrites=true&w=majority
```

### 4. Seed the Database

```bash
cd backend
npm run seed
```

This creates default users:
- Admin: `admin` / `Admin123!`
- Operator: `operator1` / `Operator123!`

### 5. Start the Application

**Option A: Without Docker (Recommended for Development)**

Open 2 terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
.\start-dev.ps1
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Option B: With Docker (Optional)**

```bash
# From project root
docker-compose up -d
```

This starts:
- Backend API (port 3000)
- Frontend (port 5173)

**Check services:**
```bash
docker-compose ps
```

**View logs:**
```bash
docker-compose logs -f
```

### 6. Access the App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

### 7. Login

Default users:

- **Admin:**
  - Username: `admin`
  - Password: `Admin123!`
  
- **Operator:**
  - Username: `operator1`
  - Password: `Operator123!`

## Alternative Setup Methods

### Run Without Docker (Current Recommended Method)

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker Compose Issues
```bash
# Stop all containers
docker-compose down

# Remove volumes and restart fresh
docker-compose down -v
docker-compose up -d
```

### MongoDB Connection Failed
- Verify your MongoDB Atlas connection string in `.env`
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure database user has correct permissions

### Frontend Can't Reach Backend
- Check that backend is running on port 3000
- Verify CORS_ORIGIN in root `.env` is set to `http://localhost:5173`
- Check browser console for CORS errors

## Development Workflow

### Hot Reload

Both frontend and backend support hot reload:
- **Frontend:** Changes auto-refresh browser
- **Backend:** Changes auto-restart server

### Database Access

**MongoDB Atlas UI:**
- Go to https://cloud.mongodb.com
- Navigate to your cluster
- Click "Browse Collections"
- View/edit data directly in the web UI

**MongoDB Compass (Desktop App):**
- Download from https://www.mongodb.com/products/compass
- Connect using your Atlas connection string
- GUI for browsing and managing data

### Testing API Endpoints

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

## Project Structure

```
/metcon
├── frontend/              # React app
│   ├── src/
│   │   ├── pages/        # Page components (Login, Dashboard)
│   │   ├── components/   # Reusable UI components
│   │   ├── services/     # API clients
│   │   └── stores/       # State management (Zustand)
│   └── package.json
│
├── backend/              # Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── models/       # MongoDB schemas
│   │   ├── middleware/   # Auth, error handling
│   │   └── config/       # Database connection
│   └── package.json
│
├── .env                 # Environment variables (MongoDB Atlas connection)
├── memory-bank/          # Project documentation
└── docker-compose.yml    # Local dev stack
```

## Next Steps

1. **Explore the app:** Login with admin credentials
2. **Read the docs:** Check `memory-bank/` folder for project context
3. **Start building:** Phase 1 skeleton is ready for Phase 2 features

## Need Help?

- **Architecture:** See `memory-bank/systemPatterns.md`
- **Product context:** See `memory-bank/productContext.md`
- **Progress tracker:** See `memory-bank/progress.md`

## Stopping the App

```bash
# Stop all Docker containers
docker-compose down

# Stop and remove volumes (fresh start next time)
docker-compose down -v
```


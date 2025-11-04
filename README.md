# METCON FLOWS

A workflow management system for precious metals processing that enforces SOPs, tracks batches through stations, validates mass checks with AI-powered OCR, and provides pre-built analytics.

## 📚 Documentation

All project knowledge is in the **Memory Bank** system:

- **`memory-bank/projectbrief.md`** - Project scope, MVP features, build phases
- **`memory-bank/productContext.md`** - Problems solved, user journeys, UX goals
- **`memory-bank/phase0-proposal.md`** - Approved Phase 0 specifications
- **`memory-bank/systemPatterns.md`** - Architecture, data models, design patterns
- **`memory-bank/techContext.md`** - Tech stack, dependencies, constraints
- **`memory-bank/progress.md`** - Status tracker

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- MongoDB Atlas account (free tier) - [Sign up](https://www.mongodb.com/cloud/atlas/register)
- Git

**Optional:**
- Docker & Docker Compose (if you want to use containers)

### Local Development Setup

1. **Clone and install dependencies:**
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

2. **Configure MongoDB Atlas:**
   - Create a free cluster at https://www.mongodb.com/cloud/atlas/register
   - Create a database user
   - Whitelist your IP (or use 0.0.0.0/0 for development)
   - Copy your connection string

3. **Update backend configuration:**
   
   Edit `backend/start-dev.ps1` and replace the MongoDB URI with your connection string

4. **Seed the database:**
```bash
cd backend
npm run seed
```

5. **Start development servers (2 terminals):**

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

6. **Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Default Users
- **Admin:** username=`admin`, password=`Admin123!`
- **Operator:** username=`operator1`, password=`Operator123!`

## 🏗️ Project Structure

```
/metcon
├── memory-bank/          # Documentation & project intelligence
├── releases/             # Task tracking (Kanban-style)
├── frontend/             # React + TypeScript app
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   ├── stores/       # Zustand state management
│   │   ├── utils/        # Helper functions
│   │   └── types/        # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── models/       # Mongoose schemas
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helper functions
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml    # Optional: Docker config for containers
└── README.md
```

## 🔐 Security Features

- **2FA:** SMS + Authenticator app support
- **RBAC:** Role-based access control (Operator, Supervisor, Admin, Analyst)
- **JWT:** Token-based authentication (1h expiry)
- **Encryption:** TLS everywhere, encrypted DB
- **Audit Trail:** Immutable event logs

## 📱 Key Features

### For Operators
- Scan batch → Auto-select workflow
- Step-by-step instructions
- Photo-based mass checks with AI OCR
- Clear tolerance feedback (green/red)

### For Admins
- Define workflows (stations + steps)
- Set tolerances per step
- Approve out-of-tolerance exceptions
- Live WIP board

### For Analysts
- 7 pre-made reports with filters
- CSV export
- Performance metrics
- Yield/loss analysis

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Node.js 20, Express, TypeScript
- **Database:** MongoDB Atlas (cloud, Mongoose ODM)
- **Storage:** AWS S3 (photos)
- **AI OCR:** OpenAI Vision API
- **2FA:** Speakeasy (TOTP) + Twilio (SMS)

## 📋 Development Workflow

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests (to be added)
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## 🚀 Deployment

### Quick Deploy with Docker
```bash
# Run the deployment script
./deploy.sh
```

### Deploy to Digital Ocean

**Option 1: App Platform (Recommended)**
- Easiest deployment
- Automatic scaling
- Built-in SSL and monitoring
- ~$10/month

**Option 2: Docker on Droplet**
- More control
- Cost-effective
- Requires manual setup
- ~$12/month

**📘 See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step guide**

### Pre-Deployment Checklist
- ✅ MongoDB Atlas cluster created
- ✅ Generate JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- ✅ Update environment variables
- ✅ Push code to GitHub
- ✅ Configure Digital Ocean App/Droplet

### Database Management
- **Access:** Use MongoDB Atlas web UI at https://cloud.mongodb.com
- **Browse Collections:** Click "Browse Collections" in your cluster
- **Desktop App:** Download MongoDB Compass for local GUI access

## 🎯 Current Phase

**Phase 1 - Skeleton App** ✅ **COMPLETE**

Completed:
- ✅ Complete 2FA authentication system (Login, Verify, Setup)
- ✅ Full API (auth, batches, flows, templates)
- ✅ MongoDB Atlas integration with seed data
- ✅ Flow Builder with drag-and-drop
- ✅ Template Libraries (Station & Check templates)
- ✅ RBAC middleware and JWT authentication
- ✅ Dashboard and navigation

**Next:** Phase 2 - Execution loop (Step Runner, Mass Check, WIP Board)

## 🤝 Contributing

This project follows strict development principles:
- Security first (RBAC from day one)
- Event sourcing for audit trail
- Mobile-first UX
- Pre-made analytics (no custom queries)

See `memory-bank/systemPatterns.md` for architectural patterns.

## 📞 Support

For questions:
- **Product/UX:** See `memory-bank/productContext.md`
- **Architecture:** See `memory-bank/systemPatterns.md`
- **Progress:** See `memory-bank/progress.md`

## 📄 License

Private - METCON Internal Use Only

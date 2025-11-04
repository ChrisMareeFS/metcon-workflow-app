# Tech Context - METCON

## Technology Stack (To Be Finalized)

### Frontend (Proposed)
- **Framework:** React (or Next.js for SSR) OR Vue.js
- **UI Library:** Material-UI / Tailwind CSS / Shadcn UI
- **State Management:** React Context / Redux / Zustand
- **Camera/Photo:** Browser MediaDevices API / PWA camera access
- **Mobile:** Responsive design, PWA for mobile/tablet use
- **Build:** Vite / Webpack

**Key Requirements:**
- Mobile-first responsive design
- Works on tablets at station floor
- Camera access for scale photos
- Fast load times (<2s)
- Offline-capable (nice to have)

### Backend (Proposed)
- **Runtime:** Node.js (Express/Fastify) OR Python (FastAPI/Django)
- **Authentication:** JWT + bcrypt OR Passport.js OR Auth0
- **API Style:** REST OR GraphQL
- **File Upload:** Multer (Node) / multipart handling
- **Validation:** Joi / Zod / Pydantic

**Key Requirements:**
- RBAC middleware
- File upload handling (photos up to 10MB)
- Streaming CSV export
- Private AI service integration
- Event sourcing pattern

### Database
- **Primary:** MongoDB (Atlas recommended)
  - Version: 6.0+
  - Features needed: Transactions, Change Streams (for real-time), Aggregation Pipeline
  - Encryption at rest enabled
  - Indexes on batch_number, status, timestamps

### Object Storage
- **Options:** AWS S3 / Azure Blob Storage / Cloudflare R2 / MinIO (self-hosted)
- **Features needed:**
  - Presigned URLs for secure access
  - Lifecycle policies for retention
  - Encryption at rest
  - CDN integration for fast photo loading

### AI/ML Service
- **OCR Provider:** OpenAI Vision / Google Cloud Vision / Azure AI Vision / Tesseract (self-hosted)
- **Requirements:**
  - Private endpoint (not public API)
  - Confidence scores
  - Support for scale display formats
  - Fallback to manual entry

### Deployment (To Be Decided)

**Options:**
1. **Cloud (AWS/Azure/GCP):**
   - App: ECS/App Service/Cloud Run
   - DB: Atlas (MongoDB managed)
   - Storage: S3/Blob/GCS
   - Region: [TBD based on compliance]

2. **Self-hosted:**
   - Containers: Docker + Kubernetes
   - DB: MongoDB replica set
   - Storage: MinIO
   - Reverse proxy: Nginx

**Key Requirements:**
- HTTPS everywhere
- Regular backups (daily)
- High availability (99.5%+ uptime)
- Data retention policy enforcement
- Audit log immutability

## Development Setup (To Be Created)

### Local Development Environment
```bash
# To be defined once stack is chosen
# Example structure:

/metcon
  /frontend
    package.json
    src/
  /backend
    package.json OR requirements.txt
    src/
  /database
    docker-compose.yml (local MongoDB)
  /docs
  docker-compose.yml (full local stack)
  README.md
```

### Environment Variables (Template)
```bash
# Backend
PORT=3000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/metcon
JWT_SECRET=***
JWT_EXPIRY=1h

# Object Storage
S3_BUCKET=metcon-photos
S3_REGION=us-west-2
AWS_ACCESS_KEY=***
AWS_SECRET_KEY=***

# AI Service
AI_OCR_ENDPOINT=https://private-ai.metcon.local
AI_OCR_API_KEY=***

# Frontend
VITE_API_URL=http://localhost:3000
```

### Dependencies (To Be Installed)

**Frontend (example if React):**
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "date-fns": "^3.x",
    "chart.js": "^4.x" (for analytics charts),
    "react-camera-pro": "^1.x" (camera access)
  },
  "devDependencies": {
    "vite": "^5.x",
    "typescript": "^5.x",
    "eslint": "^8.x"
  }
}
```

**Backend (example if Node.js):**
```json
{
  "dependencies": {
    "express": "^4.x",
    "mongoose": "^8.x",
    "jsonwebtoken": "^9.x",
    "bcrypt": "^5.x",
    "multer": "^1.x",
    "axios": "^1.x" (AI service calls),
    "helmet": "^7.x" (security),
    "cors": "^2.x"
  },
  "devDependencies": {
    "nodemon": "^3.x",
    "jest": "^29.x",
    "supertest": "^6.x"
  }
}
```

## Technical Constraints

### Browser Compatibility
- Modern browsers (Chrome/Edge/Safari/Firefox) last 2 versions
- Mobile browsers: iOS Safari 15+, Chrome Android 100+
- Camera API support required

### Performance Targets
- **Page load:** <2s on 3G
- **Photo upload:** <5s for 5MB image
- **OCR processing:** <3s from photo submit to result
- **WIP Board refresh:** <1s
- **Analytics query:** <5s even with 10k batches
- **CSV export:** Start download in <2s, stream large files

### Security Constraints
- **Authentication:** Token-based, 1h expiry, refresh tokens
- **Authorization:** Check permissions on every API call
- **Photos:** No public URLs, presigned with 1h expiry
- **Audit logs:** Immutable (append-only collection)
- **Encryption:** TLS 1.3, DB encryption at rest
- **AI calls:** Private endpoints, no data retention by AI provider

### Scalability Targets (MVP)
- **Users:** 50 concurrent operators
- **Batches:** 100 active at a time
- **Photos:** 500 per day (50GB/month)
- **Analytics:** 10k batches, 50k events

### Compliance (To Be Confirmed)
- Data residency: [TBD region]
- Retention: [TBD - default 2 years?]
- Backup: Daily, 30-day retention
- Audit: All user actions logged, 7-year retention

## Development Workflow (To Be Established)

### Version Control
- **Git:** Main + feature branches
- **Commit format:** Conventional commits (feat:, fix:, docs:, etc.)
- **PR process:** Code review required

### Testing Strategy
- **Unit tests:** Business logic, utility functions
- **Integration tests:** API endpoints
- **E2E tests:** Critical flows (scan → complete batch)
- **Coverage target:** >80% for backend

### CI/CD (To Be Set Up)
- **On PR:** Lint, test, build
- **On merge to main:** Deploy to staging
- **Manual:** Promote staging to production

### Monitoring (Post-deployment)
- **Logs:** Centralized (CloudWatch / ELK / Datadog)
- **Metrics:** API latency, error rates, OCR success rate
- **Alerts:** High error rate, long response times, OCR failures

## Open Technical Decisions

1. **Stack choice:** Node.js vs Python? React vs Vue?
2. **Auth method:** Local JWT vs SSO (Azure AD, Okta)?
3. **Cloud provider:** AWS vs Azure vs GCP vs self-hosted?
4. **AI provider:** OpenAI Vision vs Google Cloud Vision vs Azure vs self-hosted?
5. **Real-time:** WebSockets now or polling for MVP?
6. **Mobile:** PWA vs native app (post-MVP)?

## Dependencies on Phase 0

Once Phase 0 decisions are made:
- Finalize tech stack based on team expertise
- Set up repository structure
- Install dependencies
- Configure local dev environment
- Create docker-compose for local MongoDB + storage
- Set up initial API skeleton
- Create frontend boilerplate

## Notes

- Prioritize simplicity: use well-supported, mature libraries
- Security first: RBAC and encryption from day one
- Mobile-first: operators use tablets on shop floor
- Photo-centric: optimize upload/display pipeline
- Audit-ready: event sourcing and immutable logs



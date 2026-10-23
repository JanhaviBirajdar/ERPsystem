# Known Limitations & Technical Boundaries

This document defines the architectural boundaries, known constraints, and scalability roadmaps for the commercial multi-tenant College ERP platform.

---

## 1. Database Concurrency & Scaling Thresholds

### Current Implementation:
- Core relational entities (students, faculty, attendance, grades, fees) are stored in an embedded SQLite database using **Write-Ahead Logging (WAL)** mode.
- Multi-tenant tenant registries, subscription metadata, and workflow audit logs are stored in a persisted JSON Document Store (`mongo_store.json`).

### Architectural Boundaries:
1. **Single-Writer Constraint:** SQLite WAL mode supports unlimited concurrent readers, but serializes writes with a single writer lock. Under sustained high write concurrency (> 1,500 write transactions/second across 50 simultaneous institutions during examination mark entry), lock contention may cause slight latency spikes (`SQLITE_BUSY`).
2. **Multi-Node Horizontal Scaling:** Because SQLite is an embedded file-backed database, multi-node Kubernetes pods cannot share the same SQLite database file without network file locks (NFS/EFS), which are prone to corruption.

### Production Scaling Roadmap:
- For multi-instance horizontal scaling (> 10,000 active students or > 20 colleges), migrate the storage layer from embedded SQLite to **PostgreSQL with Row-Level Security (RLS)**, or connect the MongoDB adapter directly to **MongoDB Atlas**.
- The codebase uses repository abstractions (`db/database.js` and `config/database.js`), allowing drop-in database adapter replacement without breaking business logic.

---

## 2. In-Memory Rate Limiting vs Distributed Rate Limiting

### Current Implementation:
- API rate limiters (`apiRateLimiter`, `authRateLimiter`, `aiRateLimiter`) utilize `express-rate-limit` with an in-memory sliding window counter.

### Architectural Boundary:
- If running behind a round-robin load balancer across multiple Node.js worker processes or Docker containers, rate limit counters are local to each process rather than shared globally.

### Production Scaling Roadmap:
- For multi-container deployments, configure the `redis-store` or `ioredis` adapter for `express-rate-limit` to synchronize rate counters across the server cluster.

---

## 3. Payment Gateway Sandbox vs Live Provider Settlement

### Current Implementation:
- The billing engine implements cryptographic HMAC-SHA256 signature verification matching the Stripe/Razorpay webhook specification.
- In sandbox mode (when `STRIPE_WEBHOOK_SECRET` or `RAZORPAY_KEY_SECRET` are not set to live credentials), simulated checkout sessions and cryptographically signed test webhooks are supported.

### Verification Guard:
- Subscriptions are **never** automatically marked as paid unless a webhook payload is verified with an authentic cryptographic HMAC signature.
- To process live credit cards, UPI, or NetBanking payments, live provider credentials must be injected into environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).

---

## 4. Frontend Asset Bundle Size & Code Splitting

### Current Implementation:
- The React application is bundled into a single primary chunk (`index-BOXEj0PC.js`, 637 kB uncompressed, ~143 kB gzip).

### Boundary & Impact:
- On low-bandwidth 2G/3G mobile connections in rural campuses, initial page load may take 1.5 to 2.5 seconds before caching.

### Recommended Optimization:
- Utilize React dynamic `lazy()` imports for secondary administrative modules (e.g., `CampusOperationsPage.jsx`, `NaacPage.jsx`, `ServiceDeskPage.jsx`) to split the bundle into modular chunks under 200 kB.

---

## 5. File & Document Storage Capacity

### Current Implementation:
- Generated documents (e.g., bonafide certificate PDFs, CSV report exports) and tenant logos are persisted on the local filesystem (`server/backups/`, `client/public/assets/`).

### Boundary & Impact:
- Ephemeral container runtimes (e.g., AWS ECS Fargate, Heroku, Google Cloud Run) wipe local filesystem writes on container restart.

### Production Recommended Configuration:
- In cloud deployments, mount an AWS S3, Google Cloud Storage, or Azure Blob Storage bucket for persistent document storage and backup archives.

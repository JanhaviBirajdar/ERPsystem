const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getCollection } = require('./config/database');
const { seedMultiTenant } = require('./db/seedMultiTenant');
const { seedExtensions } = require('./db/seedExtensions');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const { initWorkflowSchema } = require('./db/workflowSchema');
const schedulerService = require('./services/schedulerService');

// Initialize Database & Seeds
connectDB().then(async () => {
  const institutions = getCollection('institutions');
  const count = await institutions.countDocuments();
  if (count === 0) {
    await seedMultiTenant();
  }
  seedExtensions();
  initWorkflowSchema();
  schedulerService.start();
}).catch(console.error);


// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Phase 2 Modular MERN Multi-Tenant Routes
app.use('/api/v1/auth', require('./routes/v1/auth.routes'));
app.use('/api/v1/institution', require('./routes/v1/institution.routes'));
app.use('/api/v1/academic-config', require('./routes/v1/academicConfig.routes'));
app.use('/api/v1/audit', require('./routes/v1/audit.routes'));

// Existing legacy endpoints (preserved for zero disruption)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/institution', require('./routes/institution'));
app.use('/api/students', require('./routes/students'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/academics', require('./routes/academics'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/examination', require('./routes/examination'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/library', require('./routes/library'));
app.use('/api/placement', require('./routes/placement'));
app.use('/api/service-desk', require('./routes/serviceDesk'));
app.use('/api/support', require('./routes/supportSystem'));
app.use('/api/naac', require('./routes/naac'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/search', require('./routes/search'));
app.use('/api/ai', require('./routes/aiCopilot'));

// Academic & Administrative Module Extensions
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/v1/admissions', require('./routes/admissions'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/v1/assignments', require('./routes/assignments'));
app.use('/api/campus', require('./routes/campusOperations'));
app.use('/api/v1/campus', require('./routes/campusOperations'));

// Workflow Automation & Self-Service Routes
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/v1/workflows', require('./routes/workflows'));


// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Modern College ERP SaaS (MERN Multi-Tenant)',
    version: '2.0.0',
    phase: 'PHASE_2_COMPLETED',
    timestamp: new Date().toISOString()
  });
});

// Centralized RFC 7807 Error Handler
app.use(errorHandler);

// Serve frontend production build if available
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('API Server Running. Start frontend client on port 5173 or build client.');
    }
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Modern College ERP SaaS Backend running at http://localhost:${PORT}`);
  console.log(`📡 Healthcheck available at http://localhost:${PORT}/api/health`);
});

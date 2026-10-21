const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

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

// API Routes
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

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Next-Generation College ERP System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    institution: 'Dr. APJ Abdul Kalam Institute of Technology (AIT Pune)'
  });
});

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
  console.log(`🚀 College ERP Backend running at http://localhost:${PORT}`);
  console.log(`📡 Healthcheck available at http://localhost:${PORT}/api/health`);
});

// Vercel Serverless Function entry point for Modern College ERP API
process.env.VERCEL = '1';
const app = require('../server/index');

module.exports = (req, res) => {
  // Ensure req.url has /api prefix for Express router matching
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};

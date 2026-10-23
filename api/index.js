// Vercel Serverless Function entry point for Modern College ERP API
process.env.VERCEL = '1';
const app = require('../server/index');

module.exports = app;

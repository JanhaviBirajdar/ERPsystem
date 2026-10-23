const crypto = require('crypto');

/**
 * Enterprise Structured JSON Request/Response Logger & Telemetry Tracing
 */
const structuredLogger = (req, res, next) => {
  const start = Date.now();
  const traceId = req.headers['x-request-id'] || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      tenantId: req.tenantId || req.user?.tenantId || null,
      userId: req.user?._id || req.user?.id || null,
      role: req.user?.role || 'ANONYMOUS',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else if (req.originalUrl.startsWith('/api')) {
      console.log(`[${logEntry.timestamp.slice(11, 19)}] [${req.method}] ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms) [${traceId.slice(-6)}]`);
    }
  });

  next();
};

module.exports = { structuredLogger };

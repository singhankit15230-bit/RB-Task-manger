import crypto from 'crypto';

export const attachRequestContext = (req, res, next) => {
  req.requestContext = {
    requestId: crypto.randomUUID(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || 'unknown'
  };

  next();
};

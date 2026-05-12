const stores = new Map();

const getClientKey = (req) =>
  req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

export const rateLimit = ({
  windowMs,
  max,
  message = 'Too many requests. Please try again later.'
}) => {
  const store = new Map();
  stores.set(Symbol('rateLimitStore'), store);

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs
      });

      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', max - 1);
      return next();
    }

    current.count += 1;
    const remaining = Math.max(max - current.count, 0);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.ceil(current.resetAt / 1000));

    if (current.count > max) {
      return res.status(429).json({
        success: false,
        message
      });
    }

    next();
  };
};

setInterval(() => {
  const now = Date.now();

  stores.forEach((store) => {
    store.forEach((value, key) => {
      if (value.resetAt <= now) {
        store.delete(key);
      }
    });
  });
}, 60 * 1000).unref();

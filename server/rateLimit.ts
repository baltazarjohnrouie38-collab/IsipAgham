import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './verifyAuth.ts';

interface Bucket {
  timestamps: number[];
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number; label: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const key = req.uid || req.ip || 'anonymous';
    const now = Date.now();
    const cutoff = now - options.windowMs;

    const bucket = buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      res.status(429).json({
        error: `Rate limit reached for ${options.label}. Please wait a moment and try again.`,
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    next();
  };
}

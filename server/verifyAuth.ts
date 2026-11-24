import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';

interface FirebaseConfigJson {
  projectId: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig: FirebaseConfigJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const PROJECT_ID = firebaseConfig.projectId;

let cachedCerts: Record<string, string> = {};
let certsExpiryMs = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (Date.now() < certsExpiryMs && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await res.json()) as Record<string, string>;
  certsExpiryMs = Date.now() + maxAgeSec * 1000;
  return cachedCerts;
}

function base64UrlDecode(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

export interface AuthenticatedRequest extends Request {
  uid?: string;
}

export async function verifyFirebaseToken(token: string): Promise<string> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8')) as {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid token algorithm or key ID');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }
  if (!payload.iat || payload.iat > nowSec + 300) {
    throw new Error('Token issued in the future');
  }
  if (payload.aud !== PROJECT_ID) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Invalid token subject');
  }

  const certs = await getFirebasePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Matching public key not found');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signature = base64UrlDecode(signatureB64);
  if (!verifier.verify(cert, signature)) {
    throw new Error('Invalid token signature');
  }

  return payload.sub;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return;
  }

  try {
    const uid = await verifyFirebaseToken(token);
    req.uid = uid;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid authentication token';
    res.status(401).json({ error: `Unauthorized: ${message}` });
  }
}

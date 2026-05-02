import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const SECRET = process.env.SESSION_SECRET || "clinica-arguello-secret-2026";

export interface TokenPayload {
  userId: number;
  role: string;
  iat: number;
  exp: number;
}

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

export function signToken(payload: { userId: number; role: string }): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 86400 * 7 }));
  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [header, body, sig] = token.split(".");
    const expectedSig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string, salt?: string): string {
  const s = salt || randomBytes(16).toString("hex");
  const hash = createHmac("sha256", SECRET).update(`${password}:${s}`).digest("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt] = stored.split(":");
  const expected = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(stored));
  } catch {
    return false;
  }
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing authorization token" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface AuthJwtPayload extends JwtPayload {
  userId: string;
  name: string;
  role: "user" | "admin";
  iss: string;
  aud: string;
  isEmailVerified: boolean;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as AuthJwtPayload;

    // Проверяем claims
    if (decoded.iss !== "myapp" || decoded.aud !== "myapp-users") {
      return res.status(401).json({ error: "Invalid token claims" });
    }

    if (!decoded.isEmailVerified) {
      return res.status(403).json({ error: "Email not verified"})
    }

    if (!decoded.userId) {
      return res.status(403).json({ error: "You can delete only your own todos"})
    }
    // Сохраняем в req.user
    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT verification error:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthJwtPayload | undefined;

    if (!user) return res.sendStatus(401);

    if (user.role !== role) {
      return res.sendStatus(403);
    }
    next();
  };
}
import jwt from "jsonwebtoken";

export function generateAccessToken(payload: { userId: string; role: string; name: string; iss: string; aud: string }) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15m",
  });
}

export function generateRefreshToken(payload: object) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!);
}

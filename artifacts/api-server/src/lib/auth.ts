import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vitrinepro_secret_change_in_prod";

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

if (isProduction && (!JWT_SECRET || JWT_SECRET === "dev-secret-keep-it-safe")) {
  // Log a fatal-level message but do NOT throw during module load.
  // Throwing here crashes the entire serverless cold-start, making every
  // endpoint return 500 with zero diagnostics in the Vercel function logs.
  console.error(
    "[FATAL] JWT_SECRET / SESSION_SECRET is missing or set to the insecure default. " +
    "Authentication WILL fail. Set a strong secret in Vercel environment variables.",
  );
}

const secret = JWT_SECRET || "dev-only-mostrara-secret-change-me";

export function signToken(userId: string): string {
  if (isProduction && (!JWT_SECRET || JWT_SECRET === "dev-secret-keep-it-safe")) {
    throw new Error("Cannot sign tokens: SESSION_SECRET is not configured for production");
  }
  return jwt.sign({ userId }, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } {
  if (isProduction && (!JWT_SECRET || JWT_SECRET === "dev-secret-keep-it-safe")) {
    throw new Error("Cannot verify tokens: SESSION_SECRET is not configured for production");
  }
  return jwt.verify(token, secret) as { userId: string };
}

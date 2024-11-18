import jwt from "jsonwebtoken";

export async function verifyJwtToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'savoir-faire');
    return decoded;
  } catch (error) {
    return null;
  }
}
import { SignJWT, jwtVerify } from 'jose';
import redis from '../redis';
import { nanoid } from 'nanoid';

export class TokenManager {
  private static instance: TokenManager;
  private readonly SECRET_KEY: Uint8Array;
  private readonly TOKEN_EXPIRY = '24h';

  private constructor() {
    this.SECRET_KEY = new TextEncoder().encode(
      process.env.JWT_SECRET_KEY || 'default-secret-key'
    );
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async generateToken(userId: string): Promise<string> {
    const sessionId = nanoid();
    const token = await new SignJWT({ userId, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(this.TOKEN_EXPIRY)
      .sign(this.SECRET_KEY);

    // Store session in Redis
    await redis.set(`session:${sessionId}`, userId, {
      ex: 24 * 60 * 60 // 24 hours in seconds
    });

    return token;
  }

  async verifyToken(token: string) {
    const { payload } = await jwtVerify(token, this.SECRET_KEY);
    const sessionId = payload.sessionId as string;
    
    // Verify session exists in Redis
    const userId = await redis.get(`session:${sessionId}`);
    if (!userId) {
      throw new Error('Invalid session');
    }

    return payload;
  }

  async invalidateToken(sessionId: string) {
    await redis.del(`session:${sessionId}`);
  }
}
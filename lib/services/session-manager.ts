import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

interface SessionData {
  userId: string;
  role: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
  };
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export class SessionManager {
  private redis: Redis;
  private readonly SESSION_EXPIRY = 24 * 60 * 60; // 24 horas

  constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!
    });
  }

  async createSession(data: Omit<SessionData, 'createdAt' | 'lastActivity' | 'expiresAt'>): Promise<string> {
    const sessionId = nanoid(32);
    const now = Date.now();

    const sessionData: SessionData = {
      ...data,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + (this.SESSION_EXPIRY * 1000)
    };

    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { ex: this.SESSION_EXPIRY }
    );

    // Mantener registro de sesiones por usuario
    await this.redis.sadd(`user_sessions:${data.userId}`, sessionId);

    return sessionId;
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.redis.get(`session:${sessionId}`);
    if (!session) return null;

    const sessionData: SessionData = JSON.parse(session);
    
    // Verificar expiración
    if (Date.now() > sessionData.expiresAt) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Actualizar última actividad
    sessionData.lastActivity = Date.now();
    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { ex: this.SESSION_EXPIRY }
    );

    return sessionData;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = await this.redis.get(`session:${sessionId}`);
    if (session) {
      const { userId } = JSON.parse(session);
      await this.redis.srem(`user_sessions:${userId}`, sessionId);
    }
    await this.redis.del(`session:${sessionId}`);
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.redis.smembers(`user_sessions:${userId}`);
    await Promise.all(
      sessions.map(sessionId => this.invalidateSession(sessionId))
    );
    await this.redis.del(`user_sessions:${userId}`);
  }

  async getActiveSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    const sessions = await Promise.all(
      sessionIds.map(async id => {
        const session = await this.redis.get(`session:${id}`);
        return session ? JSON.parse(session) : null;
      })
    );
    return sessions.filter(Boolean);
  }
}
type SecurityEvent = {
  type: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  path?: string;
  error?: string;
  timestamp: Date;
};

type AccessEvent = {
  userId: string;
  sessionId: string;
  ip: string;
  path: string;
  method: string;
  timestamp: Date;
};

export class SecurityLogger {
  private static instance: SecurityLogger;

  private constructor() {}

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  async logEvent(event: SecurityEvent): Promise<void> {
    console.log('[Security Event]', {
      ...event,
      timestamp: event.timestamp.toISOString()
    });
  }

  async logAccess(event: AccessEvent): Promise<void> {
    console.log('[Access Event]', {
      ...event,
      timestamp: event.timestamp.toISOString()
    });
  }
}

export default SecurityLogger;
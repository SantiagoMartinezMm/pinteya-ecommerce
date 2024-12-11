type RateLimitConfig = {
  windowMs: number;  // Ventana de tiempo en milisegundos
  maxRequests: number;  // Número máximo de solicitudes permitidas en la ventana
};

export class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, number[]>;
  private config: RateLimitConfig;

  private constructor() {
    this.requests = new Map();
    this.config = {
      windowMs: 60 * 1000, // 1 minuto por defecto
      maxRequests: 100     // 100 solicitudes por minuto por defecto
    };
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Obtener las solicitudes existentes para esta key
    let keyRequests = this.requests.get(key) || [];

    // Filtrar las solicitudes dentro de la ventana de tiempo
    keyRequests = keyRequests.filter(timestamp => timestamp > windowStart);

    // Verificar si se excede el límite
    if (keyRequests.length >= this.config.maxRequests) {
      return false;
    }

    // Agregar la nueva solicitud
    keyRequests.push(now);
    this.requests.set(key, keyRequests);

    return true;
  }

  async resetLimit(key: string): Promise<void> {
    this.requests.delete(key);
  }
}

export default RateLimiter.getInstance();

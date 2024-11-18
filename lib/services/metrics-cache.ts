import { MetricValue, MetricQuery } from '@/types/metrics';

interface CacheEntry {
  data: MetricValue[];
  timestamp: number;
  ttl: number;
}

export class MetricsCache {
  private static instance: MetricsCache;
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number = 1000;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutos

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): MetricsCache {
    if (!MetricsCache.instance) {
      MetricsCache.instance = new MetricsCache();
    }
    return MetricsCache.instance;
  }

  async get(query: MetricQuery): Promise<MetricValue[] | null> {
    const key = this.generateCacheKey(query);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(query: MetricQuery, data: MetricValue[], ttl: number = this.defaultTTL): Promise<void> {
    const key = this.generateCacheKey(query);

    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private generateCacheKey(query: MetricQuery): string {
    return JSON.stringify({
      metricId: query.metricId,
      timeRange: query.timeRange,
      aggregation: query.aggregation,
      filters: query.filters
    });
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Limpiar cada minuto
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): {
    size: number;
    maxSize: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const entry of this.cache.values()) {
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }
}
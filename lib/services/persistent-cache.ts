import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MetricValue, MetricQuery } from '@/types/metrics';

interface MetricsCacheDB extends DBSchema {
  cache_entries: {
    key: string;
    value: {
      data: MetricValue[];
      timestamp: number;
      ttl: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

export class PersistentMetricsCache {
  private static instance: PersistentMetricsCache;
  private db: IDBPDatabase<MetricsCacheDB>;
  private memoryCache: Map<string, MetricValue[]> = new Map();
  private readonly DB_NAME = 'metrics_cache';
  private readonly STORE_NAME = 'cache_entries';

  private constructor() {
    this.initDB();
    this.startCleanupInterval();
  }

  static getInstance(): PersistentMetricsCache {
    if (!PersistentMetricsCache.instance) {
      PersistentMetricsCache.instance = new PersistentMetricsCache();
    }
    return PersistentMetricsCache.instance;
  }

  private async initDB(): Promise<void> {
    this.db = await openDB<MetricsCacheDB>(this.DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore('cache_entries', {
          keyPath: 'key'
        });
        store.createIndex('by-timestamp', 'timestamp');
      }
    });
  }

  async get(query: MetricQuery): Promise<MetricValue[] | null> {
    const key = this.generateCacheKey(query);

    // Intentar obtener de la memoria cache
    const memoryData = this.memoryCache.get(key);
    if (memoryData) return memoryData;

    // Intentar obtener de IndexedDB
    try {
      const entry = await this.db.get(this.STORE_NAME, key);
      if (!entry) return null;

      if (this.isExpired(entry)) {
        await this.delete(key);
        return null;
      }

      // Actualizar memoria cache
      this.memoryCache.set(key, entry.value.data);
      return entry.value.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  async set(
    query: MetricQuery,
    data: MetricValue[],
    ttl: number = 5 * 60 * 1000
  ): Promise<void> {
    const key = this.generateCacheKey(query);
    const entry = {
      key,
      value: {
        data,
        timestamp: Date.now(),
        ttl
      }
    };

    try {
      // Actualizar IndexedDB
      await this.db.put(this.STORE_NAME, entry);
      
      // Actualizar memoria cache
      this.memoryCache.set(key, data);

      // Limpiar entradas antiguas si es necesario
      await this.cleanupOldEntries();
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  private async delete(key: string): Promise<void> {
    try {
      await this.db.delete(this.STORE_NAME, key);
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Error deleting from cache:', error);
    }
  }

  private async cleanupOldEntries(): Promise<void> {
    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const index = store.index('by-timestamp');
    
    const oldEntries = await index.getAllKeys(IDBKeyRange.upperBound(
      Date.now() - (24 * 60 * 60 * 1000) // 24 horas
    ));

    await Promise.all(oldEntries.map(key => this.delete(key)));
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldEntries();
    }, 60 * 60 * 1000); // Cada hora
  }

  private generateCacheKey(query: MetricQuery): string {
    return JSON.stringify({
      metricId: query.metricId,
      timeRange: query.timeRange,
      aggregation: query.aggregation,
      filters: query.filters
    });
  }

  private isExpired(entry: any): boolean {
    return Date.now() - entry.value.timestamp > entry.value.ttl;
  }
}
import { compress, decompress } from 'lz-string';
import { MetricValue, MetricQuery } from '@/types/metrics';
import { PersistentMetricsCache } from './persistent-cache';

export class CompressedMetricsCache extends PersistentMetricsCache {
  private static instance: CompressedMetricsCache;
  private compressionThreshold = 1024; // 1KB

  static getInstance(): CompressedMetricsCache {
    if (!CompressedMetricsCache.instance) {
      CompressedMetricsCache.instance = new CompressedMetricsCache();
    }
    return CompressedMetricsCache.instance;
  }

  async set(
    query: MetricQuery,
    data: MetricValue[],
    ttl: number = 5 * 60 * 1000
  ): Promise<void> {
    const serializedData = JSON.stringify(data);
    
    // Comprimir si los datos superan el umbral
    const shouldCompress = serializedData.length > this.compressionThreshold;
    const processedData = shouldCompress
      ? this.compressData(serializedData)
      : serializedData;

    await super.set(query, {
      data: processedData,
      compressed: shouldCompress,
      originalSize: serializedData.length,
      compressedSize: processedData.length
    }, ttl);
  }

  async get(query: MetricQuery): Promise<MetricValue[] | null> {
    const cachedData = await super.get(query);
    if (!cachedData) return null;

    try {
      const data = cachedData.compressed
        ? this.decompressData(cachedData.data)
        : cachedData.data;

      return JSON.parse(data);
    } catch (error) {
      console.error('Error decompressing cached data:', error);
      return null;
    }
  }

  private compressData(data: string): string {
    return compress(data);
  }

  private decompressData(data: string): string {
    return decompress(data);
  }

  getCacheStats(): CacheStats {
    const stats = super.getCacheStats();
    return {
      ...stats,
      compressionRatio: this.calculateCompressionRatio(),
      compressedEntries: this.countCompressedEntries(),
    };
  }

  private calculateCompressionRatio(): number {
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    // Calcular ratio de compresión promedio
    for (const entry of this.entries()) {
      if (entry.compressed) {
        totalOriginal += entry.originalSize;
        totalCompressed += entry.compressedSize;
      }
    }

    return totalOriginal ? totalCompressed / totalOriginal : 1;
  }

  private countCompressedEntries(): number {
    return Array.from(this.entries()).filter(
      entry => entry.compressed
    ).length;
  }
}
import { compress as lzCompress, decompress as lzDecompress } from 'lz-string';
import { deflate, inflate } from 'pako';
import { MetricValue } from '@/types/metrics';

export enum CompressionAlgorithm {
  LZ_STRING = 'lz-string',
  DEFLATE = 'deflate',
  HYBRID = 'hybrid'
}

export class AdvancedCompressionService {
  private static instance: AdvancedCompressionService;

  static getInstance(): AdvancedCompressionService {
    if (!AdvancedCompressionService.instance) {
      AdvancedCompressionService.instance = new AdvancedCompressionService();
    }
    return AdvancedCompressionService.instance;
  }

  compressData(
    data: any,
    algorithm: CompressionAlgorithm = CompressionAlgorithm.HYBRID
  ): { compressed: string; algorithm: CompressionAlgorithm; stats: CompressionStats } {
    const serialized = JSON.stringify(data);
    const originalSize = serialized.length;
    let compressed: string;
    let compressedSize: number;

    switch (algorithm) {
      case CompressionAlgorithm.LZ_STRING:
        compressed = lzCompress(serialized);
        break;

      case CompressionAlgorithm.DEFLATE:
        const deflated = deflate(serialized);
        compressed = Buffer.from(deflated).toString('base64');
        break;

      case CompressionAlgorithm.HYBRID:
        // Primero aplicamos DEFLATE y luego LZ-String
        const deflatedData = deflate(serialized);
        const base64 = Buffer.from(deflatedData).toString('base64');
        compressed = lzCompress(base64);
        break;

      default:
        throw new Error(`Algoritmo de compresión no soportado: ${algorithm}`);
    }

    compressedSize = compressed.length;

    return {
      compressed,
      algorithm,
      stats: {
        originalSize,
        compressedSize,
        compressionRatio: compressedSize / originalSize,
        algorithm
      }
    };
  }

  decompressData(
    compressed: string,
    algorithm: CompressionAlgorithm
  ): any {
    let decompressed: string;

    switch (algorithm) {
      case CompressionAlgorithm.LZ_STRING:
        decompressed = lzDecompress(compressed);
        break;

      case CompressionAlgorithm.DEFLATE:
        const buffer = Buffer.from(compressed, 'base64');
        decompressed = inflate(buffer, { to: 'string' });
        break;

      case CompressionAlgorithm.HYBRID:
        const lzDecompressed = lzDecompress(compressed);
        const inflatedBuffer = Buffer.from(lzDecompressed, 'base64');
        decompressed = inflate(inflatedBuffer, { to: 'string' });
        break;

      default:
        throw new Error(`Algoritmo de compresión no soportado: ${algorithm}`);
    }

    return JSON.parse(decompressed);
  }

  analyzeCompressionEfficiency(
    data: any
  ): CompressionAnalysis {
    const results = Object.values(CompressionAlgorithm).map(algorithm => {
      const { stats } = this.compressData(data, algorithm);
      return stats;
    });

    return {
      bestAlgorithm: results.reduce((best, current) => 
        current.compressionRatio < best.compressionRatio ? current : best
      ),
      results,
      recommendation: this.getCompressionRecommendation(results)
    };
  }

  private getCompressionRecommendation(
    results: CompressionStats[]
  ): string {
    const best = results.reduce((best, current) => 
      current.compressionRatio < best.compressionRatio ? current : best
    );

    if (best.compressionRatio > 0.9) {
      return 'Los datos no son muy compresibles, considere usar sin compresión';
    }

    return `Se recomienda usar ${best.algorithm} para una mejor relación de compresión`;
  }
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: CompressionAlgorithm;
}

interface CompressionAnalysis {
  bestAlgorithm: CompressionStats;
  results: CompressionStats[];
  recommendation: string;
}
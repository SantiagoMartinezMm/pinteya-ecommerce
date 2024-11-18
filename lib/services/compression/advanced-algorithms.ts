import { deflate, inflate } from 'pako';
import { compress as lzCompress, decompress as lzDecompress } from 'lz-string';
import { gzip, ungzip } from 'node-gzip';
import { Buffer } from 'buffer';

export enum CompressionAlgorithm {
  LZ_STRING = 'lz-string',
  DEFLATE = 'deflate',
  GZIP = 'gzip',
  HYBRID = 'hybrid',
  ADAPTIVE = 'adaptive',
  DICTIONARY = 'dictionary'
}

export class AdvancedCompressionService {
  private static instance: AdvancedCompressionService;
  private dictionaryCache: Map<string, object> = new Map();

  static getInstance(): AdvancedCompressionService {
    if (!AdvancedCompressionService.instance) {
      AdvancedCompressionService.instance = new AdvancedCompressionService();
    }
    return AdvancedCompressionService.instance;
  }

  async compressData(
    data: any,
    algorithm: CompressionAlgorithm = CompressionAlgorithm.ADAPTIVE
  ): Promise<CompressedData> {
    const serialized = JSON.stringify(data);
    const originalSize = serialized.length;

    let compressed: string;
    let metadata: CompressionMetadata = {
      algorithm,
      originalSize,
      dictionary: null
    };

    switch (algorithm) {
      case CompressionAlgorithm.ADAPTIVE:
        return this.adaptiveCompress(serialized);

      case CompressionAlgorithm.DICTIONARY:
        return this.dictionaryCompress(serialized);

      case CompressionAlgorithm.GZIP:
        const gzipped = await gzip(serialized);
        compressed = gzipped.toString('base64');
        break;

      case CompressionAlgorithm.HYBRID:
        // Combinar múltiples algoritmos
        const deflated = deflate(serialized);
        const base64 = Buffer.from(deflated).toString('base64');
        compressed = lzCompress(base64);
        break;

      default:
        throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }

    return {
      compressed,
      metadata,
      stats: this.calculateStats(serialized, compressed)
    };
  }

  private async adaptiveCompress(data: string): Promise<CompressedData> {
    // Analizar los datos para elegir el mejor algoritmo
    const samples = this.analyzeSamples(data);
    const bestAlgorithm = this.selectBestAlgorithm(samples);

    return this.compressData(data, bestAlgorithm);
  }

  private async dictionaryCompress(data: string): Promise<CompressedData> {
    const dictionary = this.buildDictionary(data);
    const compressed = this.compressWithDictionary(data, dictionary);

    return {
      compressed,
      metadata: {
        algorithm: CompressionAlgorithm.DICTIONARY,
        originalSize: data.length,
        dictionary
      },
      stats: this.calculateStats(data, compressed)
    };
  }

  private buildDictionary(data: string): object {
    // Implementar construcción de diccionario basado en frecuencias
    const frequencies: { [key: string]: number } = {};
    const patterns = data.match(/.{2,10}/g) || [];

    patterns.forEach(pattern => {
      frequencies[pattern] = (frequencies[pattern] || 0) + 1;
    });

    // Seleccionar los patrones más frecuentes
    return Object.entries(frequencies)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1000)
      .reduce((dict, [pattern, _]) => {
        dict[pattern] = String.fromCharCode(Object.keys(dict).length);
        return dict;
      }, {});
  }

  private compressWithDictionary(data: string, dictionary: object): string {
    let compressed = data;
    Object.entries(dictionary).forEach(([pattern, replacement]) => {
      compressed = compressed.split(pattern).join(replacement);
    });
    return compressed;
  }

  private analyzeSamples(data: string): CompressionAnalysis[] {
    const sampleSize = Math.min(1000, data.length);
    const sample = data.slice(0, sampleSize);

    return Object.values(CompressionAlgorithm).map(algorithm => ({
      algorithm,
      ...this.testCompression(sample, algorithm)
    }));
  }

  private testCompression(
    sample: string,
    algorithm: CompressionAlgorithm
  ): CompressionStats {
    try {
      const compressed = this.compressData(sample, algorithm);
      return this.calculateStats(sample, compressed.compressed);
    } catch (error) {
      return {
        ratio: Infinity,
        speed: 0,
        memory: Infinity
      };
    }
  }

  private selectBestAlgorithm(
    analyses: CompressionAnalysis[]
  ): CompressionAlgorithm {
    return analyses.reduce((best, current) => {
      const score = this.calculateAlgorithmScore(current);
      const bestScore = this.calculateAlgorithmScore(best);
      return score > bestScore ? current : best;
    }).algorithm;
  }

  private calculateAlgorithmScore(
    analysis: CompressionAnalysis
  ): number {
    return (
      (1 / analysis.stats.ratio) * 0.5 +
      analysis.stats.speed * 0.3 +
      (1 / analysis.stats.memory) * 0.2
    );
  }

  private calculateStats(
    original: string,
    compressed: string
  ): CompressionStats {
    return {
      ratio: compressed.length / original.length,
      speed: performance.now(), // Simplificado
      memory: compressed.length * 2 // Estimación básica
    };
  }
}

interface CompressedData {
  compressed: string;
  metadata: CompressionMetadata;
  stats: CompressionStats;
}

interface CompressionMetadata {
  algorithm: CompressionAlgorithm;
  originalSize: number;
  dictionary: object | null;
}

interface CompressionStats {
  ratio: number;
  speed: number;
  memory: number;
}

interface CompressionAnalysis {
  algorithm: CompressionAlgorithm;
  stats: CompressionStats;
}
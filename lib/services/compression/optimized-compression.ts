import { deflate, inflate } from 'pako';
import { compress as lzCompress, decompress as lzDecompress } from 'lz-string';
import { gzip, ungzip } from 'node-gzip';
import { Buffer } from 'buffer';

export class OptimizedCompressionService {
  private static instance: OptimizedCompressionService;
  private cache: Map<string, CompressedData> = new Map();
  private frequencyMap: Map<string, number> = new Map();

  static getInstance(): OptimizedCompressionService {
    if (!OptimizedCompressionService.instance) {
      OptimizedCompressionService.instance = new OptimizedCompressionService();
    }
    return OptimizedCompressionService.instance;
  }

  async compressWithOptimization(data: any): Promise<CompressedData> {
    const key = this.generateCacheKey(data);
    
    // Verificar caché
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Analizar datos para optimización
    const analysis = await this.analyzeData(data);
    
    // Seleccionar estrategia de compresión
    const strategy = this.selectCompressionStrategy(analysis);
    
    // Aplicar pre-procesamiento si es necesario
    const preprocessed = this.preprocess(data, analysis);
    
    // Comprimir con la estrategia seleccionada
    const compressed = await this.compressWithStrategy(preprocessed, strategy);
    
    // Almacenar en caché
    this.cache.set(key, compressed);
    
    return compressed;
  }

  private async analyzeData(data: any): Promise<DataAnalysis> {
    const serialized = JSON.stringify(data);
    
    return {
      size: serialized.length,
      entropy: this.calculateEntropy(serialized),
      patterns: this.detectPatterns(serialized),
      structure: this.analyzeStructure(data),
      redundancy: this.calculateRedundancy(serialized)
    };
  }

  private calculateEntropy(data: string): number {
    const frequencies: Map<string, number> = new Map();
    let totalChars = data.length;

    // Calcular frecuencias
    for (const char of data) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    // Calcular entropía
    let entropy = 0;
    for (const frequency of frequencies.values()) {
      const probability = frequency / totalChars;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private detectPatterns(data: string): Pattern[] {
    const patterns: Pattern[] = [];
    const minLength = 3;
    const maxLength = 20;

    for (let len = minLength; len <= maxLength; len++) {
      const found = new Map<string, number>();
      
      for (let i = 0; i <= data.length - len; i++) {
        const pattern = data.substr(i, len);
        found.set(pattern, (found.get(pattern) || 0) + 1);
      }

      // Filtrar patrones significativos
      for (const [pattern, count] of found.entries()) {
        if (count > 2 && (pattern.length * count) > 10) {
          patterns.push({ pattern, count, length: len });
        }
      }
    }

    return patterns.sort((a, b) => 
      (b.length * b.count) - (a.length * a.count)
    );
  }

  private analyzeStructure(data: any): DataStructure {
    return {
      depth: this.calculateDepth(data),
      repeatingKeys: this.findRepeatingKeys(data),
      arrayPatterns: this.analyzeArrays(data)
    };
  }

  private selectCompressionStrategy(analysis: DataAnalysis): CompressionStrategy {
    if (analysis.entropy < 3) {
      return {
        algorithm: 'dictionary',
        options: {
          patterns: analysis.patterns.slice(0, 100)
        }
      };
    }

    if (analysis.redundancy > 0.5) {
      return {
        algorithm: 'hybrid',
        options: {
          preprocess: true,
          algorithms: ['deflate', 'lz']
        }
      };
    }

    return {
      algorithm: 'adaptive',
      options: {
        blockSize: 1024,
        parallel: true
      }
    };
  }

  private preprocess(data: any, analysis: DataAnalysis): any {
    // Aplicar transformaciones basadas en el análisis
    if (analysis.structure.repeatingKeys.length > 0) {
      data = this.optimizeRepeatingKeys(data, analysis.structure.repeatingKeys);
    }

    if (analysis.structure.arrayPatterns.length > 0) {
      data = this.optimizeArrayPatterns(data, analysis.structure.arrayPatterns);
    }

    return data;
  }

  private async compressWithStrategy(
    data: any,
    strategy: CompressionStrategy
  ): Promise<CompressedData> {
    switch (strategy.algorithm) {
      case 'dictionary':
        return this.dictionaryCompress(data, strategy.options);
      case 'hybrid':
        return this.hybridCompress(data, strategy.options);
      case 'adaptive':
        return this.adaptiveCompress(data, strategy.options);
      default:
        throw new Error(`Estrategia no soportada: ${strategy.algorithm}`);
    }
  }
}

interface DataAnalysis {
  size: number;
  entropy: number;
  patterns: Pattern[];
  structure: DataStructure;
  redundancy: number;
}

interface Pattern {
  pattern: string;
  count: number;
  length: number;
}

interface DataStructure {
  depth: number;
  repeatingKeys: string[];
  arrayPatterns: ArrayPattern[];
}

interface ArrayPattern {
  path: string;
  length: number;
  repetition: number;
}

interface CompressionStrategy {
  algorithm: string;
  options: Record<string, any>;
}
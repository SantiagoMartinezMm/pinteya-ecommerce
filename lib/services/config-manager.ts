import { saveAs } from 'file-saver';
import { z } from 'zod';
import { 
  DashboardConfig,
  VisualizationConfig,
  MetricConfig 
} from '@/types/dashboard';

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private storage: Storage;
  private configKey = 'dashboard_config';

  private constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  async exportConfiguration(): Promise<void> {
    const config = await this.getConfiguration();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `dashboard-config-${timestamp}.json`);
  }

  async importConfiguration(file: File): Promise<void> {
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      // Validar la configuración
      if (this.validateConfig(config)) {
        await this.saveConfiguration(config);
        return;
      }
      throw new Error('Configuración inválida');
    } catch (error) {
      console.error('Error importing configuration:', error);
      throw error;
    }
  }

  private validateConfig(config: any): boolean {
    const configSchema = z.object({
      version: z.string(),
      lastModified: z.string(),
      metrics: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        config: z.record(z.any())
      })),
      visualizations: z.array(z.object({
        id: z.string(),
        type: z.string(),
        config: z.record(z.any())
      })),
      layout: z.array(z.object({
        i: z.string(),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number()
      }))
    });

    return configSchema.safeParse(config).success;
  }

  async getConfiguration(): Promise<DashboardConfig> {
    if (!this.storage) return this.getDefaultConfig();

    const data = this.storage.getItem(this.configKey);
    return data ? JSON.parse(data) : this.getDefaultConfig();
  }

  private getDefaultConfig(): DashboardConfig {
    return {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      metrics: [],
      visualizations: [],
      layout: []
    };
  }

  async saveConfiguration(config: DashboardConfig): Promise<void> {
    if (!this.storage) return;

    config.lastModified = new Date().toISOString();
    this.storage.setItem(this.configKey, JSON.stringify(config));
  }
}
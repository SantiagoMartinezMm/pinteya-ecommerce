import { z } from 'zod';
import { CustomMetric, MetricValue } from '@/types/metrics';

export class MetricsStorageService {
  private static instance: MetricsStorageService;
  private storage: Storage;
  private metricsKey = 'custom_metrics';
  private valuesKey = 'metric_values';

  private constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
  }

  static getInstance(): MetricsStorageService {
    if (!MetricsStorageService.instance) {
      MetricsStorageService.instance = new MetricsStorageService();
    }
    return MetricsStorageService.instance;
  }

  async saveMetric(metric: CustomMetric): Promise<void> {
    if (!this.storage) return;

    const metrics = await this.getMetrics();
    metrics.push(metric);
    
    this.storage.setItem(this.metricsKey, JSON.stringify(metrics));
    
    // Crear estructura inicial para valores
    const values = await this.getMetricValues();
    values[metric.id] = [];
    this.storage.setItem(this.valuesKey, JSON.stringify(values));
  }

  async updateMetric(id: string, updates: Partial<CustomMetric>): Promise<void> {
    if (!this.storage) return;

    const metrics = await this.getMetrics();
    const index = metrics.findIndex(m => m.id === id);
    
    if (index !== -1) {
      metrics[index] = { ...metrics[index], ...updates };
      this.storage.setItem(this.metricsKey, JSON.stringify(metrics));
    }
  }

  async deleteMetric(id: string): Promise<void> {
    if (!this.storage) return;

    const metrics = await this.getMetrics();
    const filteredMetrics = metrics.filter(m => m.id !== id);
    this.storage.setItem(this.metricsKey, JSON.stringify(filteredMetrics));

    // Limpiar valores asociados
    const values = await this.getMetricValues();
    delete values[id];
    this.storage.setItem(this.valuesKey, JSON.stringify(values));
  }

  async addMetricValue(id: string, value: MetricValue): Promise<void> {
    if (!this.storage) return;

    const values = await this.getMetricValues();
    if (!values[id]) values[id] = [];
    
    values[id].push(value);
    
    // Mantener solo los últimos 1000 valores
    if (values[id].length > 1000) {
      values[id] = values[id].slice(-1000);
    }
    
    this.storage.setItem(this.valuesKey, JSON.stringify(values));
  }

  async getMetrics(): Promise<CustomMetric[]> {
    if (!this.storage) return [];

    const data = this.storage.getItem(this.metricsKey);
    return data ? JSON.parse(data) : [];
  }

  async getMetricValues(id?: string): Promise<Record<string, MetricValue[]>> {
    if (!this.storage) return {};

    const data = this.storage.getItem(this.valuesKey);
    const values = data ? JSON.parse(data) : {};
    
    return id ? { [id]: values[id] || [] } : values;
  }

  async exportMetrics(): Promise<Blob> {
    const metrics = await this.getMetrics();
    const values = await this.getMetricValues();
    
    const data = {
      metrics,
      values,
      exportDate: new Date().toISOString()
    };

    return new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
  }

  async importMetrics(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    this.storage.setItem(this.metricsKey, JSON.stringify(data.metrics));
    this.storage.setItem(this.valuesKey, JSON.stringify(data.values));
  }
}
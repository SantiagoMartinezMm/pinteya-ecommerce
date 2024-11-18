import { DashboardMetrics, SystemHealth, Event } from '@/types/dashboard';

export class MetricsService {
  private static instance: MetricsService;
  private metrics: DashboardMetrics;
  private wsConnection: WebSocket | null = null;

  private constructor() {
    this.metrics = {
      systemHealth: {
        cpu: 0,
        memory: 0,
        disk: 0,
        uptime: 0,
      },
      activeUsers: [],
      recentEvents: [],
      performanceMetrics: [],
      alerts: [],
    };
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  async getInitialMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await fetch('/api/metrics/initial');
      const data = await response.json();
      this.metrics = data;
      return data;
    } catch (error) {
      console.error('Error fetching initial metrics:', error);
      return this.metrics;
    }
  }

  async getLatestMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await fetch('/api/metrics/latest');
      const data = await response.json();
      this.updateMetrics(data);
      return this.metrics;
    } catch (error) {
      console.error('Error fetching latest metrics:', error);
      return this.metrics;
    }
  }

  private updateMetrics(newData: Partial<DashboardMetrics>) {
    this.metrics = {
      ...this.metrics,
      ...newData,
      recentEvents: [
        ...newData.recentEvents || [],
        ...this.metrics.recentEvents || [],
      ].slice(0, 50),
    };
  }

  subscribeToMetrics(callback: (metrics: DashboardMetrics) => void) {
    if (!this.wsConnection) {
      this.wsConnection = new WebSocket('ws://your-websocket-url');
      
      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.updateMetrics(data);
        callback(this.metrics);
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.wsConnection = null;
      };
    }
  }

  unsubscribeFromMetrics() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}
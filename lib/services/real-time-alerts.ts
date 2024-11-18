import { AlertSystem } from './alert-system';
import { MetricThreshold, SystemAlert, DashboardMetrics } from '@/types/dashboard';

export class RealTimeAlertSystem extends AlertSystem {
  private thresholds: MetricThreshold[] = [];
  private metricHistory: Map<string, number[]> = new Map();

  public setThresholds(thresholds: MetricThreshold[]) {
    this.thresholds = thresholds;
  }

  public processMetrics(metrics: DashboardMetrics) {
    // Procesar métricas del sistema
    this.processSystemHealth(metrics.systemHealth);
    
    // Procesar métricas de rendimiento
    this.processPerformanceMetrics(metrics.performanceMetrics);
    
    // Procesar actividad de usuarios
    this.processUserActivity(metrics.activeUsers);
  }

  private processSystemHealth(health: SystemHealth) {
    const cpuAlert = this.checkThreshold('cpu', health.cpu);
    const memoryAlert = this.checkThreshold('memory', health.memory);
    const diskAlert = this.checkThreshold('disk', health.disk);

    [cpuAlert, memoryAlert, diskAlert]
      .filter(Boolean)
      .forEach(alert => this.addAlert(alert!));
  }

  private checkThreshold(metric: string, value: number): SystemAlert | null {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (!threshold) return null;

    // Actualizar historial
    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, []);
    }
    const history = this.metricHistory.get(metric)!;
    history.push(value);
    if (history.length > 60) history.shift(); // Mantener último minuto

    // Verificar si el valor excede el umbral por la duración especificada
    const exceedsDuration = history
      .slice(-threshold.duration)
      .every(v => v > threshold.critical);

    if (exceedsDuration) {
      return {
        id: `${metric}-${Date.now()}`,
        type: 'system',
        priority: 'high',
        title: `${metric.toUpperCase()} crítico`,
        description: `${metric} ha excedido el umbral crítico por ${threshold.duration} segundos`,
        timestamp: Date.now(),
        metadata: {
          metric,
          value,
          threshold: threshold.critical,
          history: history.slice(-threshold.duration),
        },
      };
    }

    return null;
  }
}
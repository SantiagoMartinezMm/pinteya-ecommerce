import { LogEntry, LogAnalysis, SecurityPattern, AnomalyDetection } from '@/types';

export class LogAnalyzer {
  private static instance: LogAnalyzer;
  private readonly ANALYSIS_WINDOW = 3600000; // 1 hora en ms
  private readonly ANOMALY_THRESHOLD = 2; // Desviaciones estándar

  private constructor() {}

  static getInstance(): LogAnalyzer {
    if (!LogAnalyzer.instance) {
      LogAnalyzer.instance = new LogAnalyzer();
    }
    return LogAnalyzer.instance;
  }

  public async analyzeLogs(logs: LogEntry[]): Promise<LogAnalysis> {
    const timeBasedAnalysis = this.analyzeTimePatterns(logs);
    const securityAnalysis = await this.analyzeSecurityPatterns(logs);
    const userBehaviorAnalysis = this.analyzeUserBehavior(logs);
    const performanceAnalysis = this.analyzePerformanceMetrics(logs);
    const anomalies = this.detectAnomalies(logs);

    return {
      timeBasedAnalysis,
      securityAnalysis,
      userBehaviorAnalysis,
      performanceAnalysis,
      anomalies,
      timestamp: Date.now(),
    };
  }

  private analyzeTimePatterns(logs: LogEntry[]) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);
    const activityTrends = new Map<string, number>();

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      hourlyDistribution[date.getHours()]++;
      dailyDistribution[date.getDay()]++;
      
      const dayKey = date.toISOString().split('T')[0];
      activityTrends.set(dayKey, (activityTrends.get(dayKey) || 0) + 1);
    });

    return {
      hourlyDistribution,
      dailyDistribution,
      activityTrends: Object.fromEntries(activityTrends),
      peakHours: this.findPeakPeriods(hourlyDistribution),
      quietHours: this.findQuietPeriods(hourlyDistribution),
    };
  }

  private async analyzeSecurityPatterns(logs: LogEntry[]): Promise<SecurityPattern[]> {
    const patterns: SecurityPattern[] = [];
    const loginAttempts = new Map<string, number>();
    const suspiciousIPs = new Set<string>();

    // Analizar patrones de acceso
    logs.forEach(log => {
      if (log.action === 'LOGIN_ATTEMPT') {
        const key = `${log.userId}:${log.ipAddress}`;
        loginAttempts.set(key, (loginAttempts.get(key) || 0) + 1);

        if (loginAttempts.get(key)! > 5) {
          suspiciousIPs.add(log.ipAddress);
        }
      }
    });

    // Detectar accesos inusuales
    const unusualAccess = logs.filter(log => {
      const hour = new Date(log.timestamp).getHours();
      return hour >= 22 || hour <= 5; // Accesos nocturnos
    });

    // Detectar escalamiento de privilegios
    const privilegeEscalation = logs.filter(log => {
      return log.action.includes('ROLE_CHANGE') || 
             log.action.includes('PERMISSION_GRANT');
    });

    return [
      ...Array.from(suspiciousIPs).map(ip => ({
        type: 'BRUTE_FORCE',
        severity: 'HIGH',
        source: ip,
        details: `Multiple failed login attempts from IP ${ip}`,
      })),
      ...unusualAccess.map(log => ({
        type: 'UNUSUAL_ACCESS',
        severity: 'MEDIUM',
        source: log.ipAddress,
        details: `Access during unusual hours from ${log.userName}`,
      })),
      ...privilegeEscalation.map(log => ({
        type: 'PRIVILEGE_ESCALATION',
        severity: 'HIGH',
        source: log.userName,
        details: `Privilege modification detected: ${log.details}`,
      })),
    ];
  }

  private analyzeUserBehavior(logs: LogEntry[]) {
    const userActions = new Map<string, Set<string>>();
    const userSessions = new Map<string, number>();
    const userPatterns = new Map<string, any>();

    logs.forEach(log => {
      // Analizar acciones por usuario
      if (!userActions.has(log.userId)) {
        userActions.set(log.userId, new Set());
      }
      userActions.get(log.userId)!.add(log.action);

      // Analizar sesiones
      if (log.action === 'LOGIN') {
        userSessions.set(log.userId, (userSessions.get(log.userId) || 0) + 1);
      }

      // Detectar patrones de comportamiento
      const pattern = this.detectUserPattern(log);
      if (pattern) {
        userPatterns.set(log.userId, pattern);
      }
    });

    return {
      userActions: Object.fromEntries(
        Array.from(userActions.entries()).map(([user, actions]) => [
          user,
          Array.from(actions),
        ])
      ),
      sessionFrequency: Object.fromEntries(userSessions),
      behaviorPatterns: Object.fromEntries(userPatterns),
    };
  }

  private analyzePerformanceMetrics(logs: LogEntry[]) {
    const responseTimesByEndpoint = new Map<string, number[]>();
    const errorRatesByEndpoint = new Map<string, number>();
    const resourceUsage = new Map<string, number>();

    logs.forEach(log => {
      if (log.metadata?.responseTime) {
        const endpoint = log.metadata.endpoint;
        if (!responseTimesByEndpoint.has(endpoint)) {
          responseTimesByEndpoint.set(endpoint, []);
        }
        responseTimesByEndpoint.get(endpoint)!.push(log.metadata.responseTime);
      }

      if (log.severity === 'error') {
        const endpoint = log.metadata?.endpoint || 'unknown';
        errorRatesByEndpoint.set(
          endpoint,
          (errorRatesByEndpoint.get(endpoint) || 0) + 1
        );
      }

      if (log.metadata?.resourceUsage) {
        Object.entries(log.metadata.resourceUsage).forEach(([resource, usage]) => {
          resourceUsage.set(
            resource,
            (resourceUsage.get(resource) || 0) + Number(usage)
          );
        });
      }
    });

    return {
      responseTimeMetrics: this.calculateMetrics(responseTimesByEndpoint),
      errorRates: Object.fromEntries(errorRatesByEndpoint),
      resourceUtilization: Object.fromEntries(resourceUsage),
    };
  }

  private detectAnomalies(logs: LogEntry[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const baselineMetrics = this.calculateBaselineMetrics(logs);

    // Detectar anomalías en volumen de actividad
    const volumeAnomalies = this.detectVolumeAnomalies(logs, baselineMetrics);
    anomalies.push(...volumeAnomalies);

    // Detectar anomalías en patrones de acceso
    const accessAnomalies = this.detectAccessAnomalies(logs, baselineMetrics);
    anomalies.push(...accessAnomalies);

    // Detectar anomalías en errores
    const errorAnomalies = this.detectErrorAnomalies(logs, baselineMetrics);
    anomalies.push(...errorAnomalies);

    return anomalies;
  }

  private calculateBaselineMetrics(logs: LogEntry[]) {
    // Implementar cálculo de métricas base
    return {};
  }

  private detectVolumeAnomalies(logs: LogEntry[], baseline: any): AnomalyDetection[] {
    // Implementar detección de anomalías de volumen
    return [];
  }

  private detectAccessAnomalies(logs: LogEntry[], baseline: any): AnomalyDetection[] {
    // Implementar detección de anomalías de acceso
    return [];
  }

  private detectErrorAnomalies(logs: LogEntry[], baseline: any): AnomalyDetection[] {
    // Implementar detección de anomalías de errores
    return [];
  }
}
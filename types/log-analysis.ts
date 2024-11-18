// Tipos base para el análisis de logs
export interface LogAnalysisData {
  timeBasedAnalysis: TimeBasedAnalysis;
  securityAnalysis: SecurityAnalysis;
  performanceAnalysis: PerformanceAnalysis;
  userAnalysis: UserAnalysis;
  anomalyAnalysis: AnomalyAnalysis;
}

// Análisis temporal
export interface TimeBasedAnalysis {
  hourlyDistribution: number[];
  dailyDistribution: number[];
  activityTrends: {
    date: string;
    count: number;
    type?: string;
  }[];
  peakHours: number[];
  quietHours: number[];
}

// Análisis de seguridad
export interface SecurityAnalysis {
  loginAttempts: {
    hour: number;
    success: number;
    failed: number;
  }[];
  eventDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  alerts: SecurityAlert[];
  suspiciousIPs: string[];
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  source?: string;
  metadata?: Record<string, any>;
}

// Análisis de rendimiento
export interface PerformanceAnalysis {
  responseTimes: {
    timestamp: string;
    average: number;
    p95: number;
    endpoint?: string;
  }[];
  resourceUsage: {
    timestamp: string;
    cpu: number;
    memory: number;
    disk?: number;
  }[];
  errorsByEndpoint: {
    endpoint: string;
    count: number;
    errorTypes?: Record<string, number>;
  }[];
}

// Análisis de usuarios
export interface UserAnalysis {
  userActivity: {
    user: string;
    actions: number;
    lastActive: string;
  }[];
  accessPatterns: {
    hour: number;
    weekday: number;
    weekend: number;
  }[];
  topActions: {
    action: string;
    count: number;
    percentage: number;
  }[];
}

// Análisis de anomalías
export interface AnomalyAnalysis {
  timeline: {
    timestamp: string;
    value: number;
    threshold: number;
    isAnomaly: boolean;
  }[];
  distribution: {
    type: string;
    count: number;
    severity: string;
  }[];
  alerts: AnomalyAlert[];
}

export interface AnomalyAlert {
  title: string;
  description: string;
  timestamp: string;
  confidence: number;
  affectedMetric: string;
  value: number;
  expectedRange: [number, number];
}
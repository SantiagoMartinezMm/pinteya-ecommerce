export enum AlertType {
  SECURITY = 'security',
  SYSTEM = 'system',
  PERFORMANCE = 'performance'
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  timestamp: number;
  source?: string;
  metadata?: Record<string, any>;
  onAction?: () => void;
}
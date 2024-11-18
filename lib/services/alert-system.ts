import { Subject } from 'rxjs';
import { AlertType, SystemAlert, AlertPriority } from '@/types';

export class AlertSystem {
  private static instance: AlertSystem;
  private alertSubject = new Subject<SystemAlert>();
  private activeAlerts: Map<string, SystemAlert> = new Map();

  private constructor() {
    this.initializeAlertProcessing();
  }

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  private initializeAlertProcessing() {
    this.alertSubject.subscribe(alert => {
      this.processAlert(alert);
    });
  }

  private processAlert(alert: SystemAlert) {
    if (this.shouldTriggerAlert(alert)) {
      this.activeAlerts.set(alert.id, alert);
      this.notifyUsers(alert);
    }
  }

  private shouldTriggerAlert(alert: SystemAlert): boolean {
    // Lógica de evaluación de alertas
    const existingAlert = this.activeAlerts.get(alert.id);
    if (!existingAlert) return true;

    return alert.priority > existingAlert.priority ||
           alert.timestamp - existingAlert.timestamp > 3600000; // 1 hora
  }

  public addAlert(alert: SystemAlert) {
    this.alertSubject.next(alert);
  }

  public getActiveAlerts(): SystemAlert[] {
    return Array.from(this.activeAlerts.values());
  }
}
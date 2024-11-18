import { SystemAlert } from '@/types/dashboard';

export class NotificationService {
  private static instance: NotificationService;
  private subscribers: Map<string, (alert: SystemAlert) => void> = new Map();
  private worker: ServiceWorker | null = null;

  private constructor() {
    this.initializeServiceWorker();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/notification-worker.js');
        this.worker = registration.active;
        
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'NOTIFICATION_CLICKED') {
            this.handleNotificationClick(event.data.alert);
          }
        });
      } catch (error) {
        console.error('Error registering service worker:', error);
      }
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  public async sendNotification(alert: SystemAlert) {
    if (!this.worker || Notification.permission !== 'granted') {
      return;
    }

    const notification = {
      title: alert.title,
      options: {
        body: alert.description,
        icon: '/notification-icon.png',
        badge: '/badge-icon.png',
        tag: alert.id,
        data: alert,
        actions: [
          { action: 'view', title: 'Ver detalles' },
          { action: 'dismiss', title: 'Descartar' }
        ]
      }
    };

    this.worker.postMessage({
      type: 'SHOW_NOTIFICATION',
      notification
    });
  }

  private handleNotificationClick(alert: SystemAlert) {
    // Implementar lógica de navegación o acción específica
  }
}
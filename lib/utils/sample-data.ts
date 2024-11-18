import { Visualization } from '@/types/dashboard';

export function generateSampleData(viz: Visualization): any {
  switch (viz.type) {
    case 'funnel':
      return [
        { name: 'Impresiones', value: 100 },
        { name: 'Clics', value: 80 },
        { name: 'Visitas', value: 60 },
        { name: 'Registros', value: 40 },
        { name: 'Compras', value: 20 },
      ];
    case 'heatmap':
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        values: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          count: Math.floor(Math.random() * 10),
        })),
      };
    // Agregar más casos según sea necesario
    default:
      return [];
  }
}
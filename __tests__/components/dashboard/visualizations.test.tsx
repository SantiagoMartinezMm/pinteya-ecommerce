import { render, screen } from '@testing-library/react';
import { MetricsFunnel, MetricsHeatmap } from '@/components/admin/dashboard/AdvancedVisualizations';
import { VisualizationConfigSchema } from '@/types/dashboard';

describe('Dashboard Visualizations', () => {
  it('validates visualization config correctly', () => {
    const validConfig = {
      type: 'funnel',
      title: 'Test Funnel',
      dataKey: 'value'
    };

    const result = VisualizationConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('renders MetricsFunnel with valid props', () => {
    const props = {
      data: [
        { name: 'A', value: 100 },
        { name: 'B', value: 80 }
      ],
      config: {
        type: 'funnel',
        title: 'Test Funnel',
        dataKey: 'value'
      }
    };

    render(<MetricsFunnel {...props} />);
    expect(screen.getByText('Test Funnel')).toBeInTheDocument();
  });
});
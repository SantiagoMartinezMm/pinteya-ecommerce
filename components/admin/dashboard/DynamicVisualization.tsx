import { Visualization } from '@/types/dashboard';
import { MetricsFunnel } from './AdvancedVisualizations';
import { MetricsHeatmap } from './AdvancedVisualizations';
import { MetricsBubble } from './AdvancedVisualizations';
import { CustomRadar } from './CustomVisualizations';
import { withErrorBoundary } from '@/components/hocs/withErrorBoundary';

interface DynamicVisualizationProps {
  config: Visualization;
  data: any; // Tipado específico según el tipo de visualización
}

const DynamicVisualizationBase: React.FC<DynamicVisualizationProps> = ({ config, data }) => {
  const renderVisualization = () => {
    switch (config.type) {
      case 'funnel':
        return <MetricsFunnel data={data} config={config} />;
      case 'heatmap':
        return <MetricsHeatmap data={data} config={config} />;
      case 'bubble':
        return <MetricsBubble data={data} config={config} />;
      case 'radar':
        return <CustomRadar data={data} config={config} />;
      default:
        return <div>Tipo de visualización no soportado: {config.type}</div>;
    }
  };

  return renderVisualization();
};

export const DynamicVisualization = withErrorBoundary(DynamicVisualizationBase);
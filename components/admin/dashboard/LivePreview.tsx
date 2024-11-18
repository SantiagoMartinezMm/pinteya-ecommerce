import { useEffect, useState } from 'react';
import { DashboardTemplate } from '@/types/dashboard';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { DynamicVisualization } from './DynamicVisualization';
import { generateSampleData } from '@/lib/utils/sample-data';
import { GridLayout } from '@/components/ui/grid-layout';

interface LivePreviewProps {
  template: DashboardTemplate;
}

export function LivePreview({ template }: LivePreviewProps) {
  const [layouts, setLayouts] = useState(template.config.layout);
  const updateTemplate = useDashboardStore((state) => state.updateTemplate);

  const handleLayoutChange = (newLayout: any) => {
    setLayouts(newLayout);
    updateTemplate({
      ...template,
      config: {
        ...template.config,
        layout: newLayout,
      },
    });
  };

  return (
    <div className="w-full h-full min-h-[600px] bg-background/50 rounded-lg p-4">
      <GridLayout
        className="layout"
        layout={layouts}
        cols={12}
        rowHeight={30}
        width={1200}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {template.config.visualizations.map((viz, index) => (
          <div key={viz.id} className="bg-card rounded-lg shadow-sm">
            <div className="drag-handle p-2 border-b cursor-move">
              <h3 className="text-sm font-medium">{viz.title}</h3>
            </div>
            <div className="p-4">
              <DynamicVisualization
                config={viz}
                data={generateSampleData(viz)}
              />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
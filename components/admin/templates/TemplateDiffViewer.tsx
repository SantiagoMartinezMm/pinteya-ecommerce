"use client";

import { useEffect, useState } from 'react';
import { DashboardTemplate, TemplateVersion } from '@/types/dashboard';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { diffJson, Change } from 'diff';
import ReactDiffViewer from 'react-diff-viewer';

export function TemplateDiffViewer({
  oldVersion,
  newVersion
}: {
  oldVersion: TemplateVersion;
  newVersion: TemplateVersion;
}) {
  const [diffSections, setDiffSections] = useState<{
    metrics: Change[];
    visualizations: Change[];
    layout: Change[];
  }>({
    metrics: [],
    visualizations: [],
    layout: []
  });

  useEffect(() => {
    computeDiffs();
  }, [oldVersion, newVersion]);

  const computeDiffs = () => {
    setDiffSections({
      metrics: diffJson(
        oldVersion.template.config.metrics,
        newVersion.template.config.metrics
      ),
      visualizations: diffJson(
        oldVersion.template.config.visualizations,
        newVersion.template.config.visualizations
      ),
      layout: diffJson(
        oldVersion.template.config.layout,
        newVersion.template.config.layout
      )
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Cambios en la Plantilla</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Versión Anterior</h4>
            <p className="text-sm text-muted-foreground">
              {oldVersion.timestamp}
            </p>
            <p className="text-sm text-muted-foreground">
              Autor: {oldVersion.author}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Nueva Versión</h4>
            <p className="text-sm text-muted-foreground">
              {newVersion.timestamp}
            </p>
            <p className="text-sm text-muted-foreground">
              Autor: {newVersion.author}
            </p>
          </div>
        </div>

        <ScrollArea className="h-[600px] mt-6">
          <div className="space-y-6">
            <section>
              <h4 className="text-sm font-medium mb-2">Métricas</h4>
              <ReactDiffViewer
                oldValue={JSON.stringify(oldVersion.template.config.metrics, null, 2)}
                newValue={JSON.stringify(newVersion.template.config.metrics, null, 2)}
                splitView={true}
                hideLineNumbers={false}
                showDiffOnly={false}
                useDarkTheme={true}
                styles={{
                  variables: {
                    dark: {
                      diffViewerBackground: '#1a1b1e',
                      diffViewerColor: '#fff'
                    }
                  }
                }}
              />
            </section>

            <section>
              <h4 className="text-sm font-medium mb-2">Visualizaciones</h4>
              <ReactDiffViewer
                oldValue={JSON.stringify(oldVersion.template.config.visualizations, null, 2)}
                newValue={JSON.stringify(newVersion.template.config.visualizations, null, 2)}
                splitView={true}
                hideLineNumbers={false}
                showDiffOnly={false}
                useDarkTheme={true}
              />
            </section>

            <section>
              <h4 className="text-sm font-medium mb-2">Layout</h4>
              <ReactDiffViewer
                oldValue={JSON.stringify(oldVersion.template.config.layout, null, 2)}
                newValue={JSON.stringify(newVersion.template.config.layout, null, 2)}
                splitView={true}
                hideLineNumbers={false}
                showDiffOnly={false}
                useDarkTheme={true}
              />
            </section>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
"use client";

import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { DashboardTemplate } from '@/types/dashboard';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiffEditor } from '@monaco-editor/react';

export function LiveTemplatePreview({
  originalTemplate,
  modifiedTemplate,
  onTemplateChange
}: {
  originalTemplate: DashboardTemplate;
  modifiedTemplate: DashboardTemplate;
  onTemplateChange: (template: DashboardTemplate) => void;
}) {
  const [currentTab, setCurrentTab] = useState('visual');
  const [debouncedTemplate] = useDebounce(modifiedTemplate, 500);

  const [diffViewOptions, setDiffViewOptions] = useState({
    renderSideBySide: true,
    originalEditable: false,
  });

  useEffect(() => {
    // Actualizar la vista previa cuando cambie la plantilla
    updatePreview(debouncedTemplate);
  }, [debouncedTemplate]);

  const updatePreview = async (template: DashboardTemplate) => {
    try {
      // Validar la plantilla antes de actualizar
      await validateTemplate(template);
      onTemplateChange(template);
    } catch (error) {
      console.error('Error validating template:', error);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <Card className="p-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList>
            <TabsTrigger value="visual">Vista Visual</TabsTrigger>
            <TabsTrigger value="code">Código</TabsTrigger>
            <TabsTrigger value="diff">Diferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="visual">
            <ScrollArea className="h-[600px]">
              <VisualPreview template={modifiedTemplate} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="code">
            <ScrollArea className="h-[600px]">
              <CodePreview
                template={modifiedTemplate}
                onChange={(newValue) => {
                  try {
                    const parsed = JSON.parse(newValue);
                    onTemplateChange(parsed);
                  } catch (error) {
                    console.error('Invalid JSON:', error);
                  }
                }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="diff">
            <ScrollArea className="h-[600px]">
              <DiffEditor
                original={JSON.stringify(originalTemplate, null, 2)}
                modified={JSON.stringify(modifiedTemplate, null, 2)}
                language="json"
                theme="vs-dark"
                options={diffViewOptions}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Vista Previa en Tiempo Real</h3>
        <LivePreview template={debouncedTemplate} />
      </Card>
    </div>
  );
}

function VisualPreview({ template }: { template: DashboardTemplate }) {
  return (
    <div className="space-y-4">
      {template.config.visualizations.map((viz, index) => (
        <div key={index} className="p-4 border rounded">
          <h4 className="font-medium">{viz.title}</h4>
          <pre className="mt-2 text-sm">
            {JSON.stringify(viz.config, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function CodePreview({
  template,
  onChange
}: {
  template: DashboardTemplate;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full h-full">
      <Editor
        value={JSON.stringify(template, null, 2)}
        language="json"
        theme="vs-dark"
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          folding: true,
          formatOnPaste: true,
          formatOnType: true
        }}
      />
    </div>
  );
}

function LivePreview({ template }: { template: DashboardTemplate }) {
  return (
    <div className="space-y-4">
      {/* Implementar la vista previa real del dashboard */}
      {template.config.visualizations.map((viz, index) => (
        <DynamicVisualization
          key={index}
          config={viz}
          data={generateSampleData(viz)}
        />
      ))}
    </div>
  );
}
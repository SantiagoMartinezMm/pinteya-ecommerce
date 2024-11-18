"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { DashboardTemplate } from '@/types/dashboard';

export function InteractivePreview({
  template,
  onUpdate
}: {
  template: DashboardTemplate;
  onUpdate: (template: DashboardTemplate) => void;
}) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const bind = useGesture({
    onDrag: ({ movement: [mx, my] }) => {
      setPosition({ x: mx, y: my });
    },
    onPinch: ({ offset: [s] }) => {
      setScale(s);
    }
  });

  return (
    <div className="relative w-full h-full overflow-hidden" {...bind()}>
      <motion.div
        className="absolute inset-0"
        style={{
          scale,
          x: position.x,
          y: position.y
        }}
      >
        <div className="grid gap-4 p-4">
          {template.config.visualizations.map((viz, index) => (
            <InteractiveVisualization
              key={index}
              visualization={viz}
              isActive={activeSection === viz.id}
              onActivate={() => setActiveSection(viz.id)}
              onUpdate={(updates) => {
                const newTemplate = {
                  ...template,
                  config: {
                    ...template.config,
                    visualizations: template.config.visualizations.map(v =>
                      v.id === viz.id ? { ...v, ...updates } : v
                    )
                  }
                };
                onUpdate(newTemplate);
              }}
            />
          ))}
        </div>
      </motion.div>

      <PreviewControls
        onReset={() => {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }}
        onZoomIn={() => setScale(scale * 1.2)}
        onZoomOut={() => setScale(scale * 0.8)}
      />

      <AnimatePresence>
        {activeSection && (
          <VisualizationEditor
            visualization={template.config.visualizations.find(
              v => v.id === activeSection
            )}
            onClose={() => setActiveSection(null)}
            onUpdate={(updates) => {
              const newTemplate = {
                ...template,
                config: {
                  ...template.config,
                  visualizations: template.config.visualizations.map(v =>
                    v.id === activeSection ? { ...v, ...updates } : v
                  )
                }
              };
              onUpdate(newTemplate);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InteractiveVisualization({
  visualization,
  isActive,
  onActivate,
  onUpdate
}) {
  const [isDragging, setIsDragging] = useState(false);

  const bind = useGesture({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDrag: ({ movement: [mx, my], first, last }) => {
      if (last) {
        onUpdate({
          position: {
            x: visualization.position.x + mx,
            y: visualization.position.y + my
          }
        });
      }
    }
  });

  return (
    <motion.div
      className={`relative p-4 rounded-lg border ${
        isActive ? 'border-primary' : 'border-border'
      }`}
      layout
      layoutId={visualization.id}
      {...bind()}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !isDragging && onActivate()}
    >
      <DynamicVisualization
        config={visualization}
        isInteractive={true}
      />
    </motion.div>
  );
}
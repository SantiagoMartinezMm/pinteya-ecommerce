import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { DashboardTemplate, Visualization, Metric } from '@/types/dashboard';

interface DashboardState {
  templates: DashboardTemplate[];
  activeTemplate: DashboardTemplate | null;
  metrics: Metric[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  setActiveTemplate: (template: DashboardTemplate) => void;
  updateTemplate: (template: DashboardTemplate) => void;
  addVisualization: (visualization: Visualization) => void;
  removeVisualization: (id: string) => void;
  updateMetrics: (metrics: Metric[]) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set) => ({
        templates: [],
        activeTemplate: null,
        metrics: [],
        isLoading: false,
        error: null,

        setActiveTemplate: (template) => 
          set({ activeTemplate: template }),

        updateTemplate: (template) =>
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === template.id ? template : t
            ),
          })),

        addVisualization: (visualization) =>
          set((state) => ({
            activeTemplate: state.activeTemplate
              ? {
                  ...state.activeTemplate,
                  config: {
                    ...state.activeTemplate.config,
                    visualizations: [
                      ...state.activeTemplate.config.visualizations,
                      visualization,
                    ],
                  },
                }
              : null,
          })),

        removeVisualization: (id) =>
          set((state) => ({
            activeTemplate: state.activeTemplate
              ? {
                  ...state.activeTemplate,
                  config: {
                    ...state.activeTemplate.config,
                    visualizations: state.activeTemplate.config.visualizations.filter(
                      (v) => v.id !== id
                    ),
                  },
                }
              : null,
          })),

        updateMetrics: (metrics) => set({ metrics }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'dashboard-storage',
      }
    )
  )
);
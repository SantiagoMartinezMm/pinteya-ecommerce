import { z } from 'zod';
import { DashboardTemplate, TemplateCategory } from '@/types/dashboard';

export class TemplateManager {
  private static instance: TemplateManager;
  private templates: Map<string, DashboardTemplate> = new Map();
  private categories: TemplateCategory[] = [];

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  async loadBuiltinTemplates(): Promise<void> {
    // Cargar plantillas predefinidas
    const builtinTemplates = await import('@/data/dashboard-templates.json');
    builtinTemplates.default.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async saveTemplate(template: DashboardTemplate): Promise<void> {
    if (!this.validateTemplate(template)) {
      throw new Error('Invalid template structure');
    }

    this.templates.set(template.id, template);
    await this.persistTemplates();
  }

  async getTemplate(id: string): Promise<DashboardTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getAllTemplates(): Promise<DashboardTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByCategory(category: string): Promise<DashboardTemplate[]> {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }

  async applyTemplate(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    // Aplicar configuración del template
    const configManager = ConfigurationManager.getInstance();
    await configManager.saveConfiguration({
      ...template.config,
      lastModified: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  private validateTemplate(template: any): boolean {
    const templateSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      category: z.string(),
      thumbnail: z.string().optional(),
      config: z.object({
        metrics: z.array(z.any()),
        visualizations: z.array(z.any()),
        layout: z.array(z.any())
      }),
      metadata: z.record(z.any()).optional()
    });

    return templateSchema.safeParse(template).success;
  }

  private async persistTemplates(): Promise<void> {
    if (typeof window === 'undefined') return;

    localStorage.setItem(
      'dashboard_templates',
      JSON.stringify(Array.from(this.templates.entries()))
    );
  }
}
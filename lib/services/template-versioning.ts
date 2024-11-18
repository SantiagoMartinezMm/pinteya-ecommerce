import { z } from 'zod';
import { nanoid } from 'nanoid';
import { DashboardTemplate, TemplateVersion } from '@/types/dashboard';

export class TemplateVersionControl {
  private static instance: TemplateVersionControl;
  private versions: Map<string, TemplateVersion[]> = new Map();
  private readonly MAX_VERSIONS = 10;

  static getInstance(): TemplateVersionControl {
    if (!TemplateVersionControl.instance) {
      TemplateVersionControl.instance = new TemplateVersionControl();
    }
    return TemplateVersionControl.instance;
  }

  async createVersion(
    templateId: string,
    template: DashboardTemplate,
    comment: string
  ): Promise<string> {
    const versionId = nanoid();
    const version: TemplateVersion = {
      id: versionId,
      templateId,
      timestamp: new Date().toISOString(),
      comment,
      author: template.metadata?.author || 'unknown',
      template: this.cloneTemplate(template),
      changes: await this.detectChanges(templateId, template)
    };

    if (!this.versions.has(templateId)) {
      this.versions.set(templateId, []);
    }

    const versions = this.versions.get(templateId)!;
    versions.unshift(version);

    // Mantener límite de versiones
    if (versions.length > this.MAX_VERSIONS) {
      versions.pop();
    }

    await this.persistVersions(templateId);
    return versionId;
  }

  async getVersion(
    templateId: string,
    versionId: string
  ): Promise<TemplateVersion | null> {
    const versions = this.versions.get(templateId);
    return versions?.find(v => v.id === versionId) || null;
  }

  async getVersionHistory(
    templateId: string
  ): Promise<TemplateVersion[]> {
    return this.versions.get(templateId) || [];
  }

  async revertToVersion(
    templateId: string,
    versionId: string
  ): Promise<void> {
    const version = await this.getVersion(templateId, versionId);
    if (!version) throw new Error('Version not found');

    const templateManager = TemplateManager.getInstance();
    await templateManager.saveTemplate(version.template);
  }

  private async detectChanges(
    templateId: string,
    newTemplate: DashboardTemplate
  ): Promise<Record<string, any>> {
    const versions = this.versions.get(templateId);
    if (!versions?.length) return { type: 'initial' };

    const lastVersion = versions[0].template;
    return this.compareTemplates(lastVersion, newTemplate);
  }

  private compareTemplates(
    oldTemplate: DashboardTemplate,
    newTemplate: DashboardTemplate
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    // Comparar métricas
    const metricChanges = this.compareArrays(
      oldTemplate.config.metrics,
      newTemplate.config.metrics,
      'id'
    );
    if (Object.keys(metricChanges).length) {
      changes.metrics = metricChanges;
    }

    // Comparar visualizaciones
    const vizChanges = this.compareArrays(
      oldTemplate.config.visualizations,
      newTemplate.config.visualizations,
      'id'
    );
    if (Object.keys(vizChanges).length) {
      changes.visualizations = vizChanges;
    }

    // Comparar layout
    const layoutChanges = this.compareArrays(
      oldTemplate.config.layout,
      newTemplate.config.layout,
      'i'
    );
    if (Object.keys(layoutChanges).length) {
      changes.layout = layoutChanges;
    }

    return changes;
  }

  private compareArrays(
    oldArray: any[],
    newArray: any[],
    idKey: string
  ): Record<string, any> {
    const changes: Record<string, any> = {
      added: [],
      removed: [],
      modified: []
    };

    const oldMap = new Map(oldArray.map(item => [item[idKey], item]));
    const newMap = new Map(newArray.map(item => [item[idKey], item]));

    // Detectar elementos añadidos y modificados
    for (const [id, newItem] of newMap.entries()) {
      if (!oldMap.has(id)) {
        changes.added.push(newItem);
      } else if (JSON.stringify(oldMap.get(id)) !== JSON.stringify(newItem)) {
        changes.modified.push({
          old: oldMap.get(id),
          new: newItem
        });
      }
    }

    // Detectar elementos eliminados
    for (const [id, oldItem] of oldMap.entries()) {
      if (!newMap.has(id)) {
        changes.removed.push(oldItem);
      }
    }

    return changes;
  }

  private cloneTemplate(template: DashboardTemplate): DashboardTemplate {
    return JSON.parse(JSON.stringify(template));
  }

  private async persistVersions(templateId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const versions = this.versions.get(templateId);
    if (versions) {
      localStorage.setItem(
        `template_versions_${templateId}`,
        JSON.stringify(versions)
      );
    }
  }
}
import * as z from "zod";
import { type Role, type Permission } from "@/types";

export const advancedRoleValidations = {
  // Validación de jerarquía multinivel
  hierarchyValidation: (role: Role, parentRole: Role, allRoles: Role[]) => {
    const validateHierarchyChain = (currentRole: Role, chain: Set<string> = new Set()): boolean => {
      if (chain.has(currentRole.id)) {
        throw new Error("Ciclo de herencia detectado");
      }

      chain.add(currentRole.id);
      
      if (!currentRole.inheritsFrom?.length) {
        return true;
      }

      return currentRole.inheritsFrom.every(parentId => {
        const parent = allRoles.find(r => r.id === parentId);
        return parent && validateHierarchyChain(parent, new Set(chain));
      });
    };

    return validateHierarchyChain(role);
  },

  // Validación de conflictos de permisos
  permissionConflicts: (permissions: Permission[], role: Role): string[] => {
    const conflicts: string[] = [];
    const modulePermissions = new Map<string, Set<string>>();

    permissions.forEach(permission => {
      if (!modulePermissions.has(permission.module)) {
        modulePermissions.set(permission.module, new Set());
      }
      modulePermissions.get(permission.module)?.add(permission.action);
    });

    // Verificar conflictos por módulo
    modulePermissions.forEach((actions, module) => {
      if (actions.has('delete') && !actions.has('update')) {
        conflicts.push(`${module}: Delete requiere permiso de Update`);
      }
      if (actions.has('manage') && (!actions.has('create') || !actions.has('delete'))) {
        conflicts.push(`${module}: Manage requiere todos los permisos básicos`);
      }
    });

    return conflicts;
  },

  // Validación de restricciones temporales
  timeRestrictionsSchema: z.object({
    schedule: z.array(z.object({
      days: z.array(z.number().min(0).max(6)),
      timeWindows: z.array(z.object({
        start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      })),
    })),
    exceptions: z.array(z.object({
      date: z.date(),
      allowed: z.boolean(),
    })).optional(),
  }),

  // Validación de restricciones de IP
  ipRestrictionsSchema: z.object({
    allowedRanges: z.array(z.string().regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/)),
    blacklist: z.array(z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/)).optional(),
    maxSessionsPerIp: z.number().min(1).optional(),
  }),
};
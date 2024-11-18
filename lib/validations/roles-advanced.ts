import * as z from "zod";
import { MODULES } from "@/lib/constants";

// Tipos avanzados para roles y permisos
export interface PermissionLevel {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  manage: boolean;
}

export interface ModulePermissions {
  module: keyof typeof MODULES;
  levels: PermissionLevel;
  restrictions?: {
    timeRestricted?: boolean;
    ipRestricted?: boolean;
    maxItems?: number;
  };
}

// Schema avanzado para roles
export const roleValidationSchema = z.object({
  name: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder los 50 caracteres")
    .refine(async (name) => {
      // Verificar unicidad del nombre
      const exists = await checkRoleNameExists(name);
      return !exists;
    }, "Ya existe un rol con este nombre"),

  level: z.number()
    .min(0, "El nivel debe ser mayor o igual a 0")
    .max(100, "El nivel no puede exceder 100")
    .refine((level, ctx) => {
      // Verificar jerarquía
      const userLevel = ctx.parent.userLevel || 0;
      return level < userLevel;
    }, "No puedes crear roles de nivel igual o superior al tuyo"),

  modulePermissions: z.array(z.object({
    module: z.string(),
    levels: z.object({
      read: z.boolean(),
      create: z.boolean(),
      update: z.boolean(),
      delete: z.boolean(),
      manage: z.boolean(),
    }),
    restrictions: z.object({
      timeRestricted: z.boolean().optional(),
      ipRestricted: z.boolean().optional(),
      maxItems: z.number().optional(),
    }).optional(),
  }))
  .refine((permissions) => {
    // Validar que al menos tenga permisos de lectura en algún módulo
    return permissions.some(p => p.levels.read);
  }, "El rol debe tener al menos permisos de lectura en algún módulo"),

  inheritsFrom: z.array(z.string()).optional(),
  
  restrictions: z.object({
    maxUsers: z.number().optional(),
    timeWindows: z.array(z.object({
      days: z.array(z.number().min(0).max(6)),
      startTime: z.string(),
      endTime: z.string(),
    })).optional(),
    ipRanges: z.array(z.string()).optional(),
  }).optional(),
});

// Funciones de validación avanzadas
export const roleValidations = {
  // Validar permisos considerando herencia
  validatePermissionWithInheritance: async (
    userId: string,
    requiredPermission: string,
    module: string
  ): Promise<boolean> => {
    const userRoles = await getUserRoles(userId);
    const inheritedRoles = await getInheritedRoles(userRoles);
    const allRoles = [...userRoles, ...inheritedRoles];
    
    return allRoles.some(role => 
      hasPermission(role, requiredPermission, module)
    );
  },

  // Validar restricciones de tiempo
  validateTimeRestriction: (
    role: any,
    currentTime: Date = new Date()
  ): boolean => {
    if (!role.restrictions?.timeWindows?.length) return true;

    const currentDay = currentTime.getDay();
    const currentTimeStr = currentTime.toTimeString().slice(0, 5);

    return role.restrictions.timeWindows.some(window => {
      return window.days.includes(currentDay) &&
             window.startTime <= currentTimeStr &&
             window.endTime >= currentTimeStr;
    });
  },

  // Validar restricciones de IP
  validateIpRestriction: (
    role: any,
    ipAddress: string
  ): boolean => {
    if (!role.restrictions?.ipRanges?.length) return true;
    return role.restrictions.ipRanges.some(range => 
      isIpInRange(ipAddress, range)
    );
  },
};
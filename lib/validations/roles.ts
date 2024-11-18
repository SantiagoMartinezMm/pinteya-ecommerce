import * as z from "zod";

export const roleSchema = z.object({
  name: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder los 50 caracteres"),
  description: z.string()
    .max(200, "La descripción no puede exceder los 200 caracteres")
    .optional(),
  permissions: z.array(z.string())
    .min(1, "Debe seleccionar al menos un permiso"),
  level: z.number()
    .min(0, "El nivel debe ser mayor o igual a 0")
    .max(100, "El nivel no puede exceder 100"),
});

export const permissionSchema = z.object({
  code: z.string()
    .regex(/^[A-Z_]+$/, "El código debe contener solo mayúsculas y guiones bajos"),
  name: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder los 50 caracteres"),
  description: z.string()
    .max(200, "La descripción no puede exceder los 200 caracteres")
    .optional(),
  module: z.string()
    .min(1, "Debe seleccionar un módulo"),
});

export const validatePermissions = (userPermissions: string[], requiredPermissions: string[]) => {
  return requiredPermissions.every(permission =>
    userPermissions.includes(permission)
  );
};

export const validateRole = (userRole: string, requiredRoles: string[]) => {
  return requiredRoles.includes(userRole);
};

export const validateRoleHierarchy = (userRoleLevel: number, targetRoleLevel: number) => {
  return userRoleLevel > targetRoleLevel;
};
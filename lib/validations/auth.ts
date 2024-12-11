import * as z from "zod";

export const loginSchema = z.object({
  email: z.string()
    .email("Ingresa un email válido")
    .min(1, "El email es requerido"),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(50, "La contraseña no puede exceder los 50 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
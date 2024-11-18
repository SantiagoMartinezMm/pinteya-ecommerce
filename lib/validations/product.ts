import * as z from "zod";

export const productSchema = z.object({
  name: z.string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder los 100 caracteres"),
  
  slug: z.string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(100, "El slug no puede exceder los 100 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe contener solo letras minúsculas, números y guiones"),
  
  description: z.string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2000, "La descripción no puede exceder los 2000 caracteres"),
  
  categoryId: z.string()
    .min(1, "La categoría es requerida"),
  
  price: z.number()
    .min(0, "El precio debe ser mayor o igual a 0")
    .max(1000000, "El precio no puede exceder 1,000,000"),
  
  compareAtPrice: z.number()
    .min(0, "El precio de lista debe ser mayor o igual a 0")
    .max(1000000, "El precio de lista no puede exceder 1,000,000")
    .optional()
    .refine(
      (val, ctx) => !val || val > ctx.parent.price,
      "El precio de lista debe ser mayor al precio de venta"
    ),
  
  cost: z.number()
    .min(0, "El costo debe ser mayor o igual a 0")
    .max(1000000, "El costo no puede exceder 1,000,000")
    .optional()
    .refine(
      (val, ctx) => !val || val < ctx.parent.price,
      "El costo debe ser menor al precio de venta"
    ),
  
  sku: z.string()
    .max(50, "El SKU no puede exceder los 50 caracteres")
    .optional(),
  
  barcode: z.string()
    .regex(/^[0-9]+$/, "El código de barras debe contener solo números")
    .min(8, "El código de barras debe tener al menos 8 dígitos")
    .max(13, "El código de barras no puede exceder los 13 dígitos")
    .optional(),
  
  stock: z.number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock debe ser mayor o igual a 0"),
  
  weight: z.number()
    .min(0, "El peso debe ser mayor a 0")
    .optional(),
  
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
  
  seo: z.object({
    title: z.string()
      .max(60, "El título SEO no puede exceder los 60 caracteres")
      .optional(),
    description: z.string()
      .max(160, "La descripción SEO no puede exceder los 160 caracteres")
      .optional(),
    keywords: z.string()
      .max(200, "Las palabras clave no pueden exceder los 200 caracteres")
      .optional(),
  }).optional(),
  
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  
  variants: z.array(
    z.object({
      name: z.string().min(1, "El nombre de la variante es requerido"),
      values: z.array(z.string().min(1, "El valor de la variante es requerido")),
    })
  ).optional(),
});
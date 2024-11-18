import * as z from "zod";
import { isValidBarcode } from "@/lib/utils";

export const productExtendedSchema = z.object({
  // Información básica
  name: z.string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder los 100 caracteres")
    .refine(
      (name) => !/^\s|\s$/.test(name),
      "El nombre no puede comenzar ni terminar con espacios"
    ),
  
  slug: z.string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(100, "El slug no puede exceder los 100 caracteres")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug debe contener solo letras minúsculas, números y guiones"
    )
    .refine(
      async (slug) => {
        const response = await fetch(`/api/admin/products/check-slug?slug=${slug}`);
        const { available } = await response.json();
        return available;
      },
      "Este slug ya está en uso"
    ),
  
  description: z.string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2000, "La descripción no puede exceder los 2000 caracteres")
    .refine(
      (desc) => desc.split(' ').length >= 5,
      "La descripción debe contener al menos 5 palabras"
    ),

  // Precios y costos
  price: z.number()
    .min(0, "El precio debe ser mayor o igual a 0")
    .max(1000000, "El precio no puede exceder 1,000,000")
    .refine(
      (price) => Number.isInteger(price * 100),
      "El precio no puede tener más de 2 decimales"
    ),
  
  compareAtPrice: z.number()
    .optional()
    .refine(
      (price, ctx) => !price || price > ctx.parent.price,
      "El precio de lista debe ser mayor al precio de venta"
    )
    .refine(
      (price) => !price || Number.isInteger(price * 100),
      "El precio no puede tener más de 2 decimales"
    ),
  
  cost: z.number()
    .optional()
    .refine(
      (cost, ctx) => !cost || cost < ctx.parent.price,
      "El costo debe ser menor al precio de venta"
    ),

  // Inventario
  sku: z.string()
    .max(50, "El SKU no puede exceder los 50 caracteres")
    .regex(
      /^[A-Za-z0-9-_]+$/,
      "El SKU solo puede contener letras, números, guiones y guiones bajos"
    )
    .refine(
      async (sku) => {
        if (!sku) return true;
        const response = await fetch(`/api/admin/products/check-sku?sku=${sku}`);
        const { available } = await response.json();
        return available;
      },
      "Este SKU ya está en uso"
    )
    .optional(),
  
  barcode: z.string()
    .refine(
      (code) => !code || isValidBarcode(code),
      "El código de barras no es válido"
    )
    .optional(),
  
  stock: z.number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock debe ser mayor o igual a 0")
    .refine(
      (stock, ctx) => 
        stock > 0 || ctx.parent.status !== "ACTIVE",
      "No puedes activar un producto sin stock"
    ),

  // Dimensiones y peso
  dimensions: z.object({
    length: z.number()
      .min(0, "El largo debe ser mayor a 0")
      .refine(
        (val) => !val || val <= 300,
        "El largo no puede exceder los 300 cm"
      )
      .optional(),
    width: z.number()
      .min(0, "El ancho debe ser mayor a 0")
      .refine(
        (val) => !val || val <= 300,
        "El ancho no puede exceder los 300 cm"
      )
      .optional(),
    height: z.number()
      .min(0, "El alto debe ser mayor a 0")
      .refine(
        (val) => !val || val <= 300,
        "El alto no puede exceder los 300 cm"
      )
      .optional(),
  }).optional(),
  
  weight: z.number()
    .min(0, "El peso debe ser mayor a 0")
    .refine(
      (val) => !val || val <= 100,
      "El peso no puede exceder los 100 kg"
    )
    .optional(),

  // SEO
  seo: z.object({
    title: z.string()
      .max(60, "El título SEO no puede exceder los 60 caracteres")
      .refine(
        (title) => !title || title.split(' ').length >= 3,
        "El título SEO debe contener al menos 3 palabras"
      )
      .optional(),
    description: z.string()
      .max(160, "La descripción SEO no puede exceder los 160 caracteres")
      .refine(
        (desc) => !desc || desc.split(' ').length >= 5,
        "La descripción SEO debe contener al menos 5 palabras"
      )
      .optional(),
    keywords: z.string()
      .refine(
        (keywords) => 
          !keywords || keywords.split(',').length <= 10,
        "No puedes agregar más de 10 palabras clave"
      )
      .refine(
        (keywords) =>
          !keywords || keywords.split(',').every(k => k.trim().length > 0),
        "Las palabras clave no pueden estar vacías"
      )
      .optional(),
  }).optional(),

  // Imágenes
  images: z.array(z.any())
    .min(1, "Debes agregar al menos una imagen")
    .max(5, "No puedes agregar más de 5 imágenes")
    .refine(
      (images) => 
        images.every(img => 
          img instanceof File ? 
            img.size <= 5 * 1024 * 1024 : true
        ),
      "Las imágenes no pueden pesar más de 5MB"
    ),

  // Estado
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"])
    .refine(
      (status, ctx) => 
        status !== "ACTIVE" || 
        (ctx.parent.images?.length > 0 && 
         ctx.parent.stock > 0 && 
         ctx.parent.price > 0),
      "No puedes activar un producto sin imágenes, stock y precio"
    ),
});
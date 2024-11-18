import * as z from "zod";
import { isValidUrl, isValidHexColor, calculateMargin } from "@/lib/utils";

export const productSpecificValidations = {
  // Validaciones para variantes de color
  colorVariant: z.object({
    name: z.string(),
    hexCode: z.string()
      .refine(isValidHexColor, "Código de color inválido")
      .refine(async (hex) => {
        // Verificar contraste con el fondo
        const contrast = await calculateColorContrast(hex, "#FFFFFF");
        return contrast >= 4.5; // WCAG AA standard
      }, "El contraste del color no es suficiente"),
  }),

  // Validaciones para URLs de productos digitales
  digitalProduct: z.object({
    downloadUrl: z.string()
      .refine(isValidUrl, "URL inválida")
      .refine(async (url) => {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      }, "El archivo no está accesible"),
    fileSize: z.number()
      .max(500 * 1024 * 1024, "El archivo no puede superar los 500MB"),
  }),

  // Validaciones para márgenes y rentabilidad
  pricing: z.object({
    price: z.number(),
    cost: z.number(),
    minimumMargin: z.number().default(20),
  }).refine(
    (data) => calculateMargin(data.price, data.cost) >= data.minimumMargin,
    "El margen de ganancia es menor al mínimo requerido"
  ),

  // Validaciones para productos con fecha de caducidad
  perishableProduct: z.object({
    expirationDate: z.date()
      .refine(
        (date) => date > new Date(),
        "La fecha de caducidad debe ser futura"
      )
      .refine(
        (date) => {
          const minShelfLife = 30; // días
          const daysUntilExpiration = Math.floor(
            (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiration >= minShelfLife;
        },
        "El producto debe tener al menos 30 días de vida útil"
      ),
  }),

  // Validaciones para productos con restricciones de edad
  ageRestrictedProduct: z.object({
    minimumAge: z.number()
      .min(18, "La edad mínima debe ser 18 años")
      .max(100, "La edad máxima no puede superar los 100 años"),
    requiresIdVerification: z.boolean(),
  }).refine(
    (data) => !data.requiresIdVerification || data.minimumAge >= 18,
    "Los productos que requieren verificación de ID deben ser para mayores de 18"
  ),

  // Validaciones para productos configurables
  configurableProduct: z.object({
    options: z.array(z.object({
      name: z.string(),
      required: z.boolean(),
      values: z.array(z.string()).min(1, "Debe tener al menos un valor"),
    })).max(5, "No puede tener más de 5 opciones configurables"),
    combinations: z.array(z.record(z.string())),
  }).refine(
    (data) => {
      const requiredOptions = data.options.filter(opt => opt.required);
      return data.combinations.every(combo => 
        requiredOptions.every(opt => 
          Object.keys(combo).includes(opt.name)
        )
      );
    },
    "Todas las combinaciones deben incluir las opciones requeridas"
  ),

  // Validaciones para productos con garantía
  warrantyProduct: z.object({
    warrantyMonths: z.number()
      .min(1, "La garantía debe ser de al menos 1 mes")
      .max(120, "La garantía no puede exceder los 10 años"),
    warrantyTerms: z.string()
      .min(50, "Los términos de garantía son demasiado cortos")
      .max(1000, "Los términos de garantía son demasiado largos"),
  }),
};
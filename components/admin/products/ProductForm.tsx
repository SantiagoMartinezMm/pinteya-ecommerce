"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "./ImageUploader";
import { VariantsManager } from "./VariantsManager";
import { PricingSection } from "./PricingSection";
import { InventorySection } from "./InventorySection";
import { SeoSection } from "./SeoSection";
import { toast } from "sonner";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z.string().min(1, "El slug es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  price: z.number().min(0, "El precio debe ser mayor a 0"),
  compareAtPrice: z.number().optional(),
  cost: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stock: z.number().int().min(0, "El stock debe ser mayor o igual a 0"),
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
  }).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
});

export function ProductForm({ product, categories }) {
  const router = useRouter();
  const [images, setImages] = useState(product?.images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      status: "DRAFT",
      dimensions: {},
      seo: {},
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      // Agregar datos del formulario
      formData.append("data", JSON.stringify(data));
      
      // Agregar imágenes
      images.forEach((image, index) => {
        if (image instanceof File) {
          formData.append(`image-${index}`, image);
        } else {
          formData.append("existingImages", image.url);
        }
      });

      const response = await fetch(
        `/api/admin/products/${product?.id || "new"}`,
        {
          method: product ? "PUT" : "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Error al guardar el producto");

      toast.success(
        product ? "Producto actualizado" : "Producto creado"
      );
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      toast.error("Error al guardar el producto");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="images">Imágenes</TabsTrigger>
            <TabsTrigger value="pricing">Precios</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
            <TabsTrigger value="variants">Variantes</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
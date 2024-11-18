"use client";

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
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/admin/shared/ImageUpload";
import { useState } from "react";
import { toast } from "sonner";

const storeSettingsSchema = z.object({
  general: z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(500),
    email: z.string().email(),
    phone: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
  }),
  localization: z.object({
    currency: z.string(),
    timezone: z.string(),
    dateFormat: z.string(),
    measurementUnit: z.string(),
  }),
  shipping: z.object({
    freeShippingThreshold: z.number().min(0).optional(),
    defaultShippingFee: z.number().min(0),
    allowInternationalShipping: z.boolean(),
    restrictedCountries: z.array(z.string()).optional(),
  }),
  legal: z.object({
    termsAndConditions: z.string(),
    privacyPolicy: z.string(),
    returnPolicy: z.string(),
  }),
  social: z.object({
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    twitter: z.string().url().optional(),
    youtube: z.string().url().optional(),
  }),
});

export function StoreSettings() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof storeSettingsSchema>>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      general: {
        name: "",
        description: "",
        email: "",
        phone: "",
      },
      localization: {
        currency: "USD",
        timezone: "UTC",
        dateFormat: "DD/MM/YYYY",
        measurementUnit: "metric",
      },
      shipping: {
        defaultShippingFee: 0,
        allowInternationalShipping: false,
      },
      legal: {
        termsAndConditions: "",
        privacyPolicy: "",
        returnPolicy: "",
      },
      social: {},
    },
  });

  async function onSubmit(values: z.infer<typeof storeSettingsSchema>) {
    try {
      setIsSubmitting(true);
      // Aquí iría la llamada a la API para guardar los cambios
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
      toast.success("Configuraciones guardadas correctamente");
    } catch (error) {
      toast.error("Error al guardar las configuraciones");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="localization">Localización</TabsTrigger>
            <TabsTrigger value="shipping">Envíos</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            <TabsTrigger value="social">Redes sociales</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="general.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la tienda</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="general.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="general.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="general.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="general.logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value ? [field.value] : []}
                          onChange={(url) => field.onChange(url[0])}
                          maxFiles={1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="general.favicon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favicon</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value ? [field.value] : []}
                          onChange={(url) => field.onChange(url[0])}
                          maxFiles={1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>
          </TabsContent>

          {/* Resto de las tabs... */}
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
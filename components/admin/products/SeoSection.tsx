"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Control } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

interface SeoSectionProps {
  control: Control<any>;
}

export function SeoSection({ control }: SeoSectionProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <FormField
            control={control}
            name="seo.title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título SEO</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Título que aparecerá en los resultados de búsqueda
                </FormDescription>
                <div className="flex items-center gap-2">
                  <Badge variant={field.value?.length > 60 ? "destructive" : "secondary"}>
                    {field.value?.length || 0}/60
                  </Badge>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="seo.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción SEO</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormDescription>
                  Descripción que aparecerá en los resultados de búsqueda
                </FormDescription>
                <div className="flex items-center gap-2">
                  <Badge variant={field.value?.length > 160 ? "destructive" : "secondary"}>
                    {field.value?.length || 0}/160
                  </Badge>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="seo.keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Palabras clave</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Separa las palabras clave con comas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Vista previa en Google</h3>
        <div className="space-y-2">
          <p className="text-blue-600 text-xl hover:underline cursor-pointer">
            {control._formValues.seo?.title || control._formValues.name}
          </p>
          <p className="text-green-700 text-sm">
            www.tutienda.com/productos/{control._formValues.slug}
          </p>
          <p className="text-sm text-gray-600">
            {control._formValues.seo?.description || 
             control._formValues.description?.slice(0, 160)}
          </p>
        </div>
      </Card>
    </div>
  );
}
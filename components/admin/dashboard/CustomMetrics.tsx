"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const metricSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: z.enum(["counter", "gauge", "histogram"]),
  source: z.string(),
  aggregation: z.enum(["sum", "avg", "max", "min"]),
  interval: z.number().min(1),
  thresholds: z.object({
    warning: z.number(),
    critical: z.number(),
  }),
  enabled: z.boolean(),
  displayOptions: z.object({
    chartType: z.enum(["line", "bar", "area"]),
    color: z.string(),
    showLegend: z.boolean(),
  }),
});

export function CustomMetricsManager() {
  const [metrics, setMetrics] = useState<z.infer<typeof metricSchema>[]>([]);

  const form = useForm<z.infer<typeof metricSchema>>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      enabled: true,
      displayOptions: {
        chartType: "line",
        showLegend: true,
      },
    },
  });

  const onSubmit = (values: z.infer<typeof metricSchema>) => {
    setMetrics(prev => [...prev, values]);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Configurar Métricas</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Métrica Personalizada</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Métrica</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Métrica</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counter">Contador</SelectItem>
                      <SelectItem value="gauge">Medidor</SelectItem>
                      <SelectItem value="histogram">Histograma</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Más campos del formulario */}
            
            <Button type="submit">Guardar Métrica</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
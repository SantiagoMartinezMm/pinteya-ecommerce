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
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Control } from "react-hook-form";
import { useState } from "react";
import { Calculator } from "lucide-react";

interface PricingSectionProps {
  control: Control<any>;
}

export function PricingSection({ control }: PricingSectionProps) {
  const [showProfitCalculator, setShowProfitCalculator] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio de venta</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-6"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="compareAtPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio de lista</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-6"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Precio original antes del descuento
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <h3 className="font-medium">Calculadora de rentabilidad</h3>
          </div>
          <Switch
            checked={showProfitCalculator}
            onCheckedChange={setShowProfitCalculator}
          />
        </div>

        {showProfitCalculator && (
          <div className="space-y-4">
            <FormField
              control={control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo del producto</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-6"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ProfitCalculator control={control} />
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfitCalculator({ control }) {
  const watchPrice = control._formValues.price || 0;
  const watchCost = control._formValues.cost || 0;

  const profit = watchPrice - watchCost;
  const margin = watchCost > 0 ? (profit / watchPrice) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
      <div>
        <p className="text-sm text-muted-foreground">Ganancia</p>
        <p className="text-lg font-semibold">${profit.toFixed(2)}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Margen</p>
        <p className="text-lg font-semibold">{margin.toFixed(1)}%</p>
      </div>
    </div>
  );
}
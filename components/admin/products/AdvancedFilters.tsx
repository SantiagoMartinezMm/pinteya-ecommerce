"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Filter } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function AdvancedFilters({ onApplyFilters }) {
  const [filters, setFilters] = useState({
    priceRange: [0, 100000],
    stockRange: [0, 1000],
    dateRange: { from: null, to: null },
    brands: [],
    features: [],
    hasDiscount: false,
    inStock: true,
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros avanzados
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Filtros avanzados</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-4">
          {/* Rango de precios */}
          <div className="space-y-2">
            <Label>Rango de precios</Label>
            <Slider
              min={0}
              max={100000}
              step={1000}
              value={filters.priceRange}
              onValueChange={(value) =>
                setFilters({ ...filters, priceRange: value })
              }
            />
            <div className="flex justify-between text-sm">
              <span>${filters.priceRange[0]}</span>
              <span>${filters.priceRange[1]}</span>
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="space-y-2">
            <Label>Fecha de creación</Label>
            <DateRangePicker
              value={filters.dateRange}
              onChange={(range) =>
                setFilters({ ...filters, dateRange: range })
              }
            />
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <Label>Stock disponible</Label>
            <Slider
              min={0}
              max={1000}
              step={10}
              value={filters.stockRange}
              onValueChange={(value) =>
                setFilters({ ...filters, stockRange: value })
              }
            />
          </div>

          {/* Switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Con descuento</Label>
              <Switch
                checked={filters.hasDiscount}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, hasDiscount: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>En stock</Label>
              <Switch
                checked={filters.inStock}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, inStock: checked })
                }
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              className="w-full" 
              onClick={() => onApplyFilters(filters)}
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
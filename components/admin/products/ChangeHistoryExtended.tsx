"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  History,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Eye,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface ChangeHistoryExtendedProps {
  productId: string;
  onRevert?: (changeId: string) => void;
}

export function ChangeHistoryExtended({ 
  productId, 
  onRevert 
}: ChangeHistoryExtendedProps) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<Change[]>([]);
  const [filters, setFilters] = useState({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    user: "",
    field: "",
  });
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);

  useEffect(() => {
    fetchChanges();
  }, [productId]);

  useEffect(() => {
    applyFilters();
  }, [changes, filters]);

  const fetchChanges = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/history`);
      const data = await response.json();
      setChanges(data);
    } catch (error) {
      console.error("Error fetching changes:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...changes];

    if (filters.dateRange.from) {
      filtered = filtered.filter(
        (change) => new Date(change.timestamp) >= filters.dateRange.from!
      );
    }

    if (filters.dateRange.to) {
      filtered = filtered.filter(
        (change) => new Date(change.timestamp) <= filters.dateRange.to!
      );
    }

    if (filters.user) {
      filtered = filtered.filter(
        (change) => change.userName.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.field) {
      filtered = filtered.filter(
        (change) => change.changes.some(
          (c) => c.field.toLowerCase().includes(filters.field.toLowerCase())
        )
      );
    }

    setFilteredChanges(filtered);
  };

  const exportChanges = async () => {
    try {
      const response = await fetch(
        `/api/admin/products/${productId}/history/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changes: filteredChanges,
            format: "excel",
          }),
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-history-${productId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Historial exportado correctamente");
    } catch (error) {
      console.error("Error exporting changes:", error);
      toast.error("Error al exportar el historial");
    }
  };

  const compareChanges = () => {
    if (selectedChanges.length !== 2) return;

    const [change1, change2] = selectedChanges.map(
      (id) => changes.find((c) => c.id === id)!
    );

    setSelectedChange({
      ...change1,
      changes: change1.changes.map((c1) => {
        const c2 = change2.changes.find((c) => c.field === c1.field);
        return {
          ...c1,
          comparedValue: c2?.newValue,
        };
      }),
    });
  };

  return (
    <Card className="p-6">
      {/* Filtros */}
      <div className="flex items-center gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "P")} -{" "}
                    {format(filters.dateRange.to, "P")}
                  </>
                ) : (
                  format(filters.dateRange.from, "P")
                )
              ) : (
                "Seleccionar fechas"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={filters.dateRange}
              onSelect={(range) =>
                setFilters({ ...filters, dateRange: range || {} })
              }
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <Input
          placeholder="Filtrar por usuario"
          value={filters.user}
          onChange={(e) => setFilters({ ...filters, user: e.target.value })}
          className="max-w-[200px]"
        />

        <Input
          placeholder="Filtrar por campo"
          value={filters.field}
          onChange={(e) => setFilters({ ...filters, field: e.target.value })}
          className="max-w-[200px]"
        />

        <Button
          variant="outline"
          onClick={() =>
            setFilters({
              dateRange: {},
              user: "",
              field: "",
            })
          }
        >
          Limpiar filtros
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setCompareMode(!compareMode)}>
            {compareMode ? "Cancelar comparación" : "Comparar cambios"}
          </Button>

          <Button variant="outline" onClick={exportChanges}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Lista de cambios */}
      <div className="space-y-4">
        {filteredChanges.map((change) => (
          <div
            key={change.id}
            className={`
              p-4 rounded-lg border
              ${compareMode && selectedChanges.includes(change.id)
                ? "ring-2 ring-primary"
                : ""}
            `}
            onClick={() =>
              compareMode &&
              setSelectedChanges((prev) => {
                if (prev.includes(change.id)) {
                  return prev.filter((id) => id !== change.id);
                }
                if (prev.length < 2) {
                  return [...prev, change.id];
                }
                return [prev[1], change.id];
              })
            }
          >
            {/* ... resto del contenido del cambio ... */}
          </div>
        ))}
      </div>

      {/* Botones de comparación */}
      {compareMode && selectedChanges.length === 2 && (
        <div className="mt-4 flex justify-center">
          <Button onClick={compareChanges}>
            Comparar seleccionados
          </Button>
        </div>
      )}

      {/* Modal de comparación */}
      {/* ... código del modal de comparación ... */}
    </Card>
  );
}
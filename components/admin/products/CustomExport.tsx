import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";

interface ExportField {
  id: string;
  label: string;
  group: string;
}

const AVAILABLE_FIELDS: ExportField[] = [
  // Información básica
  { id: "name", label: "Nombre", group: "basic" },
  { id: "code", label: "Código", group: "basic" },
  { id: "price", label: "Precio", group: "basic" },
  { id: "stock", label: "Stock", group: "basic" },
  
  // Detalles
  { id: "description", label: "Descripción", group: "details" },
  { id: "features", label: "Características", group: "details" },
  { id: "dimensions", label: "Dimensiones", group: "details" },
  { id: "weight", label: "Peso", group: "details" },
  
  // Métricas
  { id: "views", label: "Vistas", group: "metrics" },
  { id: "sales", label: "Ventas", group: "metrics" },
  { id: "revenue", label: "Ingresos", group: "metrics" },
  { id: "conversion_rate", label: "Tasa de conversión", group: "metrics" },
  
  // Historial
  { id: "created_at", label: "Fecha de creación", group: "history" },
  { id: "updated_at", label: "Última actualización", group: "history" },
  { id: "price_history", label: "Historial de precios", group: "history" },
  { id: "stock_history", label: "Historial de stock", group: "history" },
];

export function CustomExport({ onExport }) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [format, setFormat] = useState<"csv" | "excel" | "json">("excel");

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/products/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: selectedFields,
          format,
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export.${format}`;
      a.click();
      
      toast.success("Exportación completada");
    } catch (error) {
      toast.error("Error al exportar");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar productos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campos agrupados */}
          {["basic", "details", "metrics", "history"].map((group) => (
            <div key={group} className="space-y-2">
              <h3 className="font-medium capitalize">{group}</h3>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_FIELDS.filter(f => f.group === group).map((field) => (
                  <div key={field.id} className="flex items-center space-x-2"></div>
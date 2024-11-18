import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  Trash2,
  Copy,
  Download,
  Tag,
  Eye,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onAction: (action: string) => void;
}

export function BulkActions({ selectedCount, onAction }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
      <p className="text-sm font-medium">
        {selectedCount} productos seleccionados
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction("duplicate")}
        >
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction("archive")}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archivar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Más acciones
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones masivas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAction("updatePrice")}>
              <Tag className="h-4 w-4 mr-2" />
              Actualizar precios
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("export")}>
              <Download className="h-4 w-4 mr-2" />
              Exportar selección
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("show")}>
              <Eye className="h-4 w-4 mr-2" />
              Mostrar productos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("hide")}>
              <EyeOff className="h-4 w-4 mr-2" />
              Ocultar productos
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onAction("delete")}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
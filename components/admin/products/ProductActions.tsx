import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  BarChart2,
  Share2,
  History,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface ProductActionsProps {
  product: any;
  onAction: (action: string, productId: string) => Promise<void>;
}

export function ProductActions({ product, onAction }: ProductActionsProps) {
  const handleAction = async (action: string) => {
    try {
      await onAction(action, product.id);
      toast.success("Acción realizada con éxito");
    } catch (error) {
      toast.error("Error al realizar la acción");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Acciones del producto</DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleAction("duplicate")}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar producto
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleAction("updatePrice")}>
          <Tag className="h-4 w-4 mr-2" />
          Actualizar precio
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleAction("viewStats")}>
          <BarChart2 className="h-4 w-4 mr-2" />
          Ver estadísticas
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleAction("shareProduct")}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir producto
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleAction("viewHistory")}>
          <History className="h-4 w-4 mr-2" />
          Historial de cambios
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleAction(product.status === "ACTIVE" ? "hide" : "show")}>
          {product.status === "ACTIVE" ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Ocultar producto
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Mostrar producto
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleAction("archive")}>
          <Archive className="h-4 w-4 mr-2" />
          Archivar producto
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={() => handleAction("markLowStock")}
          className="text-yellow-600"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Marcar stock bajo
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleAction("delete")}
          className="text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar producto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
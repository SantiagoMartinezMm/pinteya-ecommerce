import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import Link from "next/link";

export function ProductsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Productos</h1>
        <p className="text-muted-foreground">
          Gestiona los productos de tu catálogo
        </p>
      </div>
      <div className="flex gap-4">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </Link>
      </div>
    </div>
  );
}
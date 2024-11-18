"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpDown, 
  Edit, 
  Trash2, 
  Eye,
  Archive,
  MoreVertical 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/admin/Pagination";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { fetchFilteredProducts } from "@/lib/data";

interface Column {
  id: string;
  label: string;
  sortable?: boolean;
}

const columns: Column[] = [
  { id: "name", label: "Producto", sortable: true },
  { id: "category", label: "Categoría", sortable: true },
  { id: "price", label: "Precio", sortable: true },
  { id: "stock", label: "Stock", sortable: true },
  { id: "status", label: "Estado", sortable: true },
  { id: "actions", label: "Acciones" },
];

export async function ProductsTable({
  initialSearchParams,
}: {
  initialSearchParams?: {
    search?: string;
    category?: string;
    status?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  };
}) {
  const products = await fetchFilteredProducts(initialSearchParams);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const currentSort = searchParams.get("sort") || "";
  const [field, order] = currentSort.split(":");

  const handleSort = (columnId: string) => {
    const newOrder = field === columnId && order === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams);
    params.set("sort", `${columnId}:${newOrder}`);
    router.push(`?${params.toString()}`);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? products.map(p => p.id) : []);
  };

  const handleSelectItem = (productId: string, checked: boolean) => {
    setSelectedItems(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedItems.length) return;

    try {
      await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          productIds: selectedItems
        }),
      });
      
      router.refresh();
      setSelectedItems([]);
    } catch (error) {
      console.error("Error en acción masiva:", error);
    }
  };

  return (
    <div className="space-y-4">
      {selectedItems.length > 0 && (
        <div className="bg-muted p-2 rounded-lg flex items-center justify-between">
          <p className="text-sm">
            {selectedItems.length} productos seleccionados
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("archive")}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archivar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction("delete")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.length === products.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column.id}>
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSort(column.id)}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.includes(product.id)}
                    onCheckedChange={(checked) => 
                      handleSelectItem(product.id, checked)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="rounded-md"
                    />
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.code}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell>{formatPrice(product.price)}</TableCell>
                <TableCell>
                  <Badge
                    variant={product.stock > 10 ? "default" : "destructive"}
                  >
                    {product.stock} unidades
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      product.status === "ACTIVE"
                        ? "default"
                        : product.status === "DRAFT"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link href={`/producto/${product.slug}`}>
                      <Button size="icon" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/products/${product.id}/edit`}>
                      <Button size="icon" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
        baseUrl="/admin/products"
      />
    </div>
  );
}
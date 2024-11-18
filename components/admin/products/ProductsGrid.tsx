import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Eye, MoreVertical } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductsGridProps {
  products: any[];
  pagination: any;
}

export function ProductsGrid({ products, pagination }: ProductsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden">
          <div className="relative aspect-square">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover"
            />
            <Badge
              className="absolute top-2 right-2"
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
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold truncate">{product.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {product.category.name}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="font-bold">
                ${product.price.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" asChild>
                  <Link href={`/producto/${product.slug}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <Link href={`/admin/products/${product.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Duplicar</DropdownMenuItem>
                    <DropdownMenuItem>Archivar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";
import { ProductsTable } from "./ProductsTable";
import { ProductsGrid } from "./ProductsGrid";

interface ViewToggleProps {
  products: any[];
  pagination: any;
}

export function ProductsView({ products, pagination }: ViewToggleProps) {
  const [view, setView] = useState<"grid" | "list">("list");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <ProductsTable products={products} pagination={pagination} />
      ) : (
        <ProductsGrid products={products} pagination={pagination} />
      )}
    </div>
  );
}
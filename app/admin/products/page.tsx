import { ProductsView } from "@/components/admin/products/ProductsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Productos | Admin",
  description: "Gestión de productos",
};

export default function ProductsPage() {
  return <ProductsView />;
}
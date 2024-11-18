import { ProductForm } from "@/components/admin/products/ProductForm";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = params.id === "new" 
    ? null 
    : await prisma.product.findUnique({
        where: { id: params.id },
        include: {
          category: true,
          images: true,
          tags: true,
        },
      });

  if (params.id !== "new" && !product) {
    notFound();
  }

  const categories = await prisma.category.findMany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {product ? "Editar producto" : "Nuevo producto"}
        </h1>
        <p className="text-muted-foreground">
          {product 
            ? "Actualiza la información del producto" 
            : "Crea un nuevo producto para tu catálogo"}
        </p>
      </div>

      <ProductForm 
        product={product}
        categories={categories}
      />
    </div>
  );
}
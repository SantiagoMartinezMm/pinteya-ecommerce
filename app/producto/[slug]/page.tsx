import { ProductClientLogic } from "@/components/ProductClientLogic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGallery } from "@/components/ProductGallery";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from 'next/link';
import { CreditCard, Truck, MapPin } from 'lucide-react';
import { RelatedProducts } from "@/components/RelatedProducts";
import { fetchProductSlugs } from "@/utils/fetchProductSlugs";

export async function generateStaticParams() {
  const slugs = await fetchProductSlugs();

  return slugs.map((slug: string) => ({
    slug,
  }));
}

async function fetchProductData(slug: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${slug}`);
  if (!response.ok) {
    throw new Error('Error al obtener el producto');
  }
  return response.json();
}

interface ProductPageParams {
  params: {
    slug: string;
  };
}

export default async function ProductPage({ params }: ProductPageParams) {
  const { slug } = params;
  const productData = await fetchProductData(slug);

  console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: "Productos", href: "/productos" },
            { label: productData.category, href: `/productos/${productData.category.toLowerCase()}` },
            { label: productData.name, href: "#", current: true }
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Product Images */}
          <div className="lg:col-span-2">
            <ProductGallery images={productData.images} />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{productData.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">SKU: {productData.sku}</Badge>
                <Badge variant="secondary">{productData.brand}</Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold">${productData.price.toLocaleString()}</span>
                {productData.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${productData.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Options */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Medios de pago</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span>12 cuotas sin interés de ${(productData.price / 12).toFixed(2)}</span>
                </div>
                <Link href="/medios-de-pago" className="text-sm text-primary hover:underline">
                  Ver todos los medios de pago
                </Link>
              </div>
            </Card>

            {/* Stock and Shipping */}
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <Truck className="h-5 w-5" />
                  <span>Envío gratis a todo el país</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>Retiro gratis en sucursal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Stock disponible: {productData.stock} unidades</span>
                </div>
              </div>
            </Card>

            {/* Add to Cart */}
            <ProductClientLogic product={productData} />

            {/* Product Description */}
            <div className="space-y-4">
              <h3 className="font-semibold">Descripción</h3>
              <p className="text-muted-foreground">{productData.description}</p>
              <div>
                <h4 className="font-semibold mb-2">Características:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {productData.features.map((feature: string) => (
                    <li key={feature} className="text-muted-foreground">{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts category={productData.category} currentProductId={productData.id} />
      </div>
    </div>
  );
}
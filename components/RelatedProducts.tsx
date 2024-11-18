import { ProductCard } from '@/components/ProductCard'

interface RelatedProductsProps {
  category: string
  currentProductId: string
}

export function RelatedProducts({ category, currentProductId }: RelatedProductsProps) {
  // In a real app, fetch related products based on category
  const relatedProducts = [
    {
      id: "lat-premium-10l",
      name: "Pintura Látex Premium 10L",
      code: "LAT-002",
      image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&h=300",
      price: 8999,
      description: "Pintura látex premium de alta cobertura para interiores y exteriores."
    },
    {
      id: "lat-premium-4l",
      name: "Pintura Látex Premium 4L",
      code: "LAT-003",
      image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&h=300",
      price: 4599,
      description: "Pintura látex premium de alta cobertura para interiores y exteriores."
    }
  ].filter(product => product.id !== currentProductId)

  if (!relatedProducts.length) return null

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  )
}
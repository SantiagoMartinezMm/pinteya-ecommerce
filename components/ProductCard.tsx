import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/store'

interface ProductCardProps {
  id: string
  name: string
  code: string
  image: string
  price: number
  description: string
}

export function ProductCard({ id, name, code, image, price, description }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="relative mb-4">
          <Image
            src={image}
            alt={name}
            width={300}
            height={300}
            className="w-full aspect-square object-cover rounded-md"
          />
          <Badge className="absolute top-2 right-2 bg-blue-600">
            Envío gratis
          </Badge>
        </div>
        <h3 className="font-semibold mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground mb-2">{code}</p>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">${price.toLocaleString()}</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => addItem({ id, name, price, quantity: 1 })}
          >
            Agregar al carrito
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
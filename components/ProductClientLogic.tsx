'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart } from 'lucide-react';
import { useCartStore } from "@/lib/store";

interface ProductClientLogicProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
  };
}

export function ProductClientLogic({ product }: ProductClientLogicProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center border rounded-md">
          <button
            className="px-3 py-2 hover:bg-muted"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            -
          </button>
          <span className="px-4 py-2 border-x">{quantity}</span>
          <button
            className="px-3 py-2 hover:bg-muted"
            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
          >
            +
          </button>
        </div>
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Agregar al carrito
        </Button>
        <Button variant="outline" size="icon">
          <Heart className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

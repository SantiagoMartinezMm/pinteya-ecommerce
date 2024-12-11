# Guía de Desarrollo

Esta guía proporciona información detallada sobre el desarrollo en PinteYa!

## Estructura del Proyecto

```
pinteya-ecommerce/
├── app/                    # App Router de Next.js
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Panel de administración
│   └── api/               # API Routes
├── components/            # Componentes React
│   ├── admin/            # Componentes del panel admin
│   ├── auth/             # Componentes de autenticación
│   └── ui/               # Componentes de UI reutilizables
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuraciones
├── public/              # Archivos estáticos
└── types/               # Definiciones de TypeScript
```

## Convenciones de Código

### Nombrado

```typescript
// Componentes
function ProductCard() { ... }  // PascalCase para componentes
function useProducts() { ... }  // camelCase para hooks
const fetchProducts = () => ... // camelCase para funciones

// Types e Interfaces
interface Product { ... }       // PascalCase para types
type ProductStatus = ...
```

### Imports

```typescript
// 1. Imports de React/Next.js
import { useState, useEffect } from 'react'
import Image from 'next/image'

// 2. Imports de librerías externas
import { motion } from 'framer-motion'

// 3. Imports internos
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/button'
```

## Estado Global

Utilizamos diferentes soluciones según el caso:

### Zustand para Estado Global

```typescript
import create from 'zustand'

interface CartStore {
  items: Product[]
  addItem: (product: Product) => void
}

export const useCartStore = create<CartStore>(set => ({
  items: [],
  addItem: product =>
    set(state => ({
      items: [...state.items, product],
    })),
}))
```

### React Query para Estado del Servidor

```typescript
import { useQuery } from '@tanstack/react-query'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })
}
```

## Manejo de Formularios

Utilizamos `react-hook-form` con `zod` para validación:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const schema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
})

export function ProductForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })
  // ...
}
```

## Estilos

### Tailwind CSS

Seguimos una estructura consistente:

```tsx
<div
  className="
  flex items-center justify-between  // Layout
  p-4 mb-2                          // Espaciado
  bg-white dark:bg-gray-800         // Colores
  rounded-lg shadow-sm              // Efectos
  hover:shadow-md transition-shadow // Interactividad
"
>
  {/* Contenido */}
</div>
```

### Componentes Shadcn/ui

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card"

export function ProductCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Producto</CardTitle>
        <CardDescription>Descripción</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Contenido */}
      </CardContent>
    </Card>
  )
}
```

## Testing

### Pruebas Unitarias con Jest

```typescript
import { render, screen } from '@testing-library/react'
import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard name="Test Product" price={100} />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })
})
```

### Pruebas E2E con Playwright

```typescript
import { test, expect } from '@playwright/test'

test('user can add product to cart', async ({ page }) => {
  await page.goto('/products')
  await page.click('[data-testid="add-to-cart"]')
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1')
})
```

## CI/CD

Utilizamos GitHub Actions para:

- Ejecutar pruebas
- Verificar tipos
- Linting
- Build de producción
- Despliegue automático

## Mejores Prácticas

1. **Performance**

   - Usar Image de Next.js para imágenes
   - Implementar lazy loading
   - Optimizar bundles

2. **Seguridad**

   - Validar inputs
   - Sanitizar datos
   - Usar CSRF tokens

3. **Accesibilidad**
   - Usar roles ARIA
   - Asegurar contraste de colores
   - Soportar navegación por teclado

## Recursos Útiles

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Tailwind CSS](https://tailwindcss.com/docs)
- [Componentes Shadcn/ui](https://ui.shadcn.com)

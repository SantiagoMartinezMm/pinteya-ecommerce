"use client"

import { useState } from 'react'
import Link from "next/link"
import Image from "next/image"
import { Search, MapPin, ArrowLeftRight, ShoppingCart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductCard } from "@/components/ProductCard"
import { AIChat } from "@/components/AIChat"

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')

  const products = [
    {
      id: "1",
      name: "Pintura Látex Premium",
      code: "LAT-001",
      image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&h=300",
      price: 5999,
      description: "Pintura látex de alta calidad para interiores y exteriores. Excelente cobertura y durabilidad."
    },
    {
      id: "2",
      name: "Esmalte Sintético",
      code: "ESM-002",
      image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&h=300",
      price: 4599,
      description: "Esmalte sintético brillante para maderas y metales. Alta resistencia a la intemperie."
    },
    {
      id: "3",
      name: "Impermeabilizante",
      code: "IMP-003",
      image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=300&h=300",
      price: 7899,
      description: "Impermeabilizante acrílico para techos y terrazas. Máxima protección contra filtraciones."
    },
    {
      id: "4",
      name: "Kit Rodillos Pro",
      code: "ROD-004",
      image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=300&h=300",
      price: 3299,
      description: "Kit profesional de rodillos para todo tipo de superficies. Incluye diferentes texturas."
    },
  ]

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'todos' || product.code.startsWith(selectedCategory.toUpperCase())
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <div className="w-full border-b py-2">
        <div className="container mx-auto px-4 flex justify-end gap-4 text-sm">
          <Link href="/devoluciones" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeftRight className="h-4 w-4" />
            Devoluciones
          </Link>
          <Link href="/ubicacion" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
            <MapPin className="h-4 w-4" />
            Ubicación
          </Link>
          <Link href="/tienda" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
            Tienda
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=150&h=60"
                alt="PinteYa!"
                width={150}
                height={60}
                className="h-12 w-auto"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/productos" className="text-sm font-medium hover:text-primary">
                Productos
              </Link>
              <Link href="/promociones" className="text-sm font-medium hover:text-primary">
                Promociones
              </Link>
              <Link href="/sorteo" className="text-sm font-medium hover:text-primary">
                Sorteo
              </Link>
              <Link href="/contacto" className="text-sm font-medium hover:text-primary">
                Contacto
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="w-full bg-[#FFD700] py-4 sticky top-[73px] z-40">
        <div className="container mx-auto px-4 flex gap-4">
          <div className="flex-1 flex gap-4">
            <Input
              type="search"
              placeholder="Buscar productos..."
              className="flex-1 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select 
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los productos</SelectItem>
                <SelectItem value="lat">Pinturas Látex</SelectItem>
                <SelectItem value="esm">Esmaltes</SelectItem>
                <SelectItem value="imp">Impermeabilizantes</SelectItem>
                <SelectItem value="rod">Herramientas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="default" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="bg-white gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>$0</span>
          </Button>
        </div>
      </div>

      <main>
        {/* Hero Banner */}
        <div className="relative bg-black text-white">
          <Image
            src="https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1920&h=600"
            alt="Promoción especial"
            width={1920}
            height={600}
            className="w-full h-[400px] object-cover opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-5xl font-bold mb-4">¡Gran sorteo!</h1>
              <p className="text-2xl mb-6">Gana un kit completo de pintura</p>
              <Button size="lg" className="bg-[#FFD700] text-black hover:bg-[#FFC700]">
                Participar ahora
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Productos recomendados para ti</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 PinteYa! Todos los derechos reservados.</p>
        </div>
      </footer>

      <AIChat />
    </div>
  )
}
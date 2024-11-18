"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'

interface ProductGalleryProps {
  images: string[]
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)

  return (
    <div className="space-y-4">
      <Card className="relative aspect-square overflow-hidden">
        <Image
          src={images[selectedImage]}
          alt="Product image"
          fill
          className="object-cover"
          priority
        />
      </Card>
      <div className="grid grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card
            key={image}
            className={`relative aspect-square cursor-pointer overflow-hidden ${
              selectedImage === index ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedImage(index)}
          >
            <Image
              src={image}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
            />
          </Card>
        ))}
      </div>
    </div>
  )
}
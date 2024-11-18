"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useFormContext, useWatch } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ProductPreviewAnimated() {
  const { control } = useFormContext();
  const [activeImage, setActiveImage] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const images = useWatch({ control, name: "images" });
  const name = useWatch({ control, name: "name" });
  const price = useWatch({ control, name: "price" });
  const compareAtPrice = useWatch({ control, name: "compareAtPrice" });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showZoom) return;
    
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setMousePosition({ x, y });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-2 gap-8">
        {/* Galería de imágenes */}
        <div className="space-y-4">
          <motion.div
            className="relative aspect-square rounded-lg overflow-hidden"
            onHoverStart={() => setShowZoom(true)}
            onHoverEnd={() => setShowZoom(false)}
            onMouseMove={handleMouseMove}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {images?.[activeImage] && (
                  <div
                    className={cn(
                      "w-full h-full bg-cover bg-no-repeat",
                      showZoom && "cursor-zoom-in"
                    )}
                    style={{
                      backgroundImage: `url(${
                        typeof images[activeImage] === "string"
                          ? images[activeImage]
                          : URL.createObjectURL(images[activeImage])
                      })`,
                      ...(showZoom && {
                        transform: "scale(1.5)",
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      }),
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2",
                    activeImage === index
                      ? "border-primary"
                      : "border-transparent"
                  )}
                >
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${
                        typeof image === "string"
                          ? image
                          : URL.createObjectURL(image)
                      })`,
                    }}
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold">{name || "Nombre del producto"}</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-3xl font-bold">
              ${price?.toFixed(2) || "0.00"}
            </span>
            {compareAtPrice > price && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl text-muted-foreground line-through"
              >
                ${compareAtPrice.toFixed(2)}
              </motion.span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-4"
          >
            <Button className="w-full" size="lg">
              Agregar al carrito
            </Button>

            <div className="grid grid-cols-3 gap-4 text-center">
              {["Envío gratis", "Stock disponible", "Garantía"].map(
                (feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: 0.3 + index * 0.1,
                    }}
                    className="p-3 rounded-lg bg-muted"
                  >
                    <p className="text-sm">{feature}</p>
                  </motion.div>
                )
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
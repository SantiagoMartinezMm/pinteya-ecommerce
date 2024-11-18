"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { 
  Package,
  Truck,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Share2
} from "lucide-react";

export function ProductPreviewMobile() {
  const { control } = useFormContext();
  
  const name = useWatch({ control, name: "name" });
  const description = useWatch({ control, name: "description" });
  const price = useWatch({ control, name: "price" });
  const compareAtPrice = useWatch({ control, name: "compareAtPrice" });
  const images = useWatch({ control, name: "images" });
  const stock = useWatch({ control, name: "stock" });
  const status = useWatch({ control, name: "status" });
  const dimensions = useWatch({ control, name: "dimensions" });
  const weight = useWatch({ control, name: "weight" });

  const [currentImage, setCurrentImage] = useState(0);

  const nextImage = () => {
    setCurrentImage((prev) => 
      prev === (images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImage((prev) => 
      prev === 0 ? (images?.length || 1) - 1 : prev - 1
    );
  };

  return (
    <div className="w-[375px] h-[667px] mx-auto border rounded-xl overflow-hidden bg-background">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {/* Imagen principal */}
          <div className="relative aspect-square">
            {images?.[currentImage] ? (
              <Image
                src={
                  typeof images[currentImage] === 'string' 
                    ? images[currentImage] 
                    : URL.createObjectURL(images[currentImage])
                }
                alt={name || "Product preview"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Sin imagen</p>
              </div>
            )}

            {images?.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={prevImage}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={nextImage}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {images?.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  className={`
                    relative w-16 aspect-square rounded-lg overflow-hidden
                    ${currentImage === index ? "ring-2 ring-primary" : ""}
                  `}
                  onClick={() => setCurrentImage(index)}
                >
                  <Image
                    src={
                      typeof image === 'string' 
                        ? image 
                        : URL.createObjectURL(image)
                    }
                    alt={`${name || "Product"} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Información del producto */}
          <div className="p-4 space-y-4">
            <div>
              <h1 className="text-xl font-bold">{name || "Nombre del producto"}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
                  {status === "ACTIVE" ? "Activo" : "Borrador"}
                </Badge>
                {stock <= 5 && stock > 0 && (
                  <Badge variant="warning">Últimas unidades</Badge>
                )}
                {stock === 0 && (
                  <Badge variant="destructive">Agotado</Badge>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatPrice(price || 0)}
              </span>
              {compareAtPrice > price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(compareAtPrice)}
                </span>
              )}
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="description">
                <AccordionTrigger>Descripción</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    {description || "Descripción del producto"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {(dimensions || weight) && (
                <AccordionItem value="specs">
                  <AccordionTrigger>Especificaciones</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      {dimensions && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>
                            {dimensions.length}x{dimensions.width}x{dimensions.height} cm
                          </span>
                        </div>
                      )}
                      {weight && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{weight} kg</span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            <Separator />

            {/* Información adicional */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="space-y-2">
                <Truck className="h-5 w-5 mx-auto" />
                <p>Envío gratis</p>
              </div>
              <div className="space-y-2">
                <Package className="h-5 w-5 mx-auto" />
                <p>Stock disponible</p>
              </div>
              <div className="space-y-2">
                <ShieldCheck className="h-5 w-5 mx-auto" />
                <p>Garantía</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button className="w-full" size="lg">
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
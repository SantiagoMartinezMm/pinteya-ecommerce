"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";

export function ProductPreview() {
  const { control } = useFormContext();
  
  // Observamos los cambios en los campos relevantes
  const name = useWatch({ control, name: "name" });
  const description = useWatch({ control, name: "description" });
  const price = useWatch({ control, name: "price" });
  const compareAtPrice = useWatch({ control, name: "compareAtPrice" });
  const images = useWatch({ control, name: "images" });
  const stock = useWatch({ control, name: "stock" });
  const status = useWatch({ control, name: "status" });

  return (
    <Card className="p-6">
      <Tabs defaultValue="desktop">
        <TabsList className="mb-4">
          <TabsTrigger value="desktop">Desktop</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
        </TabsList>

        <TabsContent value="desktop">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-8">
              {/* Galería de imágenes */}
              <div className="space-y-4">
                <div className="aspect-square relative rounded-lg overflow-hidden border">
                  {images?.[0] ? (
                    <Image
                      src={typeof images[0] === 'string' ? images[0] : URL.createObjectURL(images[0])}
                      alt={name || "Product preview"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground">Sin imagen</p>
                    </div>
                  )}
                </div>
                
                {images?.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.slice(1).map((image, index) => (
                      <div
                        key={index}
                        className="aspect-square relative rounded-lg overflow-hidden border"
                      >
                        <Image
                          src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                          alt={`${name || "Product"} ${index + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Información del producto */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">{name || "Nombre del producto"}</h1>
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
                  <span className="text-3xl font-bold">
                    {formatPrice(price || 0)}
                  </span>
                  {compareAtPrice > price && (
                    <span className="text-xl text-muted-foreground line-through">
                      {formatPrice(compareAtPrice)}
                    </span>
                  )}
                </div>

                <div className="prose prose-sm">
                  <p>{description || "Descripción del producto"}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mobile">
          <div className="max-w-sm mx-auto">
            {/* Versión móvil similar pero adaptada */}
            <div className="space-y-4">
              {/* ... contenido móvil ... */}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
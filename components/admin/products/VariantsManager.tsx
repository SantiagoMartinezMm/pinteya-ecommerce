"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, X, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Variant {
  id?: string;
  name: string;
  values: string[];
}

interface VariantCombination {
  id?: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  sku: string;
}

export function VariantsManager({ productId, variants: initialVariants = [] }) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [combinations, setCombinations] = useState<VariantCombination[]>([]);

  const addVariant = () => {
    setVariants([...variants, { name: "", values: [""] }]);
  };

  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
    updateCombinations(newVariants);
  };

  const updateVariantName = (index: number, name: string) => {
    const newVariants = [...variants];
    newVariants[index].name = name;
    setVariants(newVariants);
  };

  const addVariantValue = (variantIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex].values.push("");
    setVariants(newVariants);
    updateCombinations(newVariants);
  };

  const updateVariantValue = (
    variantIndex: number,
    valueIndex: number,
    value: string
  ) => {
    const newVariants = [...variants];
    newVariants[variantIndex].values[valueIndex] = value;
    setVariants(newVariants);
    updateCombinations(newVariants);
  };

  const removeVariantValue = (variantIndex: number, valueIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex].values.splice(valueIndex, 1);
    setVariants(newVariants);
    updateCombinations(newVariants);
  };

  const updateCombinations = (currentVariants: Variant[]) => {
    const generateCombinations = (
      variants: Variant[],
      current: Record<string, string> = {},
      index = 0
    ): Record<string, string>[] => {
      if (index === variants.length) {
        return [current];
      }

      const variant = variants[index];
      const combinations: Record<string, string>[] = [];

      variant.values.forEach((value) => {
        combinations.push(
          ...generateCombinations(
            variants,
            { ...current, [variant.name]: value },
            index + 1
          )
        );
      });

      return combinations;
    };

    const newCombinations = generateCombinations(currentVariants).map(
      (attributes) => ({
        attributes,
        price: 0,
        stock: 0,
        sku: "",
      })
    );

    setCombinations(newCombinations);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {variants.map((variant, variantIndex) => (
          <Card key={variantIndex} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Nombre de la variante (ej: Color, Talla)"
                  value={variant.name}
                  onChange={(e) =>
                    updateVariantName(variantIndex, e.target.value)
                  }
                />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeVariant(variantIndex)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {variant.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center gap-2">
                    <Input
                      placeholder="Valor de la variante"
                      value={value}
                      onChange={(e) =>
                        updateVariantValue(
                          variantIndex,
                          valueIndex,
                          e.target.value
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeVariantValue(variantIndex, valueIndex)
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addVariantValue(variantIndex)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar valor
                </Button>
              </div>
            </div>
          </Card>
        ))}

        <Button variant="outline" onClick={addVariant}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar variante
        </Button>
      </div>

      {combinations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Combinaciones de variantes</h3>
          <Table>
            <TableHeader>
              <TableRow>
                {variants.map((variant) => (
                  <TableHead key={variant.name}>{variant.name}</TableHead>
                ))}
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>SKU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinations.map((combination, index) => (
                <TableRow key={index}>
                  {variants.map((variant) => (
                    <TableCell key={variant.name}>
                      {combination.attributes[variant.name]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Input
                      type="number"
                      value={combination.price}
                      onChange={(e) => {
                        const newCombinations = [...combinations];
                        newCombinations[index].price = parseFloat(
                          e.target.value
                        );
                        setCombinations(newCombinations);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={combination.stock}
                      onChange={(e) => {
                        const newCombinations = [...combinations];
                        newCombinations[index].stock = parseInt(
                          e.target.value
                        );
                        setCombinations(newCombinations);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={combination.sku}
                      onChange={(e) => {
                        const newCombinations = [...combinations];
                        newCombinations[index].sku = e.target.value;
                        setCombinations(newCombinations);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
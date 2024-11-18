"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { History, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { diffJson } from "diff";

interface Change {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

interface ChangeHistoryProps {
  productId: string;
  onRevert?: (changeId: string) => void;
}

export function ChangeHistory({ productId, onRevert }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChanges();
  }, [productId]);

  const fetchChanges = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/history`);
      const data = await response.json();
      setChanges(data);
    } catch (error) {
      console.error("Error fetching changes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = async (changeId: string) => {
    if (!onRevert) return;
    
    try {
      await onRevert(changeId);
      await fetchChanges();
    } catch (error) {
      console.error("Error reverting change:", error);
    }
  };

  const renderFieldChange = (field: string, oldValue: any, newValue: any) => {
    switch (field) {
      case "price":
      case "compareAtPrice":
      case "cost":
        return (
          <div className="flex items-center gap-2">
            <span className="line-through text-muted-foreground">
              ${oldValue}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span>${newValue}</span>
          </div>
        );

      case "status":
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{oldValue}</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge>{newValue}</Badge>
          </div>
        );

      case "images":
        return (
          <span>
            {oldValue.length} → {newValue.length} imágenes
          </span>
        );

      default:
        if (typeof oldValue === "object" || typeof newValue === "object") {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedChange({ 
                ...changes.find(c => 
                  c.changes.some(ch => 
                    ch.field === field
                  )
                )!,
                changes: [{
                  field,
                  oldValue,
                  newValue
                }]
              })}
            >
              Ver cambios
            </Button>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <span className="line-through text-muted-foreground">
              {oldValue}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span>{newValue}</span>
          </div>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-medium">Historial de cambios</h3>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Cambios</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map((change) => (
            <TableRow key={change.id}>
              <TableCell>
                {formatDistanceToNow(new Date(change.timestamp), {
                  addSuffix: true,
                  locale: es
                })}
              </TableCell>
              <TableCell>{change.userName}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {change.changes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-medium">{c.field}:</span>
                      {renderFieldChange(c.field, c.oldValue, c.newValue)}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevert(change.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Revertir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedChange} onOpenChange={() => setSelectedChange(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del cambio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedChange?.changes.map((change, index) => {
              const diff = diffJson(change.oldValue, change.newValue);
              return (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium">{change.field}</h4>
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
                    {diff.map((part, i) => (
                      <span
                        key={i}
                        className={
                          part.added
                            ? "text-green-600"
                            : part.removed
                            ? "text-red-600 line-through"
                            : ""
                        }
                      >
                        {part.value}
                      </span>
                    ))}
                  </pre>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
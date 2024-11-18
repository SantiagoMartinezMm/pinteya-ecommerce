"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Plus, X } from "lucide-react";

interface SavedFilter {
  id: string;
  name: string;
  filters: any;
}

export function SavedFilters({ currentFilters, onApplyFilter }) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Cargar filtros guardados del localStorage
    const filters = localStorage.getItem("savedFilters");
    if (filters) {
      setSavedFilters(JSON.parse(filters));
    }
  }, []);

  const saveFilter = () => {
    if (!newFilterName.trim()) return;

    const newFilter = {
      id: Date.now().toString(),
      name: newFilterName,
      filters: currentFilters,
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    localStorage.setItem("savedFilters", JSON.stringify(updatedFilters));
    setNewFilterName("");
    setIsDialogOpen(false);
  };

  const deleteFilter = (id: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updatedFilters);
    localStorage.setItem("savedFilters", JSON.stringify(updatedFilters));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-medium">Filtros guardados</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Guardar filtro actual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guardar filtro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre del filtro"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
              />
              <Button onClick={saveFilter} className="w-full">
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {savedFilters.map((filter) => (
          <Badge
            key={filter.id}
            variant="secondary"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Bookmark className="h-3 w-3" />
            <span onClick={() => onApplyFilter(filter.filters)}>
              {filter.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFilter(filter.id);
              }}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
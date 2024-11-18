"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODULES } from "@/lib/constants";
import type { ModulePermissions, PermissionLevel } from "@/lib/validations/roles-advanced";

interface PermissionsManagerProps {
  value: ModulePermissions[];
  onChange: (permissions: ModulePermissions[]) => void;
  userLevel: number;
  inheritedPermissions?: ModulePermissions[];
}

export function PermissionsManager({
  value,
  onChange,
  userLevel,
  inheritedPermissions = [],
}: PermissionsManagerProps) {
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [showInherited, setShowInherited] = useState(true);

  const handlePermissionChange = (
    module: string,
    level: keyof PermissionLevel,
    checked: boolean
  ) => {
    const newPermissions = [...value];
    const moduleIndex = newPermissions.findIndex(p => p.module === module);

    if (moduleIndex === -1) {
      // Crear nuevo permiso de módulo
      newPermissions.push({
        module,
        levels: {
          read: level === "read" ? checked : false,
          create: level === "create" ? checked : false,
          update: level === "update" ? checked : false,
          delete: level === "delete" ? checked : false,
          manage: level === "manage" ? checked : false,
        },
      });
    } else {
      // Actualizar permiso existente
      newPermissions[moduleIndex] = {
        ...newPermissions[moduleIndex],
        levels: {
          ...newPermissions[moduleIndex].levels,
          [level]: checked,
        },
      };
    }

    // Validar conflictos
    const newConflicts = validatePermissionConflicts(newPermissions);
    setConflicts(newConflicts);

    if (newConflicts.length === 0) {
      onChange(newPermissions);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Permisos por módulo</h3>
          <Switch
            checked={showInherited}
            onCheckedChange={setShowInherited}
            label="Mostrar permisos heredados"
          />
        </div>

        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Se detectaron conflictos en los permisos seleccionados
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <Accordion type="single" collapsible>
            {Object.entries(MODULES).map(([moduleId, moduleName]) => (
              <AccordionItem key={moduleId} value={moduleId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{moduleName}</span>
                    {inheritedPermissions.some(p => p.module === moduleId) && (
                      <Badge variant="secondary">Heredado</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {Object.entries(PERMISSION_LEVELS).map(([level, label]) => (
                      <div
                        key={level}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            {label}
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getPermissionDescription(moduleId, level)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <Switch
                          checked={
                            value.find(p => p.module === moduleId)?.levels[level] ||
                            (showInherited &&
                              inheritedPermissions.some(
                                p => p.module === moduleId && p.levels[level]
                              ))
                          }
                          onCheckedChange={(checked) =>
                            handlePermissionChange(moduleId, level, checked)
                          }
                          disabled={
                            showInherited &&
                            inheritedPermissions.some(
                              p => p.module === moduleId && p.levels[level]
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>
    </Card>
  );
} 
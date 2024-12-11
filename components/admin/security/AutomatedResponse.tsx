"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Settings, Plus, Trash2 } from "lucide-react";

interface AutomatedRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    conditions: Record<string, any>;
  };
  actions: {
    type: string;
    config: Record<string, any>;
  }[];
  enabled: boolean;
  priority: number;
}

export function AutomatedResponse() {
  const [rules, setRules] = useState<AutomatedRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/admin/security/automated-rules");
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error("Error fetching automated rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/security/automated-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      setRules((prev) =>
        prev.map((rule) =>
          rule.id === ruleId ? { ...rule, enabled } : rule
        )
      );
    } catch (error) {
      console.error("Error updating rule:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Respuesta Automatizada</h3>
          <p className="text-sm text-muted-foreground">
            Configura reglas de respuesta automática a incidentes
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{rule.name}</h4>
                  <Badge variant="outline">Prioridad {rule.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {rule.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                />
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-medium mb-2">Condiciones</h5>
                <div className="space-y-2">
                  {Object.entries(rule.trigger.conditions).map(([key, value]) => (
                    <div
                      key={key}
                      className="text-sm p-2 bg-muted rounded-md flex justify-between"
                    >
                      <span>{key}</span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2">Acciones</h5>
                <div className="space-y-2">
                  {rule.actions.map((action, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 bg-muted rounded-md"
                    >
                      <div className="flex justify-between items-center">
                        <span>{action.type}</span>
                        <Badge variant="secondary">
                          {Object.keys(action.config).length} parámetros
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
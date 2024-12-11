"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Plus,
  Settings,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: "access" | "password" | "network" | "data" | "compliance";
  status: "active" | "draft" | "archived";
  priority: "low" | "medium" | "high";
  rules: PolicyRule[];
  compliance: {
    required: boolean;
    standard?: string;
    lastCheck?: string;
    status: "compliant" | "non_compliant" | "partial";
  };
  createdAt: string;
  updatedAt: string;
  version: string;
}

interface PolicyRule {
  id: string;
  condition: string;
  action: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export function SecurityPolicies() {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<SecurityPolicy | null>(
    null
  );
  const [showNewPolicyDialog, setShowNewPolicyDialog] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch("/api/admin/security/policies");
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePolicyStatus = async (
    policyId: string,
    newStatus: string
  ) => {
    try {
      await fetch(`/api/admin/security/policies/${policyId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchPolicies();
    } catch (error) {
      console.error("Error updating policy status:", error);
    }
  };

  if (loading) {
    return <div>Cargando políticas de seguridad...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Políticas de Seguridad
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las políticas y reglas de seguridad
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNewPolicyDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Política
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Métricas y estadísticas */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 p-6">
          <h4 className="text-sm font-medium mb-4">Políticas</h4>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedPolicy?.id === policy.id
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedPolicy(policy)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {policy.name}
                        </span>
                        <Badge
                          variant={
                            policy.status === "active"
                              ? "success"
                              : policy.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {policy.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {policy.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {policy.type}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      {policy.rules.length} reglas
                    </div>
                  </div>

                  {policy.compliance.required && (
                    <div className="mt-2">
                      <Badge
                        variant={
                          policy.compliance.status === "compliant"
                            ? "success"
                            : policy.compliance.status ===
                              "non_compliant"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {policy.compliance.standard}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="col-span-2 p-6">
          {selectedPolicy ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedPolicy.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Versión {selectedPolicy.version}
                  </p>
                </div>
                <Switch
                  checked={selectedPolicy.status === "active"}
                  onCheckedChange={(checked) =>
                    togglePolicyStatus(
                      selectedPolicy.id,
                      checked ? "active" : "draft"
                    )
                  }
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Reglas</h4>
                {selectedPolicy.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {rule.condition}
                      </div>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) =>
                          console.log("Toggle rule", checked)
                        }
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Acción: {rule.action}
                    </p>
                    {Object.entries(rule.parameters).length > 0 && (
                      <div className="bg-muted p-2 rounded-md">
                        <pre className="text-sm">
                          {JSON.stringify(
                            rule.parameters,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedPolicy.compliance.required && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Cumplimiento
                  </h4>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {selectedPolicy.compliance.standard}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Última verificación:{" "}
                          {selectedPolicy.compliance.lastCheck
                            ? new Date(
                                selectedPolicy.compliance.lastCheck
                              ).toLocaleString()
                            : "No verificado"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          selectedPolicy.compliance.status ===
                          "compliant"
                            ? "success"
                            : selectedPolicy.compliance.status ===
                              "non_compliant"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {selectedPolicy.compliance.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              Selecciona una política para ver sus detalles
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
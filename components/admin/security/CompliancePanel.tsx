"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  Clock,
  ArrowUpRight,
} from "lucide-react";

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  categories: ComplianceCategory[];
  overallScore: number;
  lastAssessment?: string;
  nextAssessment?: string;
  status: "compliant" | "partial" | "non_compliant";
}

interface ComplianceCategory {
  id: string;
  name: string;
  controls: ComplianceControl[];
  score: number;
}

interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  status: "passed" | "failed" | "warning" | "not_applicable";
  evidence?: string[];
  lastChecked?: string;
  assignedTo?: string;
  dueDate?: string;
  remediation?: string;
}

export function CompliancePanel() {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const response = await fetch("/api/admin/security/compliance");
      const data = await response.json();
      setFrameworks(data);
      if (data.length > 0) {
        setSelectedFramework(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ComplianceControl["status"]) => {
    switch (status) {
      case "passed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: ComplianceControl["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const currentFramework = frameworks.find((f) => f.id === selectedFramework);

  if (loading) {
    return <div>Cargando datos de cumplimiento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Cumplimiento Normativo</h3>
          <p className="text-sm text-muted-foreground">
            Gestión y seguimiento del cumplimiento normativo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Programar Evaluación
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar Informe
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {frameworks.map((framework) => (
          <Card
            key={framework.id}
            className={`p-6 cursor-pointer ${
              selectedFramework === framework.id
                ? "border-primary"
                : ""
            }`}
            onClick={() => setSelectedFramework(framework.id)}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{framework.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Versión {framework.version}
                  </p>
                </div>
                <Badge
                  variant={
                    framework.status === "compliant"
                      ? "success"
                      : framework.status === "partial"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {framework.status}
                </Badge>
              </div>
              <Progress
                value={framework.overallScore}
                className="h-2"
                indicatorClassName={
                  framework.overallScore >= 80
                    ? "bg-green-500"
                    : framework.overallScore >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }
              />
              <div className="flex justify-between text-sm">
                <span>Puntuación General</span>
                <span className="font-medium">{framework.overallScore}%</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {currentFramework && (
        <Card className="p-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="controls">Controles</TabsTrigger>
              <TabsTrigger value="evidence">Evidencias</TabsTrigger>
              <TabsTrigger value="tasks">Tareas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Última Evaluación</p>
                    <p className="text-2xl font-bold">
                      {currentFramework.lastAssessment
                        ? new Date(
                            currentFramework.lastAssessment
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Próxima Evaluación</p>
                    <p className="text-2xl font-bold">
                      {currentFramework.nextAssessment
                        ? new Date(
                            currentFramework.nextAssessment
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Controles Cumplidos</p>
                    <p className="text-2xl font-bold">
                      {currentFramework.categories.reduce(
                        (acc, cat) =>
                          acc +
                          cat.controls.filter(
                            (c) => c.status === "passed"
                          ).length,
                        0
                      )}
                      /
                      {currentFramework.categories.reduce(
                        (acc, cat) => acc + cat.controls.length,
                        0
                      )}
                    </p>
                  </div>
                </Card>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {currentFramework.categories.map((category) => (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <span>{category.name}</span>
                        <div className="flex items-center gap-4">
                          <Progress
                            value={category.score}
                            className="w-24 h-2"
                          />
                          <span className="text-sm font-medium">
                            {category.score}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {category.controls.map((control) => (
                          <div
                            key={control.id}
                            className="flex items-start justify-between p-4 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(control.status)}
                                <span className="font-medium">
                                  {control.name}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {control.description}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            {/* Más contenido de pestañas... */}
          </Tabs>
        </Card>
      )}
    </div>
  );
}
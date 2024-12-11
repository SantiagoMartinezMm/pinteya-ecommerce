"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Mail,
  Clock,
  BarChart2,
} from "lucide-react";

interface SecurityReport {
  id: string;
  title: string;
  type: "incident" | "compliance" | "audit" | "risk" | "performance" | "summary";
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";
  status: "scheduled" | "generating" | "completed" | "failed";
  lastGenerated?: string;
  nextGeneration?: string;
  recipients: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  parameters: {
    timeRange: string;
    filters: Record<string, any>;
    metrics: string[];
  };
  data?: {
    summary: {
      title: string;
      value: number | string;
      change?: number;
    }[];
    details: any[];
    charts: {
      type: string;
      data: any[];
    }[];
  };
  format: "pdf" | "excel" | "html";
  distribution: {
    email: boolean;
    dashboard: boolean;
    storage: boolean;
  };
  history: {
    timestamp: string;
    status: string;
    details?: string;
  }[];
}

interface ReportMetrics {
  totalReports: number;
  scheduledReports: number;
  completedToday: number;
  failedToday: number;
  reportsByType: Record<string, number>;
  reportsByStatus: Record<string, number>;
  popularReports: {
    id: string;
    title: string;
    downloads: number;
  }[];
}

export function SecurityReports() {
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SecurityReport | null>(
    null
  );
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    timeRange: "month",
  });

  const fetchReportData = useCallback(async () => {
    try {
      const [reportsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/reports/metrics"),
      ]);

      const reportsData = await reportsRes.json();
      const metricsData = await metricsRes.json();

      setReports(reportsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await fetch(
        `/api/admin/security/reports/${reportId}/download`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando informes de seguridad...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y contenido principal... */}
      <Card className="p-6">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="scheduled">Programados</TabsTrigger>
            <TabsTrigger value="recent">Recientes</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card
                    key={report.id}
                    className="p-4 cursor-pointer hover:border-primary"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {report.type}
                          </Badge>
                          <h4 className="font-medium">
                            {report.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{report.frequency}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Última generación:{" "}
                              {report.lastGenerated
                                ? new Date(
                                    report.lastGenerated
                                  ).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            report.status === "completed"
                              ? "default"
                              : report.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {report.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadReport(report.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Destinatarios
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {report.recipients.map((recipient) => (
                            <Badge
                              key={recipient.id}
                              variant="outline"
                            >
                              {recipient.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Distribución
                        </p>
                        <div className="flex gap-2 mt-1">
                          {report.distribution.email && (
                            <Badge variant="outline">Email</Badge>
                          )}
                          {report.distribution.dashboard && (
                            <Badge variant="outline">
                              Dashboard
                            </Badge>
                          )}
                          {report.distribution.storage && (
                            <Badge variant="outline">
                              Storage
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
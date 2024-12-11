"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Shield,
  Target,
  Activity,
  Globe,
  Zap,
  FileText,
  Map,
  BarChart2,
  Clock,
} from "lucide-react";

interface Threat {
  id: string;
  name: string;
  description: string;
  type: "malware" | "phishing" | "ddos" | "intrusion" | "other";
  severity: "critical" | "high" | "medium" | "low";
  status: "active" | "mitigated" | "investigating" | "resolved";
  source: {
    type: string;
    location?: string;
    ip?: string;
    actor?: string;
  };
  indicators: {
    type: string;
    value: string;
    confidence: number;
    lastSeen: string;
  }[];
  targets: {
    system: string;
    impact: "high" | "medium" | "low";
    status: string;
  }[];
  timeline: {
    timestamp: string;
    event: string;
    details: string;
  }[];
  mitigation: {
    status: string;
    actions: string[];
    effectiveness: number;
  };
  intelligence: {
    source: string;
    reports: {
      date: string;
      summary: string;
      confidence: number;
    }[];
  };
  metrics: {
    occurrences: number;
    lastSeen: string;
    avgImpact: number;
  };
}

interface ThreatMetrics {
  activeThreats: number;
  mitigatedThreats: number;
  criticalThreats: number;
  threatsByType: {
    type: string;
    count: number;
  }[];
  threatsByRegion: {
    region: string;
    count: number;
  }[];
  recentActivity: {
    timestamp: string;
    event: string;
    threatId: string;
  }[];
}

export function ThreatManagement() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [metrics, setMetrics] = useState<ThreatMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [filters, setFilters] = useState({
    type: "",
    severity: "",
    status: "",
  });

  useEffect(() => {
    fetchThreatData();
    const interval = setInterval(fetchThreatData, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [filters]);

  const fetchThreatData = async () => {
    try {
      const [threatsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/threats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/threats/metrics"),
      ]);

      const threatsData = await threatsRes.json();
      const metricsData = await metricsRes.json();

      setThreats(threatsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching threat data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateThreatStatus = async (threatId: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/security/threats/${threatId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchThreatData();
    } catch (error) {
      console.error("Error updating threat status:", error);
    }
  };

...(about 178 lines omitted)...
                    <div className="space-y-4">
                      {selectedThreat.intelligence.reports.map(
                        (report, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {new Date(
                                  report.date
                                ).toLocaleDateString()}
                              </span>
                              <Badge variant="outline">
                                Confianza: {report.confidence}%
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm">
                              {report.summary}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              Selecciona una amenaza para ver sus detalles
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Clock,
  RefreshCw,
  Download,
  Search,
} from "lucide-react";

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "active" | "pending" | "archived";
  lastAssessment?: string;
  nextAssessment?: string;
  overallCompliance: number;
  controls: ComplianceControl[];
  documents: {
    id: string;
    name: string;
    type: string;
    lastUpdated: string;
  }[];
}

interface ComplianceControl {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  status: "compliant" | "non_compliant" | "partial" | "not_applicable";
  evidence: {
    id: string;
    type: string;
    description: string;
    date: string;
    attachments: string[];
  }[];
  lastReview: string;
  assignee?: {
    id: string;
    name: string;
  };
  comments: {
    id: string;
    user: string;
    date: string;
    text: string;
  }[];
}

interface ComplianceMetrics {
  overallScore: number;
  frameworkScores: {
    framework: string;
    score: number;
  }[];
  controlsByStatus: {
    status: string;
    count: number;
  }[];
  recentAssessments: {
    framework: string;
    date: string;
    score: number;
  }[];
  upcomingDeadlines: {
    framework: string;
    control: string;
    date: string;
  }[];
}

export function ComplianceControl() {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(
    null
  );

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const [frameworksRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/compliance/frameworks"),
        fetch("/api/admin/security/compliance/metrics"),
      ]);

      const frameworksData = await frameworksRes.json();
      const metricsData = await metricsRes.json();

      setFrameworks(frameworksData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async (frameworkId: string) => {
    try {
      await fetch(
        `/api/admin/security/compliance/frameworks/${frameworkId}/assess`,
        {
          method: "POST",
        }
      );
      await fetchComplianceData();
    } catch (error) {
      console.error("Error starting assessment:", error);
    }
  };

...(about 156 lines omitted)...
                          <div className="space-y-2">
                            {control.evidence.map((evidence) => (
                              <div
                                key={evidence.id}
                                className="p-2 bg-muted rounded-md"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {evidence.type}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(
                                      evidence.date
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm mt-1">
                                  {evidence.description}
                                </p>
                                {evidence.attachments.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {evidence.attachments.map(
                                      (attachment) => (
                                        <Badge
                                          key={attachment}
                                          variant="outline"
                                        >
                                          {attachment}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>

                <TabsContent value="documents">
                  <div className="space-y-4">
                    {selectedFramework.documents.map(
                      (document) => (
                        <div
                          key={document.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">
                                {document.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{document.type}</span>
                              <span>
                                Actualizado:{" "}
                                {new Date(
                                  document.lastUpdated
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              Selecciona un marco de cumplimiento para ver sus detalles
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
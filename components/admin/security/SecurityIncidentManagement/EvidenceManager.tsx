"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Upload,
  Link,
  Lock,
  Shield,
  Download,
  Trash2,
} from "lucide-react";

interface Evidence {
  id: string;
  type: "file" | "screenshot" | "log" | "network" | "other";
  name: string;
  description: string;
  source: string;
  collectedAt: string;
  collectedBy: string;
  hash: string;
  size: number;
  tags: string[];
  classification: "confidential" | "restricted" | "internal" | "public";
}

interface EvidenceManagerProps {
  incidentId: string;
  evidence: Evidence[];
  onEvidenceAdd: (evidence: Omit<Evidence, "id">) => void;
  onEvidenceDelete: (evidenceId: string) => void;
}

export function EvidenceManager({
  incidentId,
  evidence,
  onEvidenceAdd,
  onEvidenceDelete,
}: EvidenceManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("incidentId", incidentId);

      const response = await fetch("/api/security/incidents/evidence/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      onEvidenceAdd(data);
    } catch (error) {
      console.error("Error uploading evidence:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Evidencias Recolectadas</h3>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Añadir Evidencia
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {evidence.map((item) => (
            <Card
              key={item.id}
              className="p-4 cursor-pointer hover:border-primary"
              onClick={() => setSelectedEvidence(item)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{item.type}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Recolectado por</p>
                  <p>{item.collectedBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p>{new Date(item.collectedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Badge
                  variant={
                    item.classification === "confidential"
                      ? "destructive"
                      : item.classification === "restricted"
                      ? "warning"
                      : "default"
                  }
                >
                  {item.classification}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEvidenceDelete(item.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
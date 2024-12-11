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
  DialogTrigger,
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
  Shield,
  Lock,
  Plus,
  Upload,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";

interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  status: "active" | "expired" | "expiring_soon";
  type: "single" | "wildcard" | "multi_domain";
  algorithm: string;
  keySize: number;
  autoRenewal: boolean;
  lastRenewal?: string;
  domains?: string[];
}

export function SSLCertificateManager() {
  const [certificates, setCertificates] = useState<SSLCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<SSLCertificate | null>(null);
  const [showNewCertDialog, setShowNewCertDialog] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await fetch("/api/admin/security/certificates");
      const data = await response.json();
      setCertificates(data);
    } catch (error) {
      console.error("Error fetching certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const renewCertificate = async (certId: string) => {
    try {
      await fetch(`/api/admin/security/certificates/${certId}/renew`, {
        method: "POST",
      });
      await fetchCertificates();
    } catch (error) {
      console.error("Error renewing certificate:", error);
    }
  };

  const getDaysRemaining = (validTo: string) => {
    const now = new Date();
    const expiryDate = new Date(validTo);
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadgeVariant = (status: SSLCertificate["status"]) => {
    switch (status) {
      case "active":
        return "success";
      case "expired":
        return "destructive";
      case "expiring_soon":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Gestión de Certificados SSL</h3>
          <p className="text-sm text-muted-foreground">
            Administra los certificados SSL/TLS de tus dominios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewCertDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Certificado
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium">Certificados Activos</p>
            </div>
            <p className="text-2xl font-bold">
              {
                certificates.filter((cert) => cert.status === "active")
                  .length
              }
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-medium">Por Expirar</p>
            </div>
            <p className="text-2xl font-bold">
              {
                certificates.filter(
                  (cert) => cert.status === "expiring_soon"
                ).length
              }
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Dominios Protegidos</p>
            </div>
            <p className="text-2xl font-bold">
              {certificates.reduce(
                (acc, cert) =>
                  acc + (cert.domains ? cert.domains.length : 1),
                0
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cert.domain}</span>
                      <Badge variant="outline">{cert.type}</Badge>
                      <Badge
                        variant={getStatusBadgeVariant(cert.status)}
                      >
                        {cert.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Emitido por: {cert.issuer}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCert(cert)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => renewCertificate(cert.id)}
                      disabled={cert.status === "active"}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {getDaysRemaining(cert.validTo)} días restantes
                  </div>
                  <div>
                    Válido hasta:{" "}
                    {new Date(cert.validTo).toLocaleDateString()}
                  </div>
                </div>

                {cert.domains && cert.domains.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cert.domains.map((domain) => (
                      <Badge
                        key={domain}
                        variant="secondary"
                        className="text-xs"
                      >
                        {domain}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Diálogo de Detalles del Certificado */}
      {selectedCert && (
        <Dialog
          open={!!selectedCert}
          onOpenChange={() => setSelectedCert(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles del Certificado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Contenido del diálogo... */}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de Nuevo Certificado */}
      <Dialog
        open={showNewCertDialog}
        onOpenChange={setShowNewCertDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Certificado SSL</DialogTitle>
          </DialogHeader>
          {/* Formulario de nuevo certificado... */}
        </DialogContent>
      </Dialog>
    </div>
  );
}
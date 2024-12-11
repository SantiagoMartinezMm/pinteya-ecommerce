"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Database,
  HardDrive,
  Cloud,
  Clock,
  Calendar,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface BackupJob {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  status: "scheduled" | "running" | "completed" | "failed";
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    lastRun?: string;
    nextRun: string;
  };
  target: {
    type: "local" | "cloud" | "nas";
    location: string;
  };
  size: number;
  retention: number;
  progress?: number;
}

interface BackupHistory {
  id: string;
  jobId: string;
  jobName: string;
  type: "full" | "incremental" | "differential";
  status: "success" | "failed";
  startTime: string;
  endTime: string;
  size: number;
  details?: string;
}

export function BackupRecovery() {
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<BackupJob | null>(null);

  useEffect(() => {
    fetchBackupData();
    const interval = setInterval(updateActiveJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBackupData = async () => {
    try {
      const [jobsRes, historyRes] = await Promise.all([
        fetch("/api/admin/security/backup/jobs"),
        fetch("/api/admin/security/backup/history"),
      ]);

      const jobsData = await jobsRes.json();
      const historyData = await historyRes.json();

      setBackupJobs(jobsData);
      setBackupHistory(historyData);
    } catch (error) {
      console.error("Error fetching backup data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateActiveJobs = async () => {
    const activeJobs = backupJobs.filter(
      (job) => job.status === "running"
    );
    if (activeJobs.length > 0) {
      try {
        const updates = await Promise.all(
          activeJobs.map((job) =>
            fetch(`/api/admin/security/backup/jobs/${job.id}/status`)
          )
        );
        const updatedJobs = await Promise.all(
          updates.map((res) => res.json())
        );
        setBackupJobs((prev) =>
          prev.map((job) => {
            const update = updatedJobs.find((u) => u.id === job.id);
            return update ? { ...job, ...update } : job;
          })
        );
      } catch (error) {
        console.error("Error updating backup jobs:", error);
      }
    }
  };

  const startBackup = async (jobId: string) => {
    try {
      const response = await fetch(
        `/api/admin/security/backup/jobs/${jobId}/start`,
        {
          method: "POST",
        }
      );
      const updatedJob = await response.json();
      setBackupJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, ...updatedJob } : job
        )
      );
    } catch (error) {
      console.error("Error starting backup:", error);
    }
  };

  const formatSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Respaldo y Recuperación</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona tus copias de seguridad y procesos de recuperación
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Cloud className="h-4 w-4 mr-2" />
            Configurar Almacenamiento
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Nuevo Respaldo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Último Respaldo</p>
            </div>
            {backupHistory.length > 0 && (
              <>
                <p className="text-2xl font-bold">
                  {formatSize(backupHistory[0].size)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(backupHistory[0].endTime).toLocaleString()}
                </p>
              </>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Próximo Respaldo</p>
            </div>
            {backupJobs.length > 0 && (
              <>
                <p className="text-2xl font-bold">
                  {new Date(
                    backupJobs[0].schedule.nextRun
                  ).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {backupJobs[0].schedule.time}
                </p>
              </>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Espacio Total</p>
            </div>
            <p className="text-2xl font-bold">
              {formatSize(
                backupHistory.reduce((acc, curr) => acc + curr.size, 0)
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {backupHistory.length} respaldos
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Tareas de Respaldo</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="recovery">Recuperación</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {backupJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{job.name}</span>
                      <Badge variant="outline">{job.type}</Badge>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "success"
                            : job.status === "failed"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {job.target.type} - {job.target.location}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startBackup(job.id)}
                    disabled={job.status === "running"}
                  >
                    {job.status === "running" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2">
                      {job.status === "running"
                        ? "En progreso..."
                        : "Iniciar"}
                    </span>
                  </Button>
                </div>

                {job.status === "running" && job.progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} />
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Frecuencia: {job.schedule.frequency}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Próxima ejecución:{" "}
                    {new Date(job.schedule.nextRun).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {backupHistory.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{backup.jobName}</span>
                        <Badge variant="outline">{backup.type}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatSize(backup.size)}</span>
                        <span>
                          {new Date(backup.startTime).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {backup.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recovery">
            {/* Contenido de la pestaña de recuperación */}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
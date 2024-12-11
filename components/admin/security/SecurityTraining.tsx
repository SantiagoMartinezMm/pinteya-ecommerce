"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  BookOpen,
  Award,
  BarChart2,
  Plus,
  FileText,
  Play,
  Download,
} from "lucide-react";

interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  category: "security_awareness" | "compliance" | "technical" | "incident_response";
  level: "beginner" | "intermediate" | "advanced";
  status: "draft" | "active" | "archived";
  duration: number; // en minutos
  modules: {
    id: string;
    title: string;
    description: string;
    duration: number;
    content: {
      type: "video" | "document" | "quiz";
      url: string;
      duration?: number;
    }[];
  }[];
  requirements: string[];
  targetAudience: string[];
  certification: {
    available: boolean;
    validityPeriod?: number; // en días
    requirements: {
      minScore: number;
      attendance: boolean;
      exercises: boolean;
    };
  };
  schedule: {
    startDate: string;
    endDate: string;
    sessions: {
      date: string;
      duration: number;
      instructor?: string;
    }[];
  };
  metrics: {
    enrollments: number;
    completions: number;
    averageScore: number;
    satisfactionRate: number;
  };
}

interface TrainingEnrollment {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseName: string;
  status: "enrolled" | "in_progress" | "completed" | "expired";
  progress: number;
  startDate: string;
  completionDate?: string;
  score?: number;
  certification?: {
    issued: string;
    expires: string;
    certificate: string;
  };
  activities: {
    moduleId: string;
    status: "pending" | "completed";
    score?: number;
    completedAt?: string;
  }[];
}

interface TrainingMetrics {
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  completionRate: number;
  averageSatisfaction: number;
  certificationRate: number;
  popularCourses: {
    courseId: string;
    title: string;
    enrollments: number;
  }[];
  departmentParticipation: {
    department: string;
    participation: number;
  }[];
}

export function SecurityTraining() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(
    null
  );
  const [showNewCourseDialog, setShowNewCourseDialog] = useState(false);

  const fetchTrainingData = useCallback(async () => {
    try {
      const [coursesRes, enrollmentsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/training/courses"),
        fetch("/api/admin/security/training/enrollments"),
        fetch("/api/admin/security/training/metrics"),
      ]);

      const coursesData = await coursesRes.json();
      const enrollmentsData = await enrollmentsRes.json();
      const metricsData = await metricsRes.json();

      setCourses(coursesData);
      setEnrollments(enrollmentsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainingData();
  }, [fetchTrainingData]);

  if (loading || !metrics) {
    return <div>Cargando sistema de capacitación...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Capacitación en Seguridad
          </h2>
          <p className="text-muted-foreground">
            Gestión de programas de capacitación en seguridad
          </p>
        </div>
        <Button onClick={() => setShowNewCourseDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Curso
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Cursos Activos</h3>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics.activeCourses}
          </p>
          <p className="text-sm text-muted-foreground">
            de {metrics.totalCourses} cursos
          </p>
        </Card>
        {/* Más métricas... */}
      </div>

      {/* Contenido principal */}
      <Card className="p-6">
        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="enrollments">Inscripciones</TabsTrigger>
            <TabsTrigger value="certifications">
              Certificaciones
            </TabsTrigger>
            <TabsTrigger value="reports">Informes</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <div className="grid grid-cols-3 gap-4 mt-4">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="p-4 cursor-pointer hover:border-primary"
                  onClick={() => setSelectedCourse(course)}
                >
                  <div className="flex justify-between items-start">
                    <Badge
                      variant={
                        course.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {course.status}
                    </Badge>
                    <Badge variant="outline">{course.level}</Badge>
                  </div>

                  <h4 className="font-medium mt-3">{course.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.description}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{course.metrics.enrollments}</span>
                      </div>
                    </div>

                    <Progress
                      value={
                        (course.metrics.completions /
                          course.metrics.enrollments) *
                        100
                      }
                    />

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Completado:{" "}
                        {(
                          (course.metrics.completions /
                            course.metrics.enrollments) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                      <span>
                        Satisfacción: {course.metrics.satisfactionRate}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Más contenido de pestañas... */}
        </Tabs>
      </Card>

      {/* Diálogo de detalles del curso */}
      {selectedCourse && (
        <Dialog
          open={!!selectedCourse}
          onOpenChange={() => setSelectedCourse(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles del Curso</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Contenido del diálogo... */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
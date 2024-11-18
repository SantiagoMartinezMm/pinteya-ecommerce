import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  color: string;
}

export function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    red: "text-red-500",
    purple: "text-purple-500"
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-full p-3 bg-opacity-10 ${colorClasses[color]} bg-${color}-500`}>
          <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
        </div>
      </div>
      <div className="mt-4">
        <span className={trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
          {trend}
        </span>
        <span className="text-sm text-muted-foreground ml-2">vs último periodo</span>
      </div>
    </Card>
  );
} 
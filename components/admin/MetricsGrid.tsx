import { fetchMetrics } from "@/lib/metrics";
import { MetricCard } from "./MetricCard";

export async function MetricsGrid() {
  const metrics = await fetchMetrics();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}
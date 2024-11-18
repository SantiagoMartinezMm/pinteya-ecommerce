import { Suspense } from 'react';
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { MetricsGrid } from "@/components/admin/MetricsGrid";
import { ChartsSection } from "@/components/admin/ChartsSection";
import { DataExport } from "@/components/admin/DataExport";
import { Loading } from "@/components/Loading";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-4">
          <DateRangePicker />
          <DataExport />
        </div>
      </div>

      <Suspense fallback={<Loading />}>
        <MetricsGrid />
      </Suspense>

      <Suspense fallback={<Loading />}>
        <ChartsSection />
      </Suspense>
    </div>
  );
}
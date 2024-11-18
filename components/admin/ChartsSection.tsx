import { Charts } from "./charts";
import { Card } from "@/components/ui/card";
import { fetchChartData } from "@/lib/metrics";

export async function ChartsSection() {
  const data = await fetchChartData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Ventas por Categoría</h2>
        <Charts.pie data={data.categoryData} />
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Tendencia de Stock</h2>
        <Charts.line 
          data={data.stockTrend} 
          dataKey="stock"
          xAxisKey="date"
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Productos más Vistos</h2>
        <Charts.bar 
          data={data.popularProducts} 
          dataKey="views"
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Evolución de Precios</h2>
        <Charts.area 
          data={data.priceHistory} 
          dataKey="price"
        />
      </Card>
    </div>
  );
}
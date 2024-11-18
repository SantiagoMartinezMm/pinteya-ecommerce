import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown,
  Eye,
  ShoppingCart,
  BarChart
} from "lucide-react";

interface ProductStatsProps {
  stats: {
    views: number;
    viewsTrend: number;
    sales: number;
    salesTrend: number;
    conversion: number;
  };
}

export function ProductStats({ stats }: ProductStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-muted/50 rounded-md">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm">
              <Eye className="h-4 w-4" />
              <span>{stats.views}</span>
              {stats.viewsTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Vistas últimos 30 días</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span>{stats.sales}</span>
              {stats.salesTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ventas últimos 30 días</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm">
              <BarChart className="h-4 w-4" />
              <span>{stats.conversion}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tasa de conversión</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
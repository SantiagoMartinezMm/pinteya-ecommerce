import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
}

export function LineChart({ 
  data, 
  dataKey, 
  xAxisKey = 'name',
  color = '#8884d8' 
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          activeDot={{ r: 8 }} 
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
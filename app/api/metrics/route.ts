import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Aquí irá la lógica para obtener métricas reales
    const mockMetrics = {
      visits: 100,
      sales: 50,
      revenue: 5000,
    };

    return NextResponse.json(mockMetrics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}
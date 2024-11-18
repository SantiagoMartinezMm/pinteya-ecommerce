import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Aquí irá la lógica para obtener alertas reales
    const mockAlerts = [
      { id: 1, type: 'warning', message: 'Alto uso de CPU' },
      { id: 2, type: 'info', message: 'Nuevo usuario registrado' },
    ];

    return NextResponse.json(mockAlerts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
      { status: 500 }
    );
  }
}
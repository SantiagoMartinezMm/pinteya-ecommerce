import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createFuzzySearch } from '@/lib/search';
import { cacheGet, cacheSet } from '@/lib/cache';

const querySchema = z.object({
  page: z.string().optional().transform(val => Number(val) || 1),
  limit: z.string().optional().transform(val => Number(val) || 10),
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'oldest', 'popular']).optional(),
  minPrice: z.string().optional().transform(val => Number(val) || 0),
  maxPrice: z.string().optional().transform(val => Number(val)),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional().default('ACTIVE'),
  brand: z.string().optional(),
  features: z.string().optional().transform(val => val?.split(',')),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(searchParams));
    
    const {
      page,
      limit,
      category,
      search,
      sort,
      minPrice,
      maxPrice,
      status,
      brand,
      features
    } = parsed;

    // Intentar obtener del caché
    const cacheKey = `products:${JSON.stringify(parsed)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Construir where clause con búsqueda fuzzy
    const where = {
      status,
      ...(category && { category: { slug: category } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(minPrice && { price: { gte: minPrice } }),
      ...(maxPrice && { price: { lte: maxPrice } }),
      ...(brand && { brand }),
      ...(features && { features: { hasEvery: features } }),
    };

    // Construir orderBy con soporte para popularidad
    const orderBy = sort ? {
      ...(sort === 'price_asc' && { price: 'asc' }),
      ...(sort === 'price_desc' && { price: 'desc' }),
      ...(sort === 'newest' && { createdAt: 'desc' }),
      ...(sort === 'oldest' && { createdAt: 'asc' }),
      ...(sort === 'popular' && { views: 'desc' }),
    } : { createdAt: 'desc' };

    // Obtener total y agregaciones
    const [total, aggregations] = await Promise.all([
      prisma.product.count({ where }),
      prisma.$transaction([
        // Conteo por categoría
        prisma.product.groupBy({
          by: ['categoryId'],
          where,
          _count: true,
        }),
        // Rango de precios
        prisma.product.aggregate({
          where,
          _min: { price: true },
          _max: { price: true },
          _avg: { price: true },
        }),
        // Conteo por marca
        prisma.product.groupBy({
          by: ['brand'],
          where,
          _count: true,
        }),
        // Características más comunes
        prisma.product.findMany({
          where,
          select: { features: true },
          take: 100,
        }),
      ]),
    ]);

    // Obtener productos con paginación
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Procesar características más comunes
    const featuresCount = (aggregations[3] as any[])
      .flatMap(p => p.features)
      .reduce((acc, feature) => {
        acc[feature] = (acc[feature] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const response = {
      products,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      aggregations: {
        categories: aggregations[0],
        priceRange: aggregations[1],
        brands: aggregations[2],
        features: Object.entries(featuresCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20),
      },
    };

    // Guardar en caché
    await cacheSet(cacheKey, response, 300); // 5 minutos

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const product = await prisma.product.create({ data });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}

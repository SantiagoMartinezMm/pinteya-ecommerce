import { prisma } from "@/lib/prisma";

export async function fetchFilteredProducts(searchParams: any = {}) {
  const { 
    search, 
    category, 
    status, 
    minPrice, 
    maxPrice, 
    page = 1,
    sort
  } = searchParams;

  const itemsPerPage = 10;
  const [field, order] = (sort || "createdAt:desc").split(":");

  const orderBy = {
    [field]: order.toLowerCase(),
  };

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && { category: { slug: category } }),
    ...(status && { status }),
    ...(minPrice || maxPrice
      ? {
          price: {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          },
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
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
      skip: (Number(page) - 1) * itemsPerPage,
      take: itemsPerPage,
    }),
    prisma.product.count({ where })
  ]);

  return {
    products,
    pagination: {
      page: Number(page),
      limit: itemsPerPage,
      total,
      pages: Math.ceil(total / itemsPerPage)
    }
  };
}
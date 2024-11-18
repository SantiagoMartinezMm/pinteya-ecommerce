import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/jwt";
import { z } from "zod";

const productUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  slug: z.string().min(3).optional(),
  code: z.string().min(3).optional(),
  images: z.array(z.string().url()).optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  description: z.string().min(10).optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  stock: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
});

const stockUpdateSchema = z.object({
  stock: z.number().int().min(0),
  operation: z.enum(["set", "increment", "decrement"]),
});

// PUT - Actualizar producto
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyJwtToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = productUpdateSchema.parse(body);

    const product = await prisma.product.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        category: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: "Error updating product" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar producto
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyJwtToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: "Error deleting product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyJwtToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stock, operation } = stockUpdateSchema.parse(body);

    let updateData = {};
    
    switch (operation) {
      case "set":
        updateData = { stock };
        break;
      case "increment":
        updateData = { 
          stock: {
            increment: stock
          }
        };
        break;
      case "decrement":
        updateData = { 
          stock: {
            decrement: stock
          }
        };
        break;
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: "Error updating stock" },
      { status: 500 }
    );
  }
}
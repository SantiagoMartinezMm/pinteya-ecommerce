import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/jwt";
import { z } from "zod";

const stockUpdateSchema = z.object({
  stock: z.number().int().min(0),
  operation: z.enum(["set", "increment", "decrement"]),
});

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
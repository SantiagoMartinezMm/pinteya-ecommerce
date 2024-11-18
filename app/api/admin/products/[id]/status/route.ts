import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/jwt";
import { z } from "zod";

const statusUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"])
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
    const { status } = statusUpdateSchema.parse(body);

    const product = await prisma.product.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: "Error updating status" },
      { status: 500 }
    );
  }
}
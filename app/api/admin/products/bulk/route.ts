import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyJwtToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, productIds } = await request.json();

    switch (action) {
      case "archive":
        await prisma.product.updateMany({
          where: { id: { in: productIds } },
          data: { status: "ARCHIVED" }
        });
        break;

      case "delete":
        await prisma.product.deleteMany({
          where: { id: { in: productIds } }
        });
        break;

      case "activate":
        await prisma.product.updateMany({
          where: { id: { in: productIds } },
          data: { status: "ACTIVE" }
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      message: "Bulk action completed successfully" 
    });
  } catch (error) {
    console.error("Error in bulk action:", error);
    return NextResponse.json(
      { error: "Error processing bulk action" },
      { status: 500 }
    );
  }
}
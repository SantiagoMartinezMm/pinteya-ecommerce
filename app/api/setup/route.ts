import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export async function POST() {
  try {
    // Verificar si ya existe un admin
    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (adminExists) {
      return NextResponse.json(
        { error: "Admin user already exists" },
        { status: 400 }
      );
    }

    // Crear admin
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({
      data: {
        email: "admin@pinteya.com",
        name: "Admin",
        hashedPassword,
        role: "ADMIN"
      }
    });

    return NextResponse.json({
      message: "Admin user created successfully",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: "Error creating admin user" },
      { status: 500 }
    );
  }
}
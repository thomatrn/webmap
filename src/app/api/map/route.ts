import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markerToDTO, zoneToDTO } from "@/lib/serialize";

export async function GET() {
  const [zones, markers] = await Promise.all([
    prisma.zone.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.marker.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return NextResponse.json({ zones: zones.map(zoneToDTO), markers: markers.map(markerToDTO) });
}

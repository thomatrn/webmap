import { Suspense } from "react";
import { redirect } from "next/navigation";
import LabelsView from "@/components/admin/LabelsView";
import { prisma } from "@/lib/db";
import { getLabels } from "@/lib/map-data";
import { getSession } from "@/lib/session";

export const metadata = { title: "Labels — WebMap Dynasty8 FlashbackFA" };

export default function LabelsPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-neutral-950" />}>
      <Labels />
    </Suspense>
  );
}

async function Labels() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/labels");
  const [labels, markers] = await Promise.all([getLabels(), prisma.marker.findMany({ select: { labels: true } })]);
  // Nombre d'icônes qui ont coché chaque label
  const usage: Record<string, number> = {};
  for (const m of markers) for (const l of m.labels) usage[l] = (usage[l] ?? 0) + 1;
  return <LabelsView initialLabels={labels} initialUsage={usage} />;
}

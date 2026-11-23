import { Suspense } from "react";
import { redirect } from "next/navigation";
import LogsView from "@/components/admin/LogsView";
import { getSession } from "@/lib/session";

export const metadata = { title: "Logs — WebMap Dynasty8 FlashbackFA" };

export default function LogsPage({ searchParams }: PageProps<"/admin/logs">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-neutral-950" />}>
      <Logs searchParams={searchParams} />
    </Suspense>
  );
}

async function Logs({ searchParams }: { searchParams: PageProps<"/admin/logs">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/logs");
  const { entityId } = await searchParams;
  return <LogsView entityId={typeof entityId === "string" ? entityId : null} />;
}

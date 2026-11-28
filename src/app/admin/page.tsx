import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminMap from "@/components/admin/AdminMap";
import { MapLoading } from "@/components/PublicMap";
import { getMapData } from "@/lib/map-data";
import { getMapSize } from "@/lib/map-size";
import { getSession } from "@/lib/session";

export const metadata = { title: "Admin — WebMap Dynasty8 FlashbackFA" };

export default function AdminPage() {
  return (
    <div className="h-dvh">
      <Suspense fallback={<MapLoading />}>
        <AdminWithData />
      </Suspense>
    </div>
  );
}

async function AdminWithData() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  const [size, { zones, markers, labels }] = await Promise.all([getMapSize(), getMapData()]);
  return <AdminMap size={size} initialZones={zones} initialMarkers={markers} labels={labels} username={session.username} />;
}

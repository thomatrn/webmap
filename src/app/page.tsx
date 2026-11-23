import { Suspense } from "react";
import { connection } from "next/server";
import PublicMap, { MapLoading } from "@/components/PublicMap";
import { getMapData } from "@/lib/map-data";
import { getMapSize } from "@/lib/map-size";

export default function Home() {
  return (
    <div className="h-dvh">
      <Suspense fallback={<MapLoading />}>
        <MapWithData />
      </Suspense>
    </div>
  );
}

async function MapWithData() {
  await connection(); // toujours rendu à la requête (données en DB)
  const [size, { zones, markers }] = await Promise.all([getMapSize(), getMapData()]);
  return <PublicMap size={size} zones={zones} markers={markers} />;
}

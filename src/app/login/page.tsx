import { Suspense } from "react";
import { connection } from "next/server";
import LoginForm from "@/components/admin/LoginForm";
import { isDiscordEnabled } from "@/lib/discord";

export const metadata = { title: "Connexion — WebMap Dynasty8 FlashbackFA" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-950 p-4">
      <Suspense>
        <LoginWithConfig />
      </Suspense>
    </main>
  );
}

async function LoginWithConfig() {
  // Lu à chaque requête (et pas au build) : les variables Discord n'existent qu'au runtime en Docker.
  await connection();
  return <LoginForm discordEnabled={isDiscordEnabled()} />;
}

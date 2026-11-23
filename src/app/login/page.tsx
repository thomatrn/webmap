import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Connexion — WebMap Dynasty8 FlashbackFA" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-950 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

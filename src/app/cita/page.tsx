import { Suspense } from "react";
import CitaClient from "@/components/cita/cita-client";

export default function CitaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <CitaClient />
    </Suspense>
  );
}

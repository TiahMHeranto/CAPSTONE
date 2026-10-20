import { Suspense } from "react";
import { Salon } from "@/features/assistant/salon";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Salon />
    </Suspense>
  );
}

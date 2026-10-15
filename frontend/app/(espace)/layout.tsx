"use client";

import { Coquille } from "@/components/Coquille";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <Coquille>{children}</Coquille>;
}

import type { ReactNode } from "react";

import { ReaderGate } from "@/components/reader-gate";

export default function BookLayout({ children }: { children: ReactNode }) {
  return <ReaderGate>{children}</ReaderGate>;
}

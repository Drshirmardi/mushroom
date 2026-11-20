import { IncomingVisitCall } from "@/components/layout/incoming-visit-call";
import { SessionGate } from "@/components/auth/session-gate";

export default function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionGate>{children}<IncomingVisitCall /></SessionGate>;
}

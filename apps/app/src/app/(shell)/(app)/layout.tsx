import { SessionGate } from "@/components/auth/session-gate";

export default function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionGate>{children}</SessionGate>;
}

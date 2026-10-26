import { SessionGate } from "@/components/auth/session-gate";

export default function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionGate><div className="patient-app-shell">{children}</div></SessionGate>;
}

import { VisitWorkspace } from "@/features/appointments/visit-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VisitWorkspace key={id} appointmentId={id} />;
}

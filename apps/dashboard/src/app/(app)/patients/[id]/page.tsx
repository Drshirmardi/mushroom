import type { Metadata } from "next";
import { PatientWorkspace } from "@/features/patients/workspace/patient-workspace";
import { pageMetadata } from "@/lib/page-meta";

export const metadata: Metadata = pageMetadata("patients");

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientWorkspace patientId={id} />;
}

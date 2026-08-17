import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PATIENTS } from "@/data/patients";
import { PatientWorkspace } from "@/features/patients/workspace/patient-workspace";
import { pageMetadata } from "@/lib/page-meta";

export const metadata: Metadata = pageMetadata("patients");

export function generateStaticParams() {
  return PATIENTS.map((pt) => ({ id: String(pt.id) }));
}

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = PATIENTS.find((pt) => pt.id === Number(id));
  if (!patient) notFound();
  return <PatientWorkspace patient={patient} />;
}

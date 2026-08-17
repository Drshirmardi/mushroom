import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { PatientsPage } from "@/features/patients/patients-page";

export const metadata: Metadata = pageMetadata("patients");

export default function Page() {
  return <PatientsPage />;
}

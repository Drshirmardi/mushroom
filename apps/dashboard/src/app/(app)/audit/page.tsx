import type { Metadata } from "next";

import { AuditViewerPage } from "@/features/audit/audit-viewer-page";

export const metadata: Metadata = { title: "نمایشگر ممیزی" };

export default function Page() { return <AuditViewerPage />; }

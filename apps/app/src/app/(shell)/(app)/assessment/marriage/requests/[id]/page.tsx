import { MarriageRequestView } from '@/components/assessments/marriage-request-view';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MarriageRequestView id={id} />; }

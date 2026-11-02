import { MarriageNew } from '@/components/assessments/marriage-service';
export default async function Page({ params, searchParams }: { params:Promise<{id:string}>;searchParams:Promise<{replaceRequestId?:string}> }) { const {id}=await params; const query=await searchParams; return <MarriageNew publicationId={id} replacesId={query.replaceRequestId} />; }

import { redirect } from "next/navigation";
import { InvitationLogin } from "@/components/auth/InvitationLogin";
import { invitationDestination, landingLoginUrl } from "@/auth/auth-navigation";
import { getLocale } from "next-intl/server";

// Keep existing entry links while password and registration forms remain dormant.
export default async function LoginPage({ searchParams }: {
    searchParams: Promise<{ next?: string | string[] }>;
}) {
    const { next } = await searchParams;
    const destination = invitationDestination(typeof next === "string" ? next : undefined);
    if (destination) return <InvitationLogin destination={destination} />;
    const locale = await getLocale();
    const target = landingLoginUrl(typeof next === "string" ? next : undefined);
    redirect(locale === "fa" ? target : `/${locale}${target}`);
}

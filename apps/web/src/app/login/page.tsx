import { redirect } from "next/navigation";
import { landingLoginUrl } from "@/auth/auth-navigation";

// Keep existing entry links while password and registration forms remain dormant.
export default async function LoginPage({ searchParams }: {
    searchParams: Promise<{ next?: string | string[] }>;
}) {
    const { next } = await searchParams;
    redirect(landingLoginUrl(typeof next === "string" ? next : undefined));
}

import type { ReactNode } from "react";

import { AuthBrandPanel } from "./AuthBrandPanel";
import { AuthPageHeader } from "./AuthPageHeader";

interface AuthLayoutProps {
    children: ReactNode;
    brand: {
        title: string;
        highlight: string;
        description: string;
    };
}

export function AuthLayout({ children, brand }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
            <AuthBrandPanel {...brand} />
            <main className="bg-dots relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
                <div className="rise w-full max-w-md space-y-8">
                    <AuthPageHeader />
                    {children}
                </div>
            </main>
        </div>
    );
}

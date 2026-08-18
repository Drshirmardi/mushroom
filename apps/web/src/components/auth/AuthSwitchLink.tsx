import Link from "next/link";

interface AuthSwitchLinkProps {
    question: string;
    to: "/login" | "/signup";
    label: string;
}

export function AuthSwitchLink({ question, to, label }: AuthSwitchLinkProps) {
    return (
        <p className="text-center text-sm text-muted-foreground">
            {question}{" "}
            <Link
                href={to}
                className="font-bold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
            >
                {label}
            </Link>
        </p>
    );
}

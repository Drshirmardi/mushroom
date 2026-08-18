import { Icon } from "@/components/shared/Icon";

export function AuthErrorAlert({ message }: { message: string }) {
    return (
        <div
            role="alert"
            dir="rtl"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
        >
            <Icon name="error" className="mt-0.5 text-xl text-destructive" />
            <p className="text-sm font-medium leading-6 text-destructive">{message}</p>
        </div>
    );
}

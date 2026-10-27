import { Icon } from "@/components/shared/Icon";

export function AuthErrorAlert({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-destructive shadow-sm"
        >
            <Icon name="error" className="mt-0.5 text-xl" />
            <p className="text-sm font-semibold leading-6">{message}</p>
        </div>
    );
}

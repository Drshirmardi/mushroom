import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:shadow-lg",
                    default: "!border-border !bg-background !text-foreground",
                    success: "!border-success/35 !bg-success/10 !text-success",
                    error: "!border-destructive/35 !bg-destructive/10 !text-destructive",
                    info: "!border-info/35 !bg-info/10 !text-info",
                    warning: "!border-warning/40 !bg-warning/10 !text-warning",
                    loading: "!border-border !bg-background !text-foreground",
                    description: "!text-current/75",
                    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };

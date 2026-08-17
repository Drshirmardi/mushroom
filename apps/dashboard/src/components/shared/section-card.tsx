export function SectionCard({ title, children, action, actionLabel }: {
  title: string;
  children: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-foreground text-sm">{title}</h3>
        {action && <button onClick={action} className="text-xs text-primary font-semibold hover:underline">{actionLabel}</button>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

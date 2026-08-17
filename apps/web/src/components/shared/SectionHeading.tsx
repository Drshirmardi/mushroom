interface SectionHeadingProps {
    badge: string;
    title: string;
    subtitle?: string;
    className?: string;
}

export function SectionHeading({ badge, title, subtitle, className = "" }: SectionHeadingProps) {
    return (
        <div className={`text-center max-w-2xl mx-auto mb-8 md:mb-12 ${className}`}>
            <div className="text-primary text-xs md:text-sm font-semibold mb-2 tracking-wide">
                {badge}
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">{title}</h2>
            {subtitle && (
                <p className="text-sm md:text-base text-muted-foreground">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

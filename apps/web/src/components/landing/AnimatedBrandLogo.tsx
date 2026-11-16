const parts = ["body-1", "body-2", "body-3", "dot-3", "dot-1", "dot-2"];

export function AnimatedBrandLogo() {
    return <svg className="navbar-brand-logo" viewBox="0 0 1030 516" width="64" height="32" aria-hidden="true" focusable="false">
        {parts.map(part => <use key={part} className="navbar-logo-part" href={`/brand/shirmardi-logo.svg#${part}`} />)}
    </svg>;
}

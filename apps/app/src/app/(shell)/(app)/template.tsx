/** Fade/slide transition between screens, matching the legacy navigator feel. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="app-route-transition">{children}</div>;
}

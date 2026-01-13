
'use client';

// This is the main layout for the web/desktop view.
// It creates the container for the new modern UI.
export default function WebLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-full overflow-hidden bg-muted/40">{children}</div>;
}

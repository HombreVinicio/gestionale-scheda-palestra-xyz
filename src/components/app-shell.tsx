import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Dumbbell, History, Plus, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTraining } from "@/components/training-provider";

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { saveError, dismissError } = useTraining();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="SERIE, Allenamento">
          <span className="brand-symbol">
            <Dumbbell size={22} strokeWidth={2.5} />
          </span>
          SERIE<span className="brand-dot">.</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigazione principale">
          <Link to="/" activeProps={{ className: "nav-active" }} activeOptions={{ exact: true }}>
            Allenamento
          </Link>
          <Link to="/storico" activeProps={{ className: "nav-active" }}>
            Storico
          </Link>
          <Link to="/impostazioni" activeProps={{ className: "nav-active" }}>
            Impostazioni
          </Link>
        </nav>
        <Button asChild variant="outline" className="header-new-block">
          <Link to="/nuovo-blocco"><Plus />Nuovo blocco</Link>
        </Button>
      </header>
      {saveError && (
        <div className="error-banner" role="alert">
          {saveError}
          <Button variant="ghost" size="icon" aria-label="Chiudi avviso" onClick={dismissError}>
            <X />
          </Button>
        </div>
      )}
      <main className="main-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Navigazione inferiore">
        <Link
          to="/"
          className={
            path === "/" || path === "/sessione" || path === "/nuovo-blocco" ? "active" : ""
          }
        >
          <Dumbbell />
          <span>Allenamento</span>
        </Link>
        <Link to="/storico" className={path.startsWith("/storico") ? "active" : ""}>
          <History />
          <span>Storico</span>
        </Link>
        <Link to="/impostazioni" className={path === "/impostazioni" ? "active" : ""}>
          <Settings2 />
          <span>Impostazioni</span>
        </Link>
      </nav>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function EmptyBlock() {
  return (
    <div className="empty-state">
      <Dumbbell size={38} />
      <h2>Nessun blocco attivo</h2>
      <p>Il tuo ultimo blocco è archiviato.</p>
      <Button asChild size="lg">
        <Link to="/nuovo-blocco">
          Nuovo blocco <ArrowUpRight />
        </Link>
      </Button>
    </div>
  );
}

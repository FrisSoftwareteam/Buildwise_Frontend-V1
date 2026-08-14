import { Link, useLocation } from "wouter";
import { ArrowLeftRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { isGeminiConfigured } from "@/lib/gemini-ai-advisor";
import {
  ALL_NAV_ITEMS,
  GOVERNANCE_HOME,
  PORTALS,
  SHARED_NAV,
  SOFTWARE_HOME,
  isNavActive,
  portalFromPath,
  rememberPortal,
  type NavItem,
  type PortalId,
} from "@/lib/portals";
import { useAuth } from "@/context/AuthContext";
import { canAccessGovernance, canViewTeam, softwareNavHrefs, softwareRoleLabel } from "@/lib/software-roles";

export const NAV_ITEMS = ALL_NAV_ITEMS;

function NavLink({
  item,
  location,
  onNavigate,
  accent,
}: {
  item: NavItem;
  location: string;
  onNavigate?: () => void;
  accent: "software" | "governance";
}) {
  const aiReady = isGeminiConfigured();
  const isActive = isNavActive(location, item.href);
  const Icon = item.icon;
  const activeClass = accent === "governance"
    ? "bg-[#c4a747]/10 text-[#e4d08a]"
    : "bg-primary/10 text-primary";

  return (
    <Link
      href={item.href}
      onClick={() => {
        if (accent === "software" || accent === "governance") rememberPortal(accent);
        onNavigate?.();
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
        isActive ? activeClass : "text-slate-400 hover:bg-white/5 hover:text-white",
        item.isAi && !isActive && "text-indigo-400 hover:text-indigo-300",
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
        isActive ? (accent === "governance" ? "text-[#c4a747]" : "text-primary") : "text-slate-500 group-hover:text-white",
        item.isAi && "text-indigo-400",
      )} />
      {item.label}
      {item.isAi && aiReady && (
        <span className="ml-auto flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
      )}
    </Link>
  );
}

export function Sidebar({
  open = true,
  onNavigate,
}: {
  open?: boolean;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const { user } = useAuth();
  const portal = portalFromPath(location);
  const otherPortal: PortalId = portal === "governance" ? "software" : "governance";
  const softwareNav = PORTALS.software.nav.filter((item) => softwareNavHrefs(user?.role).includes(item.href));
  const portalNav = portal === "software" ? softwareNav : portal ? PORTALS[portal].nav : [];
  const sharedNav = SHARED_NAV.filter((item) => item.href !== "/team" || canViewTeam(user?.role));
  const showGovernanceSwitch = canAccessGovernance(user?.role);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-y-0 border-l-0 flex flex-col transition-transform duration-300",
      open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
    )}>
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-white/5 space-y-3">
        <div className="bg-white rounded-lg px-3 py-1.5 inline-block">
          <img src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`} alt="First Registrars" className="h-8 w-auto object-contain" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c4a747]">First Registrars</p>
          <p className="text-sm font-bold text-white leading-tight">BuildWise</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5 space-y-6 scrollbar-hide">
        {!portal ? (
          <div className="space-y-2">
            <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portals</h4>
            <Link
              href={SOFTWARE_HOME}
              onClick={() => { rememberPortal("software"); onNavigate?.(); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              Software
            </Link>
            {canAccessGovernance(user?.role) && (
              <Link
                href={GOVERNANCE_HOME}
                onClick={() => { rememberPortal("governance"); onNavigate?.(); }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Governance
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Current portal</p>
              <p className={cn("text-sm font-bold", portal === "governance" ? "text-[#e4d08a]" : "text-indigo-200")}>
                {PORTALS[portal].label}
              </p>
              <p className="text-xs text-slate-500 leading-snug">{PORTALS[portal].tagline}</p>
              {portal === "software" && (
                <p className="text-xs text-indigo-300">Role: {softwareRoleLabel(user?.role)}</p>
              )}
              {(otherPortal !== "governance" || showGovernanceSwitch) && (
                <Link
                  href={PORTALS[otherPortal].home}
                  onClick={() => { rememberPortal(otherPortal); onNavigate?.(); }}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white pt-1"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Switch to {PORTALS[otherPortal].label}
                </Link>
              )}
            </div>

            <div className="space-y-1">
              {portalNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  location={location}
                  onNavigate={onNavigate}
                  accent={portal}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-auto space-y-1 pt-4 border-t border-white/5">
          {portal && (
            <Link
              href="/"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <LayoutGrid className="h-5 w-5 text-slate-500" />
              All portals
            </Link>
          )}
          {sharedNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              location={location}
              onNavigate={onNavigate}
              accent={portal === "governance" ? "governance" : "software"}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

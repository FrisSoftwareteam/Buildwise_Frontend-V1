import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS, PORTALS, SHARED_NAV, portalFromPath, rememberPortal } from "@/lib/portals";
import { canRunGovernance, isAllowedPath, softwareFallbackPath, softwareNavHrefs, softwareRoleLabel } from "@/lib/software-roles";

function pageTitle(location: string) {
  if (location === "/") return "Portals";
  if (location === "/software") return "Software portal";
  if (location === "/governance") return "Governance portal";
  const parts = location.split("/").filter(Boolean);
  const titles: Record<string, string> = {
    projects: parts[1] ? "Software product" : "Software products",
    board: "Sprint board",
    backlog: "Backlog",
    sprints: "Sprints",
    vendors: "Vendors",
    "vendor-pipeline": "Vendor pipeline",
    operations: "Operations Center",
    agm: "Issuer meetings",
    playbooks: "Playbooks & Time",
    team: "Team",
    "ai-advisor": "AI Advisor",
    settings: "Settings",
  };
  return titles[parts[0]] ?? parts[0].replace(/-/g, " ");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: projects } = useListProjects();
  const portal = portalFromPath(location);
  const userRoleLabel = portal === "governance"
    ? (canRunGovernance(user?.role) ? "Governance officer" : "Governance member")
    : softwareRoleLabel(user?.role);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const initials = user?.name?.split(" ").map(n => n[0]).slice(0, 2).join("") || "FR";

  useEffect(() => {
    if (portal && isAllowedPath(location, user?.role)) rememberPortal(portal);
  }, [portal, location, user?.role]);

  useEffect(() => {
    if (!user) return;
    if (!isAllowedPath(location, user.role)) {
      setLocation(softwareFallbackPath());
    }
  }, [location, setLocation, user]);

  useEffect(() => {
    setSidebarOpen(false);
    setSearch("");
  }, [location]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];

    const nav = (portal
      ? [...(portal === "software" ? PORTALS.software.nav.filter((item) => softwareNavHrefs(user?.role).includes(item.href)) : PORTALS[portal].nav), ...SHARED_NAV]
      : ALL_NAV_ITEMS
    ).filter((item) => isAllowedPath(item.href, user?.role));
    const pages = nav
      .filter((item) => item.label.toLowerCase().includes(query))
      .map((item) => ({ href: item.href, label: item.label, kind: "Page" }));

    const projectHits = portal === "governance"
      ? []
      : (projects ?? [])
        .filter((project) =>
          [project.name, project.description, project.country]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)),
        )
        .map((project) => ({
          href: `/projects/${project.id}`,
          label: project.name,
          kind: "Product",
        }));

    return [...pages, ...projectHits].slice(0, 8);
  }, [portal, projects, search, user?.role]);

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="h-16 glass-panel border-b border-x-0 border-t-0 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center text-slate-300 hover:bg-white/10"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Open navigation"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-lg font-medium text-slate-200 truncate">
              {portal ? `${PORTALS[portal].label} · ${pageTitle(location)}` : pageTitle(location)}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this portal..."
                className="w-64 h-9 bg-black/20 border border-white/10 rounded-full pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
              {searchResults.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#0f1c2e] shadow-xl overflow-hidden">
                  {searchResults.map((result) => (
                    <Link
                      key={`${result.kind}-${result.href}`}
                      href={result.href}
                      className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5"
                    >
                      <span className="text-white truncate">{result.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 ml-3">{result.kind}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{user?.name || "User"}</p>
                <p className="text-xs text-slate-400">{userRoleLabel}</p>
              </div>
              <Link
                href="/settings"
                className={cn(
                  "h-9 w-9 rounded-full bg-gradient-to-tr from-[#1b3a6b] to-[#2a5298] border border-[#c4a747]/40 flex items-center justify-center text-white font-bold text-sm shrink-0",
                  location === "/settings" && "ring-2 ring-[#c4a747]/50",
                )}
                title="Settings"
              >
                {initials}
              </Link>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}

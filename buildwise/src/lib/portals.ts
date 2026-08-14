import {
  LayoutDashboard,
  FolderKanban,
  Trello,
  ListTodo,
  Timer,
  Briefcase,
  GitMerge,
  Users,
  BrainCircuit,
  Settings,
  Shield,
  Landmark,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type PortalId = "software" | "governance";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  isAi?: boolean;
};

export const SOFTWARE_HOME = "/software";
export const GOVERNANCE_HOME = "/governance";
export const LAST_PORTAL_KEY = "buildwise_portal";

export const SOFTWARE_NAV: NavItem[] = [
  { label: "Overview", href: SOFTWARE_HOME, icon: LayoutDashboard },
  { label: "Products", href: "/projects", icon: FolderKanban },
  { label: "Sprint board", href: "/board", icon: Trello },
  { label: "Backlog", href: "/backlog", icon: ListTodo },
  { label: "Sprints", href: "/sprints", icon: Timer },
  { label: "Vendors", href: "/vendors", icon: Briefcase },
  { label: "Vendor pipeline", href: "/vendor-pipeline", icon: GitMerge },
  { label: "AI Advisor", href: "/ai-advisor", icon: BrainCircuit, isAi: true },
];

export const GOVERNANCE_NAV: NavItem[] = [
  { label: "Overview", href: GOVERNANCE_HOME, icon: LayoutDashboard },
  { label: "Issuer meetings", href: "/agm", icon: Landmark },
  { label: "Operations Center", href: "/operations", icon: Shield },
  { label: "Playbooks & Time", href: "/playbooks", icon: ScrollText },
];

export const SHARED_NAV: NavItem[] = [
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const ALL_NAV_ITEMS = [...SOFTWARE_NAV, ...GOVERNANCE_NAV, ...SHARED_NAV];

export const PORTALS: Record<PortalId, { label: string; home: string; tagline: string; nav: NavItem[] }> = {
  software: {
    label: "Software",
    home: SOFTWARE_HOME,
    tagline: "Build web, desktop, mobile, and enterprise products",
    nav: SOFTWARE_NAV,
  },
  governance: {
    label: "Governance",
    home: GOVERNANCE_HOME,
    tagline: "Run issuer meetings — notice, vote, minutes",
    nav: GOVERNANCE_NAV,
  },
};

function pathMatches(location: string, href: string) {
  if (href === SOFTWARE_HOME || href === GOVERNANCE_HOME) {
    return location === href;
  }
  return location === href || location.startsWith(`${href}/`);
}

export function portalFromPath(location: string): PortalId | null {
  if (location === "/" || location === "") return null;
  if (GOVERNANCE_NAV.some((item) => pathMatches(location, item.href))) return "governance";
  if (SOFTWARE_NAV.some((item) => pathMatches(location, item.href))) return "software";
  return readLastPortal();
}

export function readLastPortal(): PortalId {
  try {
    const stored = localStorage.getItem(LAST_PORTAL_KEY);
    if (stored === "software" || stored === "governance") return stored;
  } catch {
    // ignore
  }
  return "software";
}

export function rememberPortal(portal: PortalId) {
  try {
    localStorage.setItem(LAST_PORTAL_KEY, portal);
  } catch {
    // ignore
  }
}

export function isNavActive(location: string, href: string) {
  return pathMatches(location, href);
}

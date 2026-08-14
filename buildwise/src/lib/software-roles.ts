export const SOFTWARE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Project Manager" },
  { value: "developer", label: "Internal Software Developer" },
  { value: "vendor", label: "External Software Vendor" },
] as const;

export type SoftwareRole = (typeof SOFTWARE_ROLES)[number]["value"];

const LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Project Manager",
  developer: "Internal Software Developer",
  vendor: "External Software Vendor",
  viewer: "Internal Software Developer",
};

export function softwareRole(role?: string | null): SoftwareRole {
  if (role === "admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "vendor") return "vendor";
  return "developer";
}

export function softwareRoleLabel(role?: string | null) {
  if (!role) return "Internal Software Developer";
  return LABELS[role] || SOFTWARE_ROLES.find((item) => item.value === role)?.label || role;
}

export function isAdmin(role?: string | null) {
  return softwareRole(role) === "admin";
}

function hasLeadAccess(role?: string | null) {
  const value = softwareRole(role);
  return value === "admin" || value === "manager";
}

export function canCreateSoftwareProduct(role?: string | null) {
  return hasLeadAccess(role);
}

export function canSetProductLifecycle(role?: string | null) {
  return hasLeadAccess(role);
}

export function canPlanSprints(role?: string | null) {
  const value = softwareRole(role);
  return value === "admin" || value === "manager" || value === "developer";
}

export function canWorkBoard(role?: string | null) {
  return canPlanSprints(role);
}

export function canManageVendors(role?: string | null) {
  return hasLeadAccess(role);
}

export function canManageSoftwareTeam(role?: string | null) {
  return hasLeadAccess(role);
}

export function canViewTeam(role?: string | null) {
  return softwareRole(role) !== "vendor";
}

export function canAccessGovernance(role?: string | null) {
  return softwareRole(role) !== "vendor";
}

export function canRunGovernance(role?: string | null) {
  return hasLeadAccess(role);
}

export function canViewVendors(role?: string | null) {
  const value = softwareRole(role);
  return value === "admin" || value === "manager" || value === "vendor";
}

export function canUseAiAdvisor(role?: string | null) {
  return softwareRole(role) !== "vendor";
}

export function softwareNavHrefs(role?: string | null): string[] {
  switch (softwareRole(role)) {
    case "vendor":
      return ["/software", "/projects", "/vendors", "/vendor-pipeline"];
    case "developer":
      return ["/software", "/projects", "/board", "/backlog", "/sprints", "/ai-advisor"];
    default:
      return ["/software", "/projects", "/board", "/backlog", "/sprints", "/vendors", "/vendor-pipeline", "/ai-advisor"];
  }
}

const SOFTWARE_PREFIXES = ["/software", "/projects", "/board", "/backlog", "/sprints", "/vendors", "/vendor-pipeline", "/ai-advisor"];
const GOVERNANCE_PREFIXES = ["/governance", "/agm", "/operations", "/playbooks"];

export function isSoftwareRouteAllowed(pathname: string, role?: string | null) {
  const allowed = softwareNavHrefs(role);
  return allowed.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function isAllowedPath(pathname: string, role?: string | null) {
  if (pathname === "/" || pathname === "/settings" || pathname.startsWith("/settings/")) {
    return true;
  }
  if (pathname === "/team" || pathname.startsWith("/team/")) {
    return canViewTeam(role);
  }
  if (GOVERNANCE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return canAccessGovernance(role);
  }
  if (SOFTWARE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return isSoftwareRouteAllowed(pathname, role);
  }
  return true;
}

export function softwareFallbackPath() {
  return "/software";
}

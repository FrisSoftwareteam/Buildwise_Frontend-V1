export const SUPER_ADMIN_EMAIL = "ifeanyi.ayodeji@firstregistrarsnigeria.com";

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

export function isSuperAdminEmail(email?: string | null) {
  return (email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function softwareRole(role?: string | null, email?: string | null): SoftwareRole {
  if (isSuperAdminEmail(email) || role === "admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "vendor") return "vendor";
  return "developer";
}

export function softwareRoleLabel(role?: string | null, email?: string | null) {
  if (isSuperAdminEmail(email)) return "Super admin";
  if (!role) return "Internal Software Developer";
  return LABELS[role] || SOFTWARE_ROLES.find((item) => item.value === role)?.label || role;
}

export function isAdmin(role?: string | null, email?: string | null) {
  return softwareRole(role, email) === "admin";
}

function hasLeadAccess(role?: string | null, email?: string | null) {
  const value = softwareRole(role, email);
  return value === "admin" || value === "manager";
}

export function canCreateSoftwareProduct(role?: string | null) {
  return hasLeadAccess(role);
}

export function canSetProductLifecycle(role?: string | null) {
  return hasLeadAccess(role);
}

type ProjectPermissionUser = { role?: string | null; email?: string | null } | null | undefined;

// Admins/managers can move a software product between lifecycle states,
// including reopening one that was already marked completed (e.g. back to
// in-progress or on hold for another look).
export function canManageProjectLifecycle(user?: ProjectPermissionUser) {
  return hasLeadAccess(user?.role, user?.email);
}

// Admins/managers can permanently delete a software product.
export function canDeleteProject(user?: ProjectPermissionUser) {
  return hasLeadAccess(user?.role, user?.email);
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

export function canViewTeam(role?: string | null, email?: string | null) {
  return softwareRole(role, email) !== "vendor";
}

// Sub-portal 2 (Governance) is disabled app-wide as of 2026-09-18.
// Governance code (pages, routes, nav) is left in place — only access is turned off.
// Flip this back to `return softwareRole(role) !== "vendor";` to restore it.
export function canAccessGovernance(_role?: string | null, email?: string | null) {
  return isSuperAdminEmail(email);
}

export function canRunGovernance(role?: string | null, email?: string | null) {
  return isSuperAdminEmail(email) || hasLeadAccess(role, email);
}

export function canViewVendors(role?: string | null) {
  const value = softwareRole(role);
  return value === "admin" || value === "manager" || value === "vendor";
}

export function canUseAiAdvisor(role?: string | null) {
  return softwareRole(role) !== "vendor";
}

export function softwareNavHrefs(role?: string | null, email?: string | null): string[] {
  switch (softwareRole(role, email)) {
    case "vendor":
      return ["/software", "/projects", "/vendors", "/vendor-pipeline"];
    case "developer":
      return ["/software", "/projects", "/board", "/backlog", "/sprints", "/kpis", "/ai-advisor"];
    default:
      return ["/software", "/projects", "/board", "/backlog", "/sprints", "/kpis", "/vendors", "/vendor-pipeline", "/ai-advisor"];
  }
}

export function canViewKpis(role?: string | null) {
  return canPlanSprints(role);
}

const SOFTWARE_PREFIXES = ["/software", "/projects", "/board", "/backlog", "/sprints", "/kpis", "/vendors", "/vendor-pipeline", "/ai-advisor"];
const GOVERNANCE_PREFIXES = ["/governance", "/agm", "/operations", "/playbooks"];

export function isSoftwareRouteAllowed(pathname: string, role?: string | null, email?: string | null) {
  const allowed = softwareNavHrefs(role, email);
  return allowed.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function isAllowedPath(pathname: string, role?: string | null, email?: string | null) {
  if (pathname === "/" || pathname === "/settings" || pathname.startsWith("/settings/")) {
    return true;
  }
  if (pathname === "/team" || pathname.startsWith("/team/")) {
    return canViewTeam(role, email);
  }
  if (GOVERNANCE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return canAccessGovernance(role, email);
  }
  if (SOFTWARE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return isSoftwareRouteAllowed(pathname, role, email);
  }
  return true;
}

export function softwareFallbackPath() {
  return "/software";
}

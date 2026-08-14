export const PRODUCT_KINDS = [
  { value: "web", label: "Web app" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
  { value: "enterprise", label: "Enterprise" },
  { value: "continuous", label: "Continuous" },
] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number]["value"];

const LABELS: Record<string, string> = {
  web: "Web app",
  desktop: "Desktop",
  mobile: "Mobile",
  enterprise: "Enterprise",
  continuous: "Continuous",
  internal: "Software",
  vendor: "Enterprise",
};

export function isContinuousKind(type?: string | null) {
  return type === "continuous";
}

export function productKindLabel(type?: string | null) {
  if (!type) return "Software";
  return LABELS[type] || type.replace("_", " ");
}

export function productKindBadgeClass(type?: string | null) {
  switch (type) {
    case "web":
      return "border-sky-500/30 text-sky-300 bg-sky-500/10";
    case "desktop":
      return "border-slate-400/30 text-slate-200 bg-slate-500/10";
    case "mobile":
      return "border-violet-500/30 text-violet-300 bg-violet-500/10";
    case "enterprise":
    case "vendor":
      return "border-amber-500/30 text-amber-300 bg-amber-500/10";
    case "continuous":
      return "border-cyan-400/40 text-cyan-200 bg-cyan-500/10";
    default:
      return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  }
}

export const PRODUCT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "inactive", label: "Inactive" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function isProductClosed(status?: string | null) {
  return status === "completed" || status === "inactive" || status === "cancelled";
}

export function productStatusLabel(project: { type?: string | null; status?: string | null }) {
  if (project.status === "inactive") return "Inactive";
  if (project.status === "completed") return "Completed";
  if (project.status === "cancelled") return "Cancelled";
  if (isContinuousKind(project.type) && !isProductClosed(project.status)) return "Continuous";
  return (project.status || "planning").replace("_", " ");
}

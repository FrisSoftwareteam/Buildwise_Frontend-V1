import { formatCurrency } from "@/lib/utils";

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function moneyAmount(value?: number | string | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function monthsActive(project: {
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  type?: string | null;
}) {
  const start = parseDate(project.startDate);
  if (!start) return 0;

  const finished =
    project.status === "completed" ||
    project.status === "cancelled" ||
    project.status === "inactive";
  const end = (finished ? parseDate(project.endDate) : null) || new Date();
  if (end < start) return 0;

  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

export function totalExpense(project: {
  initialCost?: number | string | null;
  monthlyCost?: number | string | null;
  budget?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  type?: string | null;
}) {
  const initial = moneyAmount(project.initialCost ?? project.budget);
  const monthly = moneyAmount(project.monthlyCost);
  return initial + monthly * monthsActive(project);
}

export function formatMoney(value?: number | string | null) {
  const amount = moneyAmount(value);
  return amount ? formatCurrency(amount) : "—";
}

export function rankProjectsByExpense<T extends {
  initialCost?: number | string | null;
  monthlyCost?: number | string | null;
  budget?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  type?: string | null;
}>(projects: T[]) {
  return [...projects].sort((left, right) => totalExpense(right) - totalExpense(left));
}

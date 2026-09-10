import { useQuery } from "@tanstack/react-query";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type RecentCompletedTask = {
  id: number;
  title: string;
  projectId: number;
  storyPoints: number | null;
  completedOn: string;
};

export type UserKpiMetrics = {
  userId: number;
  name: string;
  role: string;
  department: string;
  assigned: number;
  completed: number;
  completedLast30d: number;
  active: number;
  wip: number;
  inProgress: number;
  overdue: number;
  onTimeRate: number | null;
  storyPointsDelivered: number;
  storyPointsInFlight: number;
  recentCompleted: RecentCompletedTask[];
};

export type OrgKpis = {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  onTimeRate: number | null;
  throughput30d: number;
  storyPointsDelivered: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgCompletionRate: number;
  atRiskProjects: number;
  totalBudget: number;
};

export type KpiResponse = {
  generatedAt: string;
  org: OrgKpis;
  leaderboard: UserKpiMetrics[];
  personal: UserKpiMetrics | null;
};

export function useKpis(userId?: number | null) {
  return useQuery({
    queryKey: ["kpis", userId ?? null],
    queryFn: () => api<KpiResponse>(`/api/kpis${userId ? `?userId=${userId}` : ""}`),
  });
}

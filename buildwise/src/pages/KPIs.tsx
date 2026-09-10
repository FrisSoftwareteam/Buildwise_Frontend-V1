import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useKpis, type UserKpiMetrics } from "@/lib/kpi-api";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  ListChecks,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { isAdmin, softwareRole, softwareRoleLabel } from "@/lib/software-roles";
import { formatCurrency } from "@/lib/utils";

function RateBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-slate-500 text-sm">No data</span>;
  }
  const tone = value >= 80 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  return <span className={`font-semibold ${tone}`}>{value}%</span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: string;
  sublabel?: string;
}) {
  return (
    <Card className="bg-gradient-to-br from-card to-card border-white/5 h-full">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
          {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalKpis({ metrics }: { metrics: UserKpiMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={CheckCircle2}
          label="Tasks completed"
          value={metrics.completed}
          accent="bg-emerald-500/20 text-emerald-500"
          sublabel={`${metrics.completedLast30d} in last 30 days · ${metrics.inProgress} in progress`}
        />
        <StatCard
          icon={Layers}
          label="Current workload"
          value={metrics.active}
          accent="bg-blue-500/20 text-blue-500"
          sublabel={`${metrics.wip} in progress / review`}
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue tasks"
          value={metrics.overdue}
          accent={metrics.overdue > 0 ? "bg-red-500/20 text-red-500" : "bg-slate-500/20 text-slate-400"}
        />
        <StatCard
          icon={Sparkles}
          label="Story points delivered"
          value={metrics.storyPointsDelivered}
          accent="bg-purple-500/20 text-purple-500"
          sublabel={`${metrics.storyPointsInFlight} in flight`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>On-time delivery rate</CardTitle>
          <RateBadge value={metrics.onTimeRate} />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            Share of your completed tasks (with a due date) finished on or before that date.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently completed</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-2 py-8">
              <ListChecks className="w-8 h-8 text-slate-600" />
              <p>No completed tasks yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {metrics.recentCompleted.map((task) => (
                <li key={task.id} className="py-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-white">{task.title}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {task.storyPoints ? `${task.storyPoints} pts · ` : ""}
                    {task.completedOn}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function KPIs() {
  const { user } = useAuth();
  const role = softwareRole(user?.role);
  const showLeaderboard = role === "admin" || role === "manager";
  const { data, isLoading, isError } = useKpis(user?.id ?? null);
  const [selectedDeveloper, setSelectedDeveloper] = useState<UserKpiMetrics | null>(null);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (isError || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
        <p>Failed to load KPIs.</p>
      </div>
    );
  }

  const { org, leaderboard, personal } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none"></div>
        <div className="z-10">
          <p className="text-xs uppercase tracking-[0.24em] text-indigo-300">Software portal · {softwareRoleLabel(user?.role)}</p>
          <h2 className="text-2xl font-bold font-display text-white mt-1">KPIs</h2>
          <p className="text-slate-400 mt-1">
            {showLeaderboard
              ? "Portfolio health, delivery throughput, and how the team is performing."
              : "Your delivery performance, computed from tasks assigned to you."}
          </p>
        </div>
      </div>

      {showLeaderboard && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Gauge}
              label="Avg completion rate"
              value={`${Math.round(org.avgCompletionRate)}%`}
              accent="bg-blue-500/20 text-blue-500"
              sublabel={`${org.activeProjects} active of ${org.totalProjects} products`}
            />
            <StatCard
              icon={Target}
              label="On-time delivery"
              value={org.onTimeRate === null ? "—" : `${org.onTimeRate}%`}
              accent="bg-emerald-500/20 text-emerald-500"
              sublabel={`${org.completedTasks} tasks completed`}
            />
            <StatCard
              icon={AlertCircle}
              label="Overdue tasks"
              value={org.overdueTasks}
              accent={org.overdueTasks > 0 ? "bg-red-500/20 text-red-500" : "bg-slate-500/20 text-slate-400"}
              sublabel={`${org.atRiskProjects} at-risk product(s)`}
            />
            <StatCard
              icon={TrendingUp}
              label="Throughput (30d)"
              value={org.throughput30d}
              accent="bg-purple-500/20 text-purple-500"
              sublabel={`${org.storyPointsDelivered} story points delivered all-time`}
            />
          </div>

          {isAdmin(user?.role) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StatCard
                icon={Wallet}
                label="Portfolio budget"
                value={formatCurrency(org.totalBudget)}
                accent="bg-amber-500/20 text-amber-500"
                sublabel={`${org.totalProjects} products tracked`}
              />
              <StatCard
                icon={Clock}
                label="Open work"
                value={org.activeTasks}
                accent="bg-blue-500/20 text-blue-500"
                sublabel={`${org.totalTasks} tasks total`}
              />
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <CardTitle>Team leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No team members with tracked work yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-white/5">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Role</th>
                        <th className="py-2 pr-4 font-medium text-right">Completed</th>
                        <th className="py-2 pr-4 font-medium text-right">In Progress</th>
                        <th className="py-2 pr-4 font-medium text-right">WIP</th>
                        <th className="py-2 pr-4 font-medium text-right">Overdue</th>
                        <th className="py-2 pr-4 font-medium text-right">On-time</th>
                        <th className="py-2 pr-4 font-medium text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row) => (
                        <tr
                          key={row.userId}
                          onClick={() => setSelectedDeveloper(row)}
                          className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 pr-4 text-white font-medium">{row.name}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline">{softwareRoleLabel(row.role)}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-right text-white">{row.completed}</td>
                          <td className="py-3 pr-4 text-right text-amber-300">{row.inProgress}</td>
                          <td className="py-3 pr-4 text-right text-slate-300">{row.wip}</td>
                          <td className="py-3 pr-4 text-right">
                            {row.overdue > 0 ? (
                              <span className="text-red-400 font-medium">{row.overdue}</span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right"><RateBadge value={row.onTimeRate} /></td>
                          <td className="py-3 pr-4 text-right text-slate-300">{row.storyPointsDelivered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-500 mt-2">Ranked by completed + in-progress tasks. Click a developer to see their full breakdown.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">My KPIs</h3>
        {personal ? (
          <PersonalKpis metrics={personal} />
        ) : (
          <p className="text-slate-500 text-sm">No tasks are assigned to you yet.</p>
        )}
      </div>

      <Dialog open={selectedDeveloper !== null} onOpenChange={(open) => !open && setSelectedDeveloper(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedDeveloper && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedDeveloper.name}
                  <Badge variant="outline">{softwareRoleLabel(selectedDeveloper.role)}</Badge>
                </DialogTitle>
                <DialogDescription>
                  KPIs based on tasks completed by {selectedDeveloper.name}.
                </DialogDescription>
              </DialogHeader>
              <PersonalKpis metrics={selectedDeveloper} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

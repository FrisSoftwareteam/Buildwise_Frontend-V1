import { useMemo, useState } from "react";
import {
  useCreateSprint,
  useListProjects,
  useListSprints,
  useUpdateSprint,
} from "@workspace/api-client-react";
import { Badge, Button, Card, Dialog, Input } from "@/components/ui/shared";
import { CalendarRange, Flag, Loader2, Plus, TimerReset } from "lucide-react";
import { format } from "date-fns";

export default function Sprints() {
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeProjectId = selectedProjectId || projects?.[0]?.id;
  const activeProject = projects?.find((project) => project.id === activeProjectId) || null;

  const { data: sprints, isLoading: sprintsLoading } = useListSprints(activeProjectId || 0, {
    query: { enabled: !!activeProjectId },
  });

  const createSprintMutation = useCreateSprint({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        window.location.reload();
      },
    },
  });

  const updateSprintMutation = useUpdateSprint({
    mutation: {
      onSuccess: () => {
        window.location.reload();
      },
    },
  });

  const sprintStats = useMemo(() => {
    const items = sprints ?? [];
    return {
      total: items.length,
      active: items.filter((sprint) => sprint.status === "active").length,
      planned: items.filter((sprint) => sprint.status === "planned").length,
      completed: items.filter((sprint) => sprint.status === "completed").length,
    };
  }, [sprints]);

  if (projectsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-3">
            <TimerReset className="w-6 h-6 text-primary" />
            Sprint Management
          </h2>
          <p className="text-slate-400 text-sm">Plan, activate, and close sprints for the selected project.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            className="h-10 rounded-lg border border-white/10 bg-black/40 px-4 text-white focus:ring-2 focus:ring-primary focus:outline-none min-w-[240px]"
            value={activeProjectId || ""}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
          >
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <Button onClick={() => setIsCreateOpen(true)} disabled={!activeProjectId}>
            <Plus className="w-4 h-4 mr-2" />
            New Sprint
          </Button>
        </div>
      </div>

      {activeProject && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-slate-900/50 border-white/5">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                  {activeProject.type}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-900/50">
                  {activeProject.status.replace("_", " ")}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-white">{activeProject.name}</h3>
              <p className="text-slate-400 mt-2 max-w-3xl">{activeProject.description || "No project description available."}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
              <StatCard label="Total" value={sprintStats.total} />
              <StatCard label="Active" value={sprintStats.active} />
              <StatCard label="Planned" value={sprintStats.planned} />
              <StatCard label="Completed" value={sprintStats.completed} />
            </div>
          </div>
        </Card>
      )}

      {sprintsLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sprints && sprints.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sprints.map((sprint) => (
            <Card key={sprint.id} className="p-5 border-white/5 bg-card/90">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        sprint.status === "active"
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : sprint.status === "completed"
                            ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                            : "border-amber-500/30 text-amber-300 bg-amber-500/10"
                      }
                    >
                      {sprint.status}
                    </Badge>
                    <span className="text-xs text-slate-500">SPR-{sprint.id}</span>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white">{sprint.name}</h4>
                    <p className="text-sm text-slate-400 mt-1">{sprint.goal || "No sprint goal added yet."}</p>
                  </div>
                </div>

                <select
                  value={sprint.status}
                  onChange={(e) =>
                    updateSprintMutation.mutate({
                      id: sprint.id,
                      data: {
                        name: sprint.name,
                        goal: sprint.goal,
                        status: e.target.value as "planned" | "active" | "completed",
                        startDate: sprint.startDate,
                        endDate: sprint.endDate,
                      },
                    })
                  }
                  className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
                    <CalendarRange className="w-3 h-3" />
                    Start Date
                  </p>
                  <p className="text-sm text-white mt-1">
                    {sprint.startDate ? format(new Date(sprint.startDate), "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
                    <Flag className="w-3 h-3" />
                    End Date
                  </p>
                  <p className="text-sm text-white mt-1">
                    {sprint.endDate ? format(new Date(sprint.endDate), "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 border-dashed border-white/10 bg-card/40 text-center">
          <TimerReset className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No sprints for this project yet</h3>
          <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            Create a sprint to group upcoming work, track delivery windows, and move the project into a clearer execution cycle.
          </p>
          <Button className="mt-5" onClick={() => setIsCreateOpen(true)} disabled={!activeProjectId}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Sprint
          </Button>
        </Card>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Sprint">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activeProjectId) {
              return;
            }

            const fd = new FormData(e.currentTarget);
            createSprintMutation.mutate({
              projectId: activeProjectId,
              data: {
                name: fd.get("name") as string,
                goal: (fd.get("goal") as string) || undefined,
                status: fd.get("status") as "planned" | "active" | "completed",
                startDate: (fd.get("startDate") as string) || undefined,
                endDate: (fd.get("endDate") as string) || undefined,
              },
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Sprint Name</label>
            <Input name="name" required placeholder="e.g. Sprint 1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Goal</label>
            <textarea
              name="goal"
              placeholder="What should this sprint achieve?"
              className="flex min-h-24 w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select
                name="status"
                defaultValue="planned"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Start Date</label>
              <Input name="startDate" type="date" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">End Date</label>
              <Input name="endDate" type="date" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createSprintMutation.isPending} disabled={!activeProjectId}>
              Create Sprint
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

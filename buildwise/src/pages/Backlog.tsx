import { useState } from "react";
import { useCreateTask, useGetProject, useListProjects, useListTasks } from "@workspace/api-client-react";
import { Badge, Button, Card, Dialog, Input } from "@/components/ui/shared";
import { ClipboardList, Flag, Layers3, Loader2, Plus } from "lucide-react";

export default function Backlog() {
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeProjectId = selectedProjectId || projects?.[0]?.id;
  const { data: project, isLoading: projectLoading } = useGetProject(activeProjectId || 0, {
    query: { enabled: !!activeProjectId },
  });
  const { data: tasks, isLoading: tasksLoading } = useListTasks(activeProjectId || 0, {
    query: { enabled: !!activeProjectId },
  });

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        window.location.reload();
      },
    },
  });

  const backlogTasks = tasks?.filter((task) => task.status === "backlog") || [];

  if (projectsLoading || projectLoading) {
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
            <ClipboardList className="w-6 h-6 text-primary" />
            Project Backlog
          </h2>
          <p className="text-slate-400 text-sm">Track work waiting to be pulled into delivery for the selected project.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            className="h-10 rounded-lg border border-white/10 bg-black/40 px-4 text-white focus:ring-2 focus:ring-primary focus:outline-none min-w-[240px]"
            value={activeProjectId || ""}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
          >
            {projects?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <Button onClick={() => setIsCreateOpen(true)} disabled={!activeProjectId}>
            <Plus className="w-4 h-4 mr-2" />
            Add Backlog Item
          </Button>
        </div>
      </div>

      {project && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-slate-900/60 border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                  {project.type}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-900/50">
                  {project.status.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{project.name}</h3>
                <p className="text-slate-400 mt-2 max-w-3xl">{project.description || "No project description available."}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Backlog Items</p>
                <p className="mt-2 text-2xl font-bold text-white">{backlogTasks.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Completion</p>
                <p className="mt-2 text-2xl font-bold text-white">{project.completionRate}%</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tasksLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : backlogTasks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {backlogTasks.map((task) => (
            <Card key={task.id} className="p-5 bg-card/90 border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-900/50">
                      {task.type}
                    </Badge>
                    {task.label && (
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10">
                        {task.label}
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-white">{task.title}</h4>
                  <p className="text-sm text-slate-400">{task.description || "No backlog detail added yet."}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                    <Flag className="w-3 h-3" />
                    {task.priority}
                  </div>
                  {task.storyPoints && (
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400">
                      <Layers3 className="w-3 h-3" />
                      {task.storyPoints} points
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 border-dashed border-white/10 bg-card/40 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No backlog items for this project yet</h3>
          <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            Add project-specific backlog work here before it moves into To Do, In Progress, In Review, or Done.
          </p>
          <Button className="mt-5" onClick={() => setIsCreateOpen(true)} disabled={!activeProjectId}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Backlog Item
          </Button>
        </Card>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Backlog Item">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activeProjectId) {
              return;
            }

            const fd = new FormData(e.currentTarget);
            createTaskMutation.mutate({
              projectId: activeProjectId,
              data: {
                title: fd.get("title") as string,
                description: (fd.get("description") as string) || undefined,
                status: "backlog",
                priority: fd.get("priority") as "low" | "medium" | "high" | "critical",
                type: fd.get("type") as "story" | "task" | "bug" | "epic" | "subtask",
                storyPoints: fd.get("storyPoints") ? Number(fd.get("storyPoints")) : undefined,
                label: (fd.get("label") as string) || undefined,
              },
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Title</label>
            <Input name="title" required placeholder="e.g. Define onboarding workflow" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Description</label>
            <textarea
              name="description"
              placeholder="Describe the project-related backlog item..."
              className="flex min-h-24 w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Priority</label>
              <select
                name="priority"
                defaultValue="medium"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Type</label>
              <select
                name="type"
                defaultValue="task"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
                <option value="subtask">Subtask</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Story Points</label>
              <Input name="storyPoints" type="number" min="1" placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Label</label>
              <Input name="label" placeholder="e.g. api" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTaskMutation.isPending} disabled={!activeProjectId}>
              Create Backlog Item
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

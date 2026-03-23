import { useParams } from "wouter";
import { useGetProject, useListTasks, useUpdateProject } from "@workspace/api-client-react";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Calendar, Flag, Activity, Loader2, KanbanSquare, Pencil } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id || '0');
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const { data: project, isLoading: projLoading } = useGetProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useListTasks(projectId);
  const updateProjectMutation = useUpdateProject({
    mutation: {
      onSuccess: () => {
        setIsEditOpen(false);
        window.location.reload();
      },
    },
  });

  if (projLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>;
  if (!project) return <div className="p-12 text-center text-red-400">Project not found</div>;

  const statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Col - Details */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="p-6">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="custom" className={getStatusColor(project.status)}>
                {project.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline" className={
                project.priority === 'critical' ? 'border-red-500/50 text-red-400' :
                project.priority === 'high' ? 'border-orange-500/50 text-orange-400' :
                'border-slate-500/50 text-slate-400'
              }>
                <Flag className="w-3 h-3 mr-1" /> {project.priority.toUpperCase()}
              </Badge>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
            <p className="text-slate-400 mb-6">{project.description || "No description provided."}</p>
            
            <div className="space-y-4 py-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm flex items-center"><Activity className="w-4 h-4 mr-2"/> Progress</span>
                <span className="text-white font-medium">{project.completionRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${project.completionRate}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/5">
              <div>
                <p className="text-xs text-slate-500 mb-1">Type</p>
                <p className="text-sm text-white capitalize">{project.type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Budget</p>
                <p className="text-sm text-white">{formatCurrency(project.budget)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Country</p>
                <p className="text-sm text-white">{project.country || 'Global'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Start Date</p>
                <p className="text-sm text-white">{project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'TBD'}</p>
              </div>
            </div>
          </Card>
          
          <Link href={`/ai-advisor?projectId=${project.id}`}>
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none">
              Analyze with AI Advisor
            </Button>
          </Link>
        </div>

        {/* Right Col - Mini Board */}
        <div className="w-full lg:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center"><KanbanSquare className="w-5 h-5 mr-2 text-primary"/> Task Overview</h3>
            <Link href="/board">
              <Button variant="outline" size="sm">Go to Full Board</Button>
            </Link>
          </div>

          {tasksLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px] overflow-hidden">
              {['todo', 'in_progress', 'done'].map(status => (
                <div key={status} className="bg-slate-900/50 rounded-xl p-4 flex flex-col h-full border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-slate-300 capitalize">{status.replace('_', ' ')}</h4>
                    <Badge variant="secondary" className="bg-black/40">{tasks?.filter(t => t.status === status).length || 0}</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {tasks?.filter(t => t.status === status).map(task => (
                      <Card key={task.id} className="p-3 bg-card/80 hover:bg-card transition-colors cursor-pointer group">
                        <div className="text-xs font-mono text-slate-500 mb-1">TSK-{task.id}</div>
                        <h5 className="text-sm font-medium text-white mb-2 group-hover:text-primary transition-colors">{task.title}</h5>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-[10px] py-0 h-5 border-slate-700 text-slate-400 capitalize">{task.type}</Badge>
                          {task.storyPoints && <span className="text-xs text-slate-500 font-mono bg-slate-800 px-1.5 rounded">{task.storyPoints}</span>}
                        </div>
                      </Card>
                    ))}
                    {(!tasks || tasks.filter(t => t.status === status).length === 0) && (
                      <div className="h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-sm">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            updateProjectMutation.mutate({
              id: project.id,
              data: {
                name: fd.get("name") as string,
                description: (fd.get("description") as string) || undefined,
                type: fd.get("type") as "internal" | "vendor",
                status: fd.get("status") as "planning" | "in_progress" | "on_hold" | "completed" | "cancelled",
                priority: fd.get("priority") as "low" | "medium" | "high" | "critical",
                country: (fd.get("country") as string) || undefined,
                startDate: (fd.get("startDate") as string) || undefined,
                endDate: (fd.get("endDate") as string) || undefined,
                budget: fd.get("budget") ? Number(fd.get("budget")) : undefined,
                completionRate: fd.get("completionRate") ? Number(fd.get("completionRate")) : undefined,
              },
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Project Name</label>
            <Input name="name" required defaultValue={project.name} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Description</label>
            <textarea
              name="description"
              defaultValue={project.description || ""}
              className="flex min-h-24 w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Type</label>
              <select
                name="type"
                defaultValue={project.type}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="internal">Internal</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select
                name="status"
                defaultValue={project.status}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Priority</label>
              <select
                name="priority"
                defaultValue={project.priority}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Country</label>
              <Input name="country" defaultValue={project.country || ""} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Start Date</label>
              <Input name="startDate" type="date" defaultValue={project.startDate || ""} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">End Date</label>
              <Input name="endDate" type="date" defaultValue={project.endDate || ""} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Completion %</label>
              <Input name="completionRate" type="number" min="0" max="100" defaultValue={project.completionRate} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Budget (NGN)</label>
            <Input name="budget" type="number" min="0" defaultValue={project.budget || ""} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateProjectMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

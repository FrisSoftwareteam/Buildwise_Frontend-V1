import { useParams } from "wouter";
import { useGetProject, useListTasks, useListUsers, useUpdateProject } from "@workspace/api-client-react";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { productKindLabel, PRODUCT_KINDS, PRODUCT_STATUSES, isContinuousKind, isProductClosed, productStatusLabel } from "@/lib/product-kind";
import { ArrowLeft, Flag, Activity, Loader2, KanbanSquare, Pencil, Users, BrainCircuit, PauseCircle, CheckCircle2, Play } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { getProjectDocumentation, saveProjectDocumentation } from "@/lib/project-documentation";
import { useRefreshQueries } from "@/lib/refresh-queries";
import { useAuth } from "@/context/AuthContext";
import { canCreateSoftwareProduct, canSetProductLifecycle, canUseAiAdvisor, canWorkBoard } from "@/lib/software-roles";
import { productLifecyclePatch } from "@/lib/project-lifecycle";
import { ContributorsEditor } from "@/components/ContributorsEditor";
import { formatContributor, sanitizeContributors, type ProjectContributor } from "@/lib/developer-work";
import { formatMoney, monthsActive, totalExpense } from "@/lib/project-cost";
import { TaskTimelineBadge } from "@/components/TaskTimelineBadge";

export default function ProjectDetail() {
  const { user } = useAuth();
  const canEdit = canCreateSoftwareProduct(user?.role);
  const canLifecycle = canSetProductLifecycle(user?.role);
  const showBoard = canWorkBoard(user?.role);
  const showAi = canUseAiAdvisor(user?.role);
  const { id } = useParams();
  const projectId = parseInt(id || '0');
  const canEditDevelopers = canWorkBoard(user?.role);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [documentation, setDocumentation] = useState("");
  const [docSaved, setDocSaved] = useState(false);
  const [contributors, setContributors] = useState<ProjectContributor[]>([]);
  
  const projectQuery = useGetProject(projectId);
  const { data: project, isLoading: projLoading } = projectQuery;
  const { data: tasks, isLoading: tasksLoading } = useListTasks(projectId);
  const { data: teamMembers } = useListUsers();
  const refresh = useRefreshQueries();
  const updateProjectMutation = useUpdateProject({
    mutation: {
      onSuccess: async () => {
        setIsEditOpen(false);
        await refresh(projectQuery.queryKey);
      },
    },
  });

  useEffect(() => {
    if (!projectId) return;
    setDocumentation(getProjectDocumentation(projectId));
    setDocSaved(false);
  }, [projectId]);

  useEffect(() => {
    setContributors(
      (project?.contributors || []).map((contributor) => ({
        name: contributor.name,
        userId: contributor.userId ?? null,
        parts: (contributor.parts || []) as ProjectContributor["parts"],
      })),
    );
  }, [project]);

  if (projLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>;
  if (!project) return <div className="p-12 text-center text-red-400">Software product not found</div>;

  const continuous = isContinuousKind(project.type);
  const closed = isProductClosed(project.status);
  const continuousActive = continuous && !closed;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link href="/projects" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to software products
        </Link>
        {showAi && (
          <Link href={`/ai-advisor?projectId=${project.id}`}>
            <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none">
              <BrainCircuit className="w-4 h-4 mr-2" />
              Analyze with AI Advisor
            </Button>
          </Link>
        )}
      </div>
      {showAi && (
        <p className="text-sm text-slate-400 -mt-3">
          Generate an AI analysis from this product’s details, costs, developers, and documentation.
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Col - Details */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="p-6">
            <div className="flex justify-end mb-4 gap-2 flex-wrap">
            {canLifecycle && project.status !== "inactive" && (
              <Button
                variant="outline"
                size="sm"
                isLoading={updateProjectMutation.isPending}
                onClick={() => updateProjectMutation.mutate({
                  id: project.id,
                  data: productLifecyclePatch("inactive", project),
                })}
              >
                <PauseCircle className="w-4 h-4 mr-2" />
                Mark inactive
              </Button>
            )}
            {canLifecycle && project.status !== "completed" && (
              <Button
                size="sm"
                isLoading={updateProjectMutation.isPending}
                onClick={() => updateProjectMutation.mutate({
                  id: project.id,
                  data: productLifecyclePatch("completed", project),
                })}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark completed
              </Button>
            )}
            {canLifecycle && closed && (
              <Button
                variant="outline"
                size="sm"
                isLoading={updateProjectMutation.isPending}
                onClick={() => updateProjectMutation.mutate({
                  id: project.id,
                  data: productLifecyclePatch("in_progress", project),
                })}
              >
                <Play className="w-4 h-4 mr-2" />
                Reactivate
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            )}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="custom" className={continuousActive ? "bg-cyan-500/15 text-cyan-200" : getStatusColor(project.status)}>
                {productStatusLabel(project).toUpperCase()}
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
              {continuousActive ? (
                <div>
                  <p className="text-sm text-cyan-200 font-medium">Ongoing — this work does not complete</p>
                  <p className="text-xs text-slate-500 mt-1">Hosting, SSL, and cloud security stay open as continuous operations until marked inactive or completed.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm flex items-center"><Activity className="w-4 h-4 mr-2"/> Progress</span>
                    <span className="text-white font-medium">{project.completionRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${project.completionRate}%` }} />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/5">
              <div>
                <p className="text-xs text-slate-500 mb-1">Product kind</p>
                <p className="text-sm text-white">{productKindLabel(project.type)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Initial cost</p>
                <p className="text-sm text-white">{formatMoney(project.initialCost ?? project.budget)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Monthly cost</p>
                <p className="text-sm text-white">{formatMoney(project.monthlyCost)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Country</p>
                <p className="text-sm text-white">{project.country || 'Global'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Started</p>
                <p className="text-sm text-white">{project.startDate ? format(new Date(project.startDate.includes("T") ? project.startDate : `${project.startDate}T12:00:00`), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Completed</p>
                <p className="text-sm text-white">{continuousActive ? "Never ends" : project.endDate ? format(new Date(project.endDate.includes("T") ? project.endDate : `${project.endDate}T12:00:00`), 'MMM d, yyyy') : closed ? "Date not set" : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total expense</p>
                <p className="text-sm text-white">{formatCurrency(totalExpense(project))}</p>
                <p className="text-[11px] text-slate-500 mt-1">{monthsActive(project)} month{monthsActive(project) === 1 ? "" : "s"} of monthly cost</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary" />
                  Developers
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Exact developer names and the parts they worked on.
                </p>
              </div>
            </div>
            {canEditDevelopers ? (
              <>
                <ContributorsEditor
                  value={contributors}
                  onChange={setContributors}
                  teamMembers={teamMembers || []}
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    isLoading={updateProjectMutation.isPending}
                    onClick={() => {
                      updateProjectMutation.mutate({
                        id: project.id,
                        data: { contributors: sanitizeContributors(contributors) },
                      });
                    }}
                  >
                    Save developers
                  </Button>
                </div>
              </>
            ) : (project.contributors || []).length ? (
              <ul className="space-y-2">
                {(project.contributors || []).map((contributor, index) => (
                  <li key={`${contributor.name}-${index}`} className="text-sm text-slate-300">
                    {formatContributor(contributor)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No developers recorded yet.</p>
            )}
          </Card>
          
          {showAi && (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Project Documentation</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Paste project requirements, process notes, or business context here for this specific project.
                </p>
              </div>
              {docSaved && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Saved
                </Badge>
              )}
            </div>
            <Textarea
              value={documentation}
              onChange={(event) => {
                setDocumentation(event.target.value);
                setDocSaved(false);
              }}
              placeholder="Paste the project documentation here..."
              className="min-h-64 border-border bg-input/50 text-sm text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                The AI Advisor will include this documentation in its analysis for this project.
              </p>
              <Button
                type="button"
                onClick={() => {
                  saveProjectDocumentation(project.id, documentation);
                  setDocSaved(true);
                }}
              >
                Save Documentation
              </Button>
            </div>
          </Card>
          )}
        </div>

        {/* Right Col - Mini Board */}
        <div className="w-full lg:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center"><KanbanSquare className="w-5 h-5 mr-2 text-primary"/> Task Overview</h3>
            {showBoard && (
              <Link href="/board">
                <Button variant="outline" size="sm">Go to Full Board</Button>
              </Link>
            )}
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
                        <div className="mb-2">
                          <TaskTimelineBadge dueDate={task.dueDate} status={task.status} />
                        </div>
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

      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit software product">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const type = (fd.get("type") as "web" | "desktop" | "mobile" | "enterprise" | "continuous") || "web";
            const status = fd.get("status") as "planning" | "in_progress" | "on_hold" | "inactive" | "completed" | "cancelled";
            const nextClosed = status === "completed" || status === "inactive" || status === "cancelled";
            updateProjectMutation.mutate({
              id: project.id,
              data: {
                name: fd.get("name") as string,
                description: (fd.get("description") as string) || undefined,
                type,
                status,
                priority: fd.get("priority") as "low" | "medium" | "high" | "critical",
                country: (fd.get("country") as string) || undefined,
                startDate: (fd.get("startDate") as string) || undefined,
                endDate: nextClosed ? ((fd.get("endDate") as string) || project.endDate || undefined) : (fd.get("endDate") as string) || undefined,
                initialCost: fd.get("initialCost") ? Number(fd.get("initialCost")) : null,
                monthlyCost: fd.get("monthlyCost") ? Number(fd.get("monthlyCost")) : null,
                budget: fd.get("initialCost") ? Number(fd.get("initialCost")) : null,
                completionRate: status === "completed" ? 100 : fd.get("completionRate") ? Number(fd.get("completionRate")) : undefined,
              },
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Product name</label>
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
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Product kind</label>
              <select
                name="type"
                defaultValue={PRODUCT_KINDS.some((kind) => kind.value === project.type) ? project.type : "web"}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {PRODUCT_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select
                name="status"
                defaultValue={PRODUCT_STATUSES.some((item) => item.value === project.status) ? project.status : "in_progress"}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {PRODUCT_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
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
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Start date</label>
              <Input name="startDate" type="date" defaultValue={project.startDate || ""} />
            </div>
            {!continuousActive && (
            <>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Completed date</label>
              <Input name="endDate" type="date" defaultValue={project.endDate || ""} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Completion %</label>
              <Input name="completionRate" type="number" min="0" max="100" defaultValue={project.completionRate} />
            </div>
            </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Initial cost (NGN)</label>
              <Input name="initialCost" type="number" min="0" step="0.01" defaultValue={project.initialCost ?? project.budget ?? ""} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Monthly cost (NGN)</label>
              <Input name="monthlyCost" type="number" min="0" step="0.01" defaultValue={project.monthlyCost ?? ""} />
            </div>
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

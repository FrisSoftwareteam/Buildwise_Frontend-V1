import { useState } from "react";
import { useListProjects, useCreateProject, useListUsers, useUpdateProject } from "@workspace/api-client-react";
import { Button, Badge, Input, Dialog } from "@/components/ui/shared";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { productKindBadgeClass, productKindLabel, PRODUCT_KINDS, isContinuousKind, isProductClosed, productStatusLabel } from "@/lib/product-kind";
import type { Project } from "@workspace/api-client-react";
import { Plus, Search, Building2, Loader2, ArrowDownWideNarrow, PauseCircle, CheckCircle2, Play } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useRefreshQueries } from "@/lib/refresh-queries";
import { useAuth } from "@/context/AuthContext";
import { canCreateSoftwareProduct, canSetProductLifecycle } from "@/lib/software-roles";
import { productLifecyclePatch } from "@/lib/project-lifecycle";
import { formatContributor, sanitizeContributors, type ProjectContributor } from "@/lib/developer-work";
import { ContributorsEditor } from "@/components/ContributorsEditor";
import { formatMoney, monthsActive, rankProjectsByExpense, totalExpense } from "@/lib/project-cost";

function formatProjectDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
}

function ProductTable({
  projects,
  onOpen,
  canLifecycle,
  pendingId,
  onSetLifecycle,
}: {
  projects: Project[];
  onOpen: (id: number) => void;
  canLifecycle: boolean;
  pendingId?: number | null;
  onSetLifecycle: (project: Project, status: "inactive" | "completed" | "in_progress") => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className={`w-full ${canLifecycle ? "min-w-[1480px]" : "min-w-[1320px]"} text-left text-sm`}>
            <thead className="bg-black/40 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium w-16">S/N</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium w-28">Kind</th>
                <th className="px-4 py-3 font-medium w-32">Status</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Developers</th>
                <th className="px-4 py-3 font-medium w-32">Started</th>
                <th className="px-4 py-3 font-medium w-32">Completed</th>
                <th className="px-4 py-3 font-medium w-36 text-right">Completion</th>
                <th className="px-4 py-3 font-medium w-40 text-right">Cost till date</th>
                {canLifecycle && <th className="px-4 py-3 font-medium w-48">Actions</th>}
              </tr>
            </thead>
        <tbody className="divide-y divide-white/5">
          {projects.map((project, index) => {
            const continuous = isContinuousKind(project.type);
            const closed = isProductClosed(project.status);
            const continuousActive = continuous && !closed;
            return (
              <tr
                key={project.id}
                className="bg-card/40 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => onOpen(project.id)}
              >
                <td className="px-4 py-3 align-top text-slate-400 font-mono text-xs">{index + 1}</td>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-white">{project.name}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge variant="outline" className={`${productKindBadgeClass(project.type)} text-[10px] py-0 h-5`}>
                    {productKindLabel(project.type)}
                  </Badge>
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge
                    variant="custom"
                    className={`${continuousActive ? "bg-cyan-500/15 text-cyan-200" : getStatusColor(project.status)} text-[10px] py-0 h-5`}
                  >
                    {productStatusLabel(project).toUpperCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 align-top text-slate-400 text-xs leading-5">
                  {project.description || "No description provided."}
                </td>
                <td className="px-4 py-3 align-top text-slate-300 text-xs leading-5">
                  {(project.contributors || []).length
                    ? (project.contributors || []).map(formatContributor).join("; ")
                    : "—"}
                </td>
                <td className="px-4 py-3 align-top text-slate-300 text-xs whitespace-nowrap">
                  {formatProjectDate(project.startDate)}
                </td>
                <td className="px-4 py-3 align-top text-slate-300 text-xs whitespace-nowrap">
                  {continuousActive ? "Never ends" : formatProjectDate(project.endDate)}
                </td>
                <td className="px-4 py-3 align-top">
                  {continuousActive ? (
                    <p className="text-xs text-cyan-200 text-right">Ongoing</p>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <div className="h-1.5 w-20 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${project.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-white w-8 text-right">{project.completionRate}%</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-right text-white text-xs font-medium whitespace-nowrap">
                  {formatCurrency(totalExpense(project))}
                </td>
                {canLifecycle && (
                  <td className="px-4 py-3 align-top" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-col gap-1.5">
                      {project.status !== "inactive" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={pendingId === project.id}
                          onClick={() => onSetLifecycle(project, "inactive")}
                        >
                          <PauseCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Button>
                      )}
                      {project.status !== "completed" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={pendingId === project.id}
                          onClick={() => onSetLifecycle(project, "completed")}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Button>
                      )}
                      {closed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={pendingId === project.id}
                          onClick={() => onSetLifecycle(project, "in_progress")}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const canCreate = canCreateSoftwareProduct(user?.role);
  const canLifecycle = canSetProductLifecycle(user?.role);
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newContributors, setNewContributors] = useState<ProjectContributor[]>([]);
  const projectsQuery = useListProjects();
  const { data: projects, isLoading } = projectsQuery;
  const { data: teamMembers } = useListUsers();
  const refresh = useRefreshQueries();
  
  const createMutation = useCreateProject({
    mutation: {
      onSuccess: async () => {
        setIsCreateOpen(false);
        setNewContributors([]);
        await refresh(projectsQuery.queryKey);
      }
    }
  });
  const updateMutation = useUpdateProject({
    mutation: {
      onSuccess: async () => {
        await refresh(projectsQuery.queryKey);
      },
    },
  });

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.contributors || []).some((contributor) => contributor.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];
  const deliveryProducts = filteredProjects.filter((project) => !isContinuousKind(project.type));
  const continuousProducts = filteredProjects.filter((project) => isContinuousKind(project.type));
  const tableProps = {
    onOpen: (id: number) => setLocation(`/projects/${id}`),
    canLifecycle,
    pendingId: updateMutation.isPending ? updateMutation.variables?.id ?? null : null,
    onSetLifecycle: (project: Project, status: "inactive" | "completed" | "in_progress") => {
      updateMutation.mutate({
        id: project.id,
        data: productLifecyclePatch(status, project),
      });
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Software products</h2>
          <p className="text-slate-400 text-sm">
            {filteredProjects.length} product{filteredProjects.length === 1 ? "" : "s"}
            {searchTerm.trim() ? " matching this search" : ""}. Issuer meetings live under Governance.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search products..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New product
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filteredProjects.length ? (
        <div className="space-y-8">
          {deliveryProducts.length > 0 && (
            <ProductTable projects={deliveryProducts} {...tableProps} />
          )}
          {continuousProducts.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Continuous</h3>
                <p className="text-sm text-slate-400">
                  Hosting, SSL, and cloud security. A project manager can mark these inactive or completed.
                </p>
              </div>
              <ProductTable projects={continuousProducts} {...tableProps} />
            </div>
          )}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowDownWideNarrow className="w-5 h-5 text-primary" />
                Expense ranking
              </h3>
              <p className="text-sm text-slate-400">
                Highest to lowest total cost: initial cost plus monthly cost for each month the product has been active.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-black/40 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium w-16">Rank</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Initial cost</th>
                    <th className="px-4 py-3 font-medium text-right">Monthly cost</th>
                    <th className="px-4 py-3 font-medium text-right">Months</th>
                    <th className="px-4 py-3 font-medium text-right">Total expense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rankProjectsByExpense(filteredProjects).map((project, index) => (
                    <tr
                      key={project.id}
                      className="bg-card/40 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/projects/${project.id}`)}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">{project.name}</td>
                      <td className="px-4 py-3 text-right text-slate-300 text-xs">{formatMoney(project.initialCost ?? project.budget)}</td>
                      <td className="px-4 py-3 text-right text-slate-300 text-xs">{formatMoney(project.monthlyCost)}</td>
                      <td className="px-4 py-3 text-right text-slate-300 text-xs">{monthsActive(project)}</td>
                      <td className="px-4 py-3 text-right text-white text-xs font-medium">{formatCurrency(totalExpense(project))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No software products found matching your criteria.</p>
        </div>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setNewContributors([]); }} title="New software product">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createMutation.mutate({
            data: {
              name: fd.get('name') as string,
              description: fd.get('description') as string,
              type: fd.get('type') as any,
              status: fd.get('type') === 'continuous' ? 'in_progress' : fd.get('status') as any,
              priority: fd.get('priority') as any,
              country: fd.get('country') as string,
              startDate: (fd.get('startDate') as string) || undefined,
              endDate: fd.get('type') === 'continuous' ? undefined : (fd.get('endDate') as string) || undefined,
              initialCost: fd.get('initialCost') ? Number(fd.get('initialCost')) : undefined,
              monthlyCost: fd.get('monthlyCost') ? Number(fd.get('monthlyCost')) : undefined,
              contributors: sanitizeContributors(newContributors),
            }
          });
        }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Project Name</label>
            <Input name="name" required placeholder="e.g. Shareholder portal (web app)" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Description</label>
            <Input name="description" placeholder="Brief overview..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Product kind</label>
              <select name="type" defaultValue="web" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                {PRODUCT_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Use Continuous for never-ending work such as hosting and SSL.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select name="status" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Priority</label>
              <select name="priority" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Country</label>
              <Input name="country" placeholder="e.g. Nigeria" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Start date</label>
              <Input name="startDate" type="date" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Completed date</label>
              <Input name="endDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Initial cost (NGN)</label>
              <Input name="initialCost" type="number" min="0" step="0.01" placeholder="Setup / one-off cost" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Monthly cost (NGN)</label>
              <Input name="monthlyCost" type="number" min="0" step="0.01" placeholder="Recurring cost" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Developers</label>
            <p className="text-xs text-slate-500 mb-2">Exact names and the parts they worked on.</p>
            <ContributorsEditor
              value={newContributors}
              onChange={setNewContributors}
              teamMembers={teamMembers || []}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create product</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

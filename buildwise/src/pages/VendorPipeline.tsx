import { useEffect, useMemo, useState } from "react";
import {
  useCreateVendorProject,
  useListProjects,
  useListVendorProjects,
  useListVendors,
  useUpdateVendorProject,
  type VendorProject,
  type VendorProjectStage,
} from "@workspace/api-client-react";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { formatCurrency } from "@/lib/utils";
import { GitMerge, Loader2, ArrowRight, ArrowLeft, Building2, Calendar, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useRefreshQueries } from "@/lib/refresh-queries";
import { useAuth } from "@/context/AuthContext";
import { canManageVendors } from "@/lib/software-roles";

const PIPELINE_STAGES = [
  { id: "submitted", label: "Submitted", hint: "New proposal", color: "border-slate-400", tint: "bg-slate-500/10 text-slate-200" },
  { id: "under_review", label: "Under review", hint: "Internal checks", color: "border-sky-400", tint: "bg-sky-500/10 text-sky-200" },
  { id: "negotiation", label: "Negotiation", hint: "Commercial terms", color: "border-amber-400", tint: "bg-amber-500/10 text-amber-200" },
  { id: "approved", label: "Approved", hint: "Ready to start", color: "border-emerald-400", tint: "bg-emerald-500/10 text-emerald-200" },
  { id: "handover_in_progress", label: "In build", hint: "Work underway", color: "border-violet-400", tint: "bg-violet-500/10 text-violet-200" },
  { id: "handover_complete", label: "Complete", hint: "Handed over", color: "border-teal-400", tint: "bg-teal-500/10 text-teal-200" },
] as const;

type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

const STAGE_ACTIONS: Record<PipelineStageId, string> = {
  submitted: "Send to review",
  under_review: "Start negotiation",
  negotiation: "Approve",
  approved: "Start build",
  handover_in_progress: "Mark complete",
  handover_complete: "Complete",
};

function isPipelineStage(stage: string): stage is PipelineStageId {
  return PIPELINE_STAGES.some((item) => item.id === stage);
}

function stageIndex(stage: string) {
  return PIPELINE_STAGES.findIndex((item) => item.id === stage);
}

function money(value?: number | string | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

export default function VendorPipeline() {
  const { user } = useAuth();
  const canManage = canManageVendors(user?.role);
  const vendorsQuery = useListVendors();
  const projectsQuery = useListProjects();
  const vendorProjectsQuery = useListVendorProjects();
  const { data: vendors } = vendorsQuery;
  const { data: products } = projectsQuery;
  const { data: vendorProjects, isLoading } = vendorProjectsQuery;
  const refresh = useRefreshQueries();
  const [items, setItems] = useState<VendorProject[]>([]);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [selected, setSelected] = useState<VendorProject | null>(null);
  const [notes, setNotes] = useState("");
  const [negotiationPrice, setNegotiationPrice] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    setItems(vendorProjects || []);
  }, [vendorProjects]);

  const createMutation = useCreateVendorProject({
    mutation: {
      onSuccess: async () => {
        setIsCreateOpen(false);
        await refresh(vendorProjectsQuery.queryKey);
      },
    },
  });
  const updateMutation = useUpdateVendorProject({
    mutation: {
      onSuccess: async () => {
        await refresh(vendorProjectsQuery.queryKey);
      },
      onError: async () => {
        await refresh(vendorProjectsQuery.queryKey);
      },
    },
  });

  const vendorNameById = useMemo(
    () => new Map((vendors || []).map((vendor) => [vendor.id, vendor.name])),
    [vendors],
  );
  const productNameById = useMemo(
    () => new Map((products || []).map((product) => [product.id, product.name])),
    [products],
  );

  const openItems = items.filter((item) => item.stage !== "rejected" && item.stage !== "handover_complete");
  const completedItems = items.filter((item) => item.stage === "handover_complete");
  const rejectedItems = items.filter((item) => item.stage === "rejected");
  const pipelineValue = openItems.reduce((sum, item) => sum + money(item.estimatedValue), 0);

  const moveToStage = (item: VendorProject, stage: VendorProjectStage) => {
    if (item.stage === stage) return;
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, stage } : row)));
    if (selected?.id === item.id) {
      setSelected({ ...item, stage });
    }
    updateMutation.mutate({
      id: item.id,
      data: {
        title: item.title,
        description: item.description,
        estimatedValue: money(item.estimatedValue) || null,
        handoverDate: item.handoverDate,
        reviewNotes: item.reviewNotes,
        projectId: item.projectId,
        stage,
      },
    });
  };

  const advance = (item: VendorProject) => {
    const index = stageIndex(item.stage);
    const next = PIPELINE_STAGES[index + 1];
    if (next) moveToStage(item, next.id);
  };

  const goBack = (item: VendorProject) => {
    const index = stageIndex(item.stage);
    const previous = PIPELINE_STAGES[index - 1];
    if (previous) moveToStage(item, previous.id);
  };

  const savePrice = (item: VendorProject, nextPrice: number | null) => {
    const estimatedValue = nextPrice && Number.isFinite(nextPrice) ? nextPrice : null;
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, estimatedValue } : row)),
    );
    if (selected?.id === item.id) {
      setSelected({ ...item, estimatedValue });
      setNegotiationPrice(estimatedValue ? String(estimatedValue) : "");
    }
    updateMutation.mutate({
      id: item.id,
      data: {
        title: item.title,
        description: item.description,
        estimatedValue,
        handoverDate: item.handoverDate,
        reviewNotes: item.reviewNotes,
        projectId: item.projectId,
        stage: item.stage,
      },
    });
  };

  const saveNotes = () => {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.id,
      data: {
        title: selected.title,
        description: selected.description,
        estimatedValue: money(selected.estimatedValue) || null,
        handoverDate: selected.handoverDate,
        reviewNotes: notes,
        projectId: selected.projectId,
        stage: selected.stage,
      },
    });
    setSelected({ ...selected, reviewNotes: notes });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center">
            <GitMerge className="w-6 h-6 mr-3 text-indigo-400" />
            Vendor onboarding pipeline
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Key in a vendor proposal, then move it from submission through handover.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/vendors">
            <Button variant="outline">Manage vendors</Button>
          </Link>
          {canManage && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Key in proposal
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <Card className="p-4 border-white/5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active in pipeline</p>
          <p className="mt-2 text-2xl font-bold text-white">{openItems.length}</p>
        </Card>
        <Card className="p-4 border-white/5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Open value</p>
          <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(pipelineValue)}</p>
        </Card>
        <Card className="p-4 border-white/5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Handed over</p>
          <p className="mt-2 text-2xl font-bold text-white">{completedItems.length}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 shrink-0">
        {PIPELINE_STAGES.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 ${stage.tint}`}>{index + 1}. {stage.label}</span>
            {index < PIPELINE_STAGES.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-600" />}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max h-[calc(100vh-22rem)] px-1">
            {PIPELINE_STAGES.map((stage, index) => {
              const stageItems = items.filter((item) => item.stage === stage.id);
              const isDropTarget = dropStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onDragOver={(event) => {
                    if (!canManage) return;
                    event.preventDefault();
                    setDropStage(stage.id);
                  }}
                  onDragLeave={() => {
                    if (dropStage === stage.id) setDropStage(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const item = items.find((row) => row.id === draggedId);
                    if (item) moveToStage(item, stage.id);
                    setDraggedId(null);
                    setDropStage(null);
                  }}
                  className={`w-72 flex flex-col h-full rounded-2xl border bg-slate-900/40 transition-colors ${
                    isDropTarget ? "border-indigo-400/60 bg-indigo-500/10" : "border-white/5"
                  }`}
                >
                  <div className={`p-4 border-b-2 ${stage.color} shrink-0 rounded-t-2xl bg-black/20`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-semibold text-white">{stage.label}</h3>
                        <p className="text-[11px] text-slate-500 mt-1">{stage.hint}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-white/10">{stageItems.length}</Badge>
                        {canManage && stage.id === "submitted" && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageItems.map((item) => {
                      const vendorName = vendorNameById.get(item.vendorId) || `Vendor ${item.vendorId}`;
                      const productName = item.projectId ? productNameById.get(item.projectId) : null;
                      return (
                        <Card
                          key={item.id}
                          draggable={canManage}
                          onDragStart={() => setDraggedId(item.id)}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDropStage(null);
                          }}
                          onClick={() => {
                            setSelected(item);
                            setNotes(item.reviewNotes || "");
                            setNegotiationPrice(money(item.estimatedValue) ? String(money(item.estimatedValue)) : "");
                          }}
                          className={`p-4 bg-card/90 border-white/5 hover:border-indigo-500/40 transition-all ${canManage ? "cursor-grab" : "cursor-pointer"} ${draggedId === item.id ? "opacity-60" : ""}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300 bg-indigo-500/10">
                              {vendorName}
                            </Badge>
                            {money(item.estimatedValue) > 0 && (
                              <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
                                {formatCurrency(money(item.estimatedValue))}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-white leading-snug">{item.title}</h4>
                          {productName && (
                            <p className="text-[11px] text-slate-400 mt-1 truncate">Product: {productName}</p>
                          )}
                          <div className="flex items-center text-[11px] text-slate-500 mt-3 pt-3 border-t border-white/5">
                            <Calendar className="w-3 h-3 mr-1.5" />
                            {formatDate(item.submittedAt)}
                          </div>
                          {canManage && item.stage === "negotiation" && (
                            <form
                              className="mt-3 space-y-2"
                              onClick={(event) => event.stopPropagation()}
                              onSubmit={(event) => {
                                event.preventDefault();
                                const nextPrice = Number(new FormData(event.currentTarget).get("negotiationPrice"));
                                savePrice(item, Number.isFinite(nextPrice) ? nextPrice : null);
                              }}
                            >
                              <label className="text-[11px] text-amber-200 block">Negotiation price (NGN)</label>
                              <div className="flex gap-2">
                                <Input
                                  key={`${item.id}-${item.estimatedValue ?? "0"}`}
                                  name="negotiationPrice"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={money(item.estimatedValue) || ""}
                                  className="h-8 text-xs"
                                />
                                <Button type="submit" size="sm" className="h-8 shrink-0">
                                  Save
                                </Button>
                              </div>
                            </form>
                          )}
                          {canManage && (
                            <div className="mt-3 flex gap-2" onClick={(event) => event.stopPropagation()}>
                              {index > 0 && (
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => goBack(item)}>
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {index < PIPELINE_STAGES.length - 1 && (
                                <Button type="button" size="sm" className="h-7 flex-1" onClick={() => advance(item)}>
                                  {STAGE_ACTIONS[stage.id]}
                                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                    {stageItems.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
                        <p className="text-slate-500 text-xs">
                          {stage.id === "submitted"
                            ? "No proposals keyed in yet."
                            : "Nothing in this stage yet."}
                        </p>
                        {canManage && stage.id === "submitted" && (
                          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Key in proposal
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rejectedItems.length > 0 && (
        <Card className="p-4 border-white/5">
          <h3 className="text-sm font-semibold text-white mb-3">Rejected</h3>
          <div className="space-y-2">
            {rejectedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{item.title}</span>
                {canManage && (
                  <Button type="button" variant="outline" size="sm" onClick={() => moveToStage(item, "submitted")}>
                    Restore to submitted
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || "Proposal"}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> Vendor</p>
                <p className="mt-1 text-white">{vendorNameById.get(selected.vendorId) || `Vendor ${selected.vendorId}`}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {selected.stage === "negotiation" ? "Negotiation price" : "Value"}
                </p>
                {canManage && selected.stage === "negotiation" ? (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const nextPrice = Number(negotiationPrice);
                      savePrice(selected, Number.isFinite(nextPrice) ? nextPrice : null);
                    }}
                  >
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={negotiationPrice}
                      onChange={(event) => setNegotiationPrice(event.target.value)}
                      className="h-9"
                    />
                    <Button type="submit" size="sm" className="h-9 shrink-0" isLoading={updateMutation.isPending}>
                      Save
                    </Button>
                  </form>
                ) : (
                  <p className="mt-1 text-white">{money(selected.estimatedValue) ? formatCurrency(money(selected.estimatedValue)) : "—"}</p>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Software product</p>
                <p className="mt-1 text-white">{selected.projectId ? productNameById.get(selected.projectId) || "Linked product" : "Not linked yet"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Submitted</p>
                <p className="mt-1 text-white">{formatDate(selected.submittedAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400">{selected.description || "No proposal notes yet."}</p>
            </div>
            {canManage && isPipelineStage(selected.stage) && (
              <div className="flex flex-wrap gap-2">
                {stageIndex(selected.stage) > 0 && (
                  <Button type="button" variant="outline" onClick={() => goBack(selected)}>Move back</Button>
                )}
                {stageIndex(selected.stage) < PIPELINE_STAGES.length - 1 && (
                  <Button type="button" onClick={() => advance(selected)}>{STAGE_ACTIONS[selected.stage]}</Button>
                )}
                {selected.stage !== "rejected" && selected.stage !== "handover_complete" && (
                  <Button type="button" variant="destructive" onClick={() => moveToStage(selected, "rejected")}>Reject</Button>
                )}
              </div>
            )}
            {canManage && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Review notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="flex min-h-24 w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Commercial comments, risks, or next actions..."
                />
                <div className="mt-3 flex justify-end">
                  <Button type="button" isLoading={updateMutation.isPending} onClick={saveNotes}>Save notes</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Key in proposal">
        {(vendors || []).length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Register a vendor first, then key in their proposal here.</p>
            <Link href="/vendors">
              <Button>Go to vendors</Button>
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              const vendorId = Number(fd.get("vendorId"));
              const projectId = fd.get("projectId") ? Number(fd.get("projectId")) : null;
              const estimatedValue = fd.get("estimatedValue") ? Number(fd.get("estimatedValue")) : null;
              createMutation.mutate({
                data: {
                  vendorId,
                  title: String(fd.get("title") || "").trim(),
                  description: (fd.get("description") as string) || undefined,
                  estimatedValue: estimatedValue && Number.isFinite(estimatedValue) ? estimatedValue : undefined,
                  handoverDate: (fd.get("handoverDate") as string) || undefined,
                  projectId: projectId || undefined,
                },
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor</label>
              <select
                name="vendorId"
                required
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Select vendor</option>
                {(vendors || []).map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Proposal title</label>
              <Input name="title" required placeholder="e.g. Onboarding automation rollout" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Details</label>
              <textarea
                name="description"
                placeholder="What the vendor is proposing to deliver..."
                className="flex min-h-24 w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Software product (optional)</label>
              <select
                name="projectId"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Not linked yet</option>
                {(products || []).map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Estimated value (NGN)</label>
                <Input name="estimatedValue" type="number" min="0" step="0.01" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Handover date</label>
                <Input name="handoverDate" type="date" />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createMutation.isPending}>Save proposal</Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useCreateMilestone, useDeleteMilestone, useListMilestones, useUpdateMilestone } from "@workspace/api-client-react";
import { Button, Input } from "@/components/ui/shared";
import { useAuth } from "@/context/AuthContext";
import { useRefreshQueries } from "@/lib/refresh-queries";
import { canCreateSoftwareProduct, isSuperAdminEmail } from "@/lib/software-roles";
import { TaskTimelineBadge } from "@/components/TaskTimelineBadge";
import { AlertTriangle, CheckCircle2, Circle, Loader2, Mail, MailX, Plus, Send, Star, Trash2 } from "lucide-react";

type Workflow = "draft" | "submitted" | "edit_requested" | "editable" | "review_requested" | "completed";

type VendorMilestone = {
  id: number;
  title: string;
  dueDate?: string | null;
  done: boolean;
  source?: string | null;
  vendorId?: number | null;
  workflow?: Workflow | null;
  editRequestReason?: string | null;
  starAwarded?: boolean;
  dueSoonAlertSentOn?: string | null;
  dueSoonAlertError?: string | null;
  dueTodayAlertSentOn?: string | null;
  dueTodayAlertError?: string | null;
  overdueAlertSentOn?: string | null;
  overdueAlertError?: string | null;
};

function actingHeaders(user?: { id?: number; email?: string } | null) {
  return {
    "Content-Type": "application/json",
    ...(user?.id ? { "x-buildwise-user-id": String(user.id) } : {}),
    ...(user?.email ? { "x-buildwise-user-email": user.email } : {}),
  };
}

async function postJson(path: string, user: { id?: number; email?: string } | null, body?: unknown) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: actingHeaders(user),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }
  return data;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(milestone: VendorMilestone) {
  return Boolean(
    milestone.dueDate &&
      milestone.dueDate < todayStamp() &&
      milestone.workflow !== "completed" &&
      !milestone.done,
  );
}

function formatMailDay(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MailStatus({
  label,
  sentOn,
  error,
}: {
  label: string;
  sentOn?: string | null;
  error?: string | null;
}) {
  if (!sentOn && !error) {
    return (
      <p className="text-xs text-slate-500 flex items-start gap-1.5">
        <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        {label}: not sent yet
      </p>
    );
  }
  if (error && !sentOn) {
    return (
      <p className="text-xs text-red-300 flex items-start gap-1.5">
        <MailX className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        {label}: failed — {error}
      </p>
    );
  }
  return (
    <p className="text-xs text-emerald-300 flex items-start gap-1.5">
      <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      {label}: sent {formatMailDay(sentOn)}
      {error ? ` (last error: ${error})` : ""}
    </p>
  );
}

function workflowLabel(milestone: VendorMilestone) {
  switch (milestone.workflow) {
    case "draft":
      return "Draft — not submitted";
    case "submitted":
      return "Submitted to admin";
    case "edit_requested":
      return "Edit request waiting on admin";
    case "editable":
      return "Admin approved editing";
    case "review_requested":
      return "Waiting for admin review";
    case "completed":
      return "Completed — star awarded";
    default:
      return milestone.done ? "Complete" : "Open";
  }
}

export function VendorMilestoneBoard({
  projectId,
  queryKey,
  projectQueryKey,
}: {
  projectId: number;
  queryKey: readonly unknown[];
  projectQueryKey: readonly unknown[];
}) {
  const { user } = useAuth();
  const isVendor = user?.role === "vendor";
  const isStaff = canCreateSoftwareProduct(user?.role) || isSuperAdminEmail(user?.email);
  const refresh = useRefreshQueries();
  const milestonesQuery = useListMilestones(projectId);
  const { data: milestones, isLoading } = milestonesQuery;
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editReason, setEditReason] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const createMilestoneMutation = useCreateMilestone({
    mutation: {
      onSuccess: async () => {
        setTitle("");
        setDueDate("");
        await Promise.all([refresh(queryKey), refresh(projectQueryKey)]);
      },
    },
  });
  const updateMilestoneMutation = useUpdateMilestone({
    mutation: {
      onSuccess: async () => {
        await Promise.all([refresh(queryKey), refresh(projectQueryKey)]);
      },
    },
  });
  const deleteMilestoneMutation = useDeleteMilestone({
    mutation: {
      onSuccess: async () => {
        await Promise.all([refresh(queryKey), refresh(projectQueryKey)]);
      },
    },
  });

  const items = (milestones || []) as VendorMilestone[];
  const drafts = items.filter((item) => item.source === "vendor" && (item.workflow === "draft" || item.workflow === "editable"));
  const overdue = items.filter(isOverdue);
  const mailFailures = items.filter(
    (item) =>
      item.source === "vendor" &&
      ((item.dueSoonAlertError && !item.dueSoonAlertSentOn) ||
        (item.dueTodayAlertError && !item.dueTodayAlertSentOn) ||
        (item.overdueAlertError && !item.overdueAlertSentOn)),
  );

  const pendingAdmin = useMemo(
    () =>
      items.filter(
        (item) => item.source === "vendor" && (item.workflow === "edit_requested" || item.workflow === "review_requested" || item.workflow === "submitted"),
      ),
    [items],
  );

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      await Promise.all([refresh(queryKey), refresh(projectQueryKey)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            RED ALERT — missed milestone date
          </p>
          <ul className="mt-2 space-y-1">
            {overdue.map((item) => (
              <li key={item.id}>
                {item.title} missed {item.dueDate}. Call the vendor and realign immediately.
              </li>
            ))}
          </ul>
        </div>
      )}

      {isStaff && mailFailures.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <p className="font-semibold flex items-center gap-2">
            <MailX className="w-4 h-4" />
            Vendor mail failed for {mailFailures.length} milestone{mailFailures.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {mailFailures.map((item) => (
              <li key={item.id}>
                {item.title}: {item.overdueAlertError || item.dueTodayAlertError || item.dueSoonAlertError}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No milestones yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((milestone) => {
            const vendorOwned = milestone.source === "vendor";
            const canVendorEdit = isVendor && (milestone.workflow === "draft" || milestone.workflow === "editable");
            return (
              <li key={milestone.id} className={`rounded-lg border px-3 py-3 ${isOverdue(milestone) ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-black/20"}`}>
                <div className="flex items-start gap-3">
                  {vendorOwned ? (
                    milestone.workflow === "completed" || milestone.done ? (
                      <Star className="w-5 h-5 text-[#c4a747] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={!isStaff || updateMilestoneMutation.isPending}
                      onClick={() => updateMilestoneMutation.mutate({ id: milestone.id, data: { done: !milestone.done } })}
                      className="shrink-0 text-slate-400 hover:text-primary disabled:opacity-50"
                    >
                      {milestone.done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className={`text-sm break-words whitespace-pre-wrap ${milestone.done ? "text-slate-500 line-through" : "text-white"}`}>{milestone.title}</p>
                    <TaskTimelineBadge dueDate={milestone.dueDate} status={milestone.done || milestone.workflow === "completed" ? "done" : undefined} />
                    {vendorOwned && (
                      <p className="text-xs text-slate-400">{workflowLabel(milestone)}</p>
                    )}
                    {isStaff && vendorOwned && (
                      <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Vendor mail</p>
                        <MailStatus label="Due in 3 days" sentOn={milestone.dueSoonAlertSentOn} error={milestone.dueSoonAlertError} />
                        <MailStatus label="Due today" sentOn={milestone.dueTodayAlertSentOn} error={milestone.dueTodayAlertError} />
                        <MailStatus label="Overdue caution" sentOn={milestone.overdueAlertSentOn} error={milestone.overdueAlertError} />
                      </div>
                    )}
                    {isOverdue(milestone) && (
                      <p className="text-xs font-semibold text-red-300">Missed {milestone.dueDate} — vendor needs to be called and realigned.</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isVendor && canVendorEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={deleteMilestoneMutation.isPending}
                      onClick={() => deleteMilestoneMutation.mutate({ id: milestone.id })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                  {isVendor && canVendorEdit && (
                    <form
                      className="flex flex-col gap-2 w-full"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const nextTitle = String(new FormData(form).get("title") || "").trim();
                        const nextDue = String(new FormData(form).get("dueDate") || "");
                        if (!nextTitle || !nextDue) {
                          setError("Each sub-milestone needs a title and a date.");
                          return;
                        }
                        updateMilestoneMutation.mutate({
                          id: milestone.id,
                          data: { title: nextTitle, dueDate: nextDue },
                        });
                      }}
                    >
                      <textarea name="title" defaultValue={milestone.title} rows={3} className="w-full min-h-[4.5rem] rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                      <Input name="dueDate" type="date" defaultValue={milestone.dueDate || ""} className="sm:w-36 h-8 text-xs shrink-0" />
                      <Button type="submit" size="sm" variant="outline" isLoading={updateMilestoneMutation.isPending}>
                        Save
                      </Button>
                    </form>
                  )}
                  {isVendor && vendorOwned && (milestone.workflow === "submitted" || milestone.workflow === "review_requested") && (
                    <>
                      <Input
                        placeholder="Why do you need to edit?"
                        value={editReason[milestone.id] || ""}
                        onChange={(event) => setEditReason((current) => ({ ...current, [milestone.id]: event.target.value }))}
                        className="h-8 text-xs min-w-[180px] flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            postJson(`/api/milestones/${milestone.id}/request-edit`, user, {
                              reason: editReason[milestone.id] || "Need to change this milestone",
                            }),
                          )
                        }
                      >
                        Request edit
                      </Button>
                    </>
                  )}
                  {isVendor && vendorOwned && milestone.workflow === "submitted" && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#c4a747] hover:bg-[#d4b85c] text-[#0f1c2e]"
                      disabled={busy}
                      onClick={() => run(() => postJson(`/api/milestones/${milestone.id}/request-review`, user))}
                    >
                      Review by admin
                    </Button>
                  )}
                  {isStaff && vendorOwned && milestone.workflow === "edit_requested" && (
                    <>
                      <Button type="button" size="sm" disabled={busy} onClick={() => run(() => postJson(`/api/milestones/${milestone.id}/approve-edit`, user))}>
                        Approve edit
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run(() => postJson(`/api/milestones/${milestone.id}/reject-edit`, user))}>
                        Reject edit
                      </Button>
                    </>
                  )}
                  {isStaff && vendorOwned && milestone.workflow === "review_requested" && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500"
                      disabled={busy}
                      onClick={() => run(() => postJson(`/api/milestones/${milestone.id}/complete`, user))}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Completed
                    </Button>
                  )}
                  {isStaff && !vendorOwned && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => deleteMilestoneMutation.mutate({ id: milestone.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isVendor && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <p className="text-sm text-slate-300">Set multiple sub-milestones and dates, then submit them to admin.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim() || !dueDate) {
                setError("Add a title and a date for each sub-milestone.");
                return;
              }
              setError("");
              createMilestoneMutation.mutate({
                projectId,
                data: { title: title.trim(), dueDate },
              });
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              placeholder="Sub-milestone title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              rows={3}
              className="w-full min-h-[4.5rem] rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="sm:w-44 shrink-0" />
              <Button type="submit" isLoading={createMilestoneMutation.isPending} disabled={!title.trim() || !dueDate}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </form>
          <Button
            type="button"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500"
            disabled={busy || drafts.length === 0}
            onClick={() => run(() => postJson(`/api/projects/${projectId}/milestones/submit`, user))}
          >
            <Send className="w-4 h-4 mr-2" />
            Submit to admin
          </Button>
        </div>
      )}

      {isStaff && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            createMilestoneMutation.mutate({
              projectId,
              data: { title: title.trim(), dueDate: dueDate || undefined },
            });
          }}
          className="flex flex-col gap-2 pt-2 border-t border-white/10"
        >
          <textarea
            placeholder="Add an internal milestone…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            rows={3}
            className="w-full min-h-[4.5rem] rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="sm:w-44 shrink-0" />
            <Button type="submit" isLoading={createMilestoneMutation.isPending} disabled={!title.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}

      {isStaff && pendingAdmin.length > 0 && (
        <p className="text-xs text-amber-300">
          {pendingAdmin.length} vendor milestone{pendingAdmin.length === 1 ? "" : "s"} waiting for admin action.
        </p>
      )}
    </div>
  );
}

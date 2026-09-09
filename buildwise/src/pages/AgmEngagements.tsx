import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { canRunGovernance } from "@/lib/software-roles";
import {
  useAgmEngagements,
  useAgmEngagementsSummary,
  useCreateAgmEngagement,
  useLogAgmEngagement,
  useInitiateAgmVenueInspection,
  useCompleteAgmVenueInspection,
  useSetAgmDividendPosition,
  useNotifyAgmDepartments,
  useSendAgmDemandNotice,
  useRequestAgmItBriefing,
  useAssignAgmStaff,
  useSubmitAgmItems,
  useDecideAgmApproval,
  useSendAgmLogisticsPack,
  useRecordAgmProxyCapture,
  useSendAgmEngagementToBoard,
  type AgmEngagement,
} from "@/lib/operations-api";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  History,
  Landmark,
  Loader2,
  Mail,
  Plus,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";

const STEP_LABELS: Record<number, string> = {
  1: "Client notice received",
  2: "Logged in system",
  3: "Venue inspection",
  4: "Dividend position checked",
  5: "Departments notified",
  6: "Demand notice sent",
  7: "IT briefing requested",
  8: "Staff assigned",
  9: "Items required submitted",
  10: "Approval decision",
  11: "Resubmission loop",
  12: "Logistics pack sent",
  13: "Proxy form capture",
};

type ActionKey =
  | "confirm-log"
  | "start-venue-inspection"
  | "complete-venue-inspection"
  | "set-dividend"
  | "notify-departments"
  | "send-demand-notice"
  | "skip-demand-notice"
  | "request-it-briefing"
  | "assign-staff"
  | "submit-items"
  | "decide-approval"
  | "resubmit-items"
  | "send-logistics"
  | "record-proxy"
  | "send-to-board"
  | "done";

function getCurrentAction(e: AgmEngagement): ActionKey {
  if (e.status === "on_agm_board") return "done";
  if (e.step <= 1) return "confirm-log";
  if (e.step === 2) return "start-venue-inspection";
  if (e.step === 3) {
    if (e.venueInspection.status !== "completed") return "complete-venue-inspection";
    return "set-dividend";
  }
  if (e.step === 4) return "notify-departments";
  if (e.step === 5) {
    if (e.dividendPosition.status === "proposing" && e.demandNotice.status !== "sent") return "send-demand-notice";
    return "skip-demand-notice";
  }
  if (e.step === 6) return "request-it-briefing";
  if (e.step === 7) return "assign-staff";
  if (e.step === 8) return "submit-items";
  if (e.step === 9) return e.approval.status === "rejected" ? "resubmit-items" : "decide-approval";
  if (e.step === 11) return "resubmit-items";
  if (e.step === 12) return e.logistics.status === "sent" ? "record-proxy" : "send-logistics";
  if (e.step === 13) return e.proxyForm.status === "completed" ? "send-to-board" : "record-proxy";
  return "done";
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1">{value || "—"}</p>
    </div>
  );
}

function StepTracker({ engagement }: { engagement: AgmEngagement }) {
  const rejected = engagement.step === 11 || engagement.approval.status === "rejected";
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-[repeat(13,minmax(0,1fr))] gap-2">
      {Array.from({ length: 13 }, (_, index) => index + 1).map((step) => {
        const isRejectedNode = step === 11;
        const passed = engagement.status === "on_agm_board" ? true : step < engagement.step || (step === engagement.step && step === 13 && engagement.proxyForm.status === "completed");
        const isCurrent = step === engagement.step || (isRejectedNode && rejected);
        return (
          <div
            key={step}
            title={STEP_LABELS[step]}
            className={`rounded-lg border px-2 py-2 text-center transition-colors ${
              isRejectedNode && rejected
                ? "border-destructive/40 bg-destructive/10"
                : isCurrent
                ? "border-[#c4a747]/50 bg-[#c4a747]/10"
                : passed
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-white/5 bg-black/20"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                isRejectedNode && rejected
                  ? "text-destructive"
                  : isCurrent
                  ? "text-[#c4a747]"
                  : passed
                  ? "text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TimelineList({ engagement }: { engagement: AgmEngagement }) {
  const entries = [...engagement.timeline].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="mt-0.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c4a747]/15 text-[10px] font-semibold text-[#c4a747]">
              {entry.step}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-white font-medium">{entry.action}</p>
              <span className="text-[10px] text-slate-500">{format(new Date(entry.at), "MMM d, yyyy h:mm a")}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{entry.detail}</p>
            <p className="text-[10px] text-slate-500 mt-1">by {entry.actor}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateEngagementDialog({ isOpen, onClose, actor }: { isOpen: boolean; onClose: () => void; actor: string }) {
  const createEngagement = useCreateAgmEngagement();
  const [format_, setFormat] = useState<"physical" | "virtual">("physical");

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Log a new AGM request">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          createEngagement.mutate(
            {
              clientCompany: String(data.get("clientCompany") || ""),
              contactName: String(data.get("contactName") || ""),
              contactEmail: String(data.get("contactEmail") || ""),
              submittedBy: String(data.get("submittedBy") || actor),
              meetingFormat: format_,
              meetingDate: String(data.get("meetingDate") || ""),
              meetingTime: String(data.get("meetingTime") || ""),
              venue: format_ === "physical" ? String(data.get("venue") || "") : undefined,
              meetingLink: format_ === "virtual" ? String(data.get("meetingLink") || "") : undefined,
              meetingPassword: format_ === "virtual" ? String(data.get("meetingPassword") || "") : undefined,
              notes: String(data.get("notes") || ""),
            },
            { onSuccess: () => onClose() },
          );
        }}
      >
        <p className="text-xs text-slate-400">
          Step 1 — the client company informs Marketing &amp; Business Development of a forthcoming AGM.
        </p>
        <Input name="clientCompany" required placeholder="Client company" />
        <div className="grid grid-cols-2 gap-3">
          <Input name="contactName" required placeholder="Client contact name" />
          <Input name="contactEmail" type="email" placeholder="Client contact email" />
        </div>
        <Input name="submittedBy" required defaultValue={actor} placeholder="Logged by (Marketing / BD)" />
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input type="radio" name="format" checked={format_ === "physical"} onChange={() => setFormat("physical")} />
            Physical
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="format" checked={format_ === "virtual"} onChange={() => setFormat("virtual")} />
            Virtual
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input name="meetingDate" type="date" required />
          <Input name="meetingTime" type="time" required />
        </div>
        {format_ === "physical" ? (
          <Input name="venue" required placeholder="Venue" />
        ) : (
          <>
            <Input name="meetingLink" required placeholder="Meeting link" />
            <Input name="meetingPassword" placeholder="Meeting password / word" />
          </>
        )}
        <textarea
          name="notes"
          placeholder="Notes / agenda"
          rows={3}
          className="flex w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createEngagement.isPending}>Log request</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ActionPanel({ engagement, actor, canAct }: { engagement: AgmEngagement; actor: string; canAct: boolean }) {
  const action = getCurrentAction(engagement);
  const logStep = useLogAgmEngagement();
  const startInspection = useInitiateAgmVenueInspection();
  const completeInspection = useCompleteAgmVenueInspection();
  const setDividend = useSetAgmDividendPosition();
  const notifyDepartments = useNotifyAgmDepartments();
  const sendDemandNotice = useSendAgmDemandNotice();
  const requestItBriefing = useRequestAgmItBriefing();
  const assignStaff = useAssignAgmStaff();
  const submitItems = useSubmitAgmItems();
  const decideApproval = useDecideAgmApproval();
  const sendLogistics = useSendAgmLogisticsPack();
  const recordProxy = useRecordAgmProxyCapture();
  const sendToBoard = useSendAgmEngagementToBoard();
  const [rejectReason, setRejectReason] = useState("");

  if (!canAct && action !== "done") {
    return (
      <Card className="p-5 border-white/5 bg-black/20 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-slate-500 mt-0.5" />
        <p className="text-sm text-slate-400">Only Admin/Governance users can move this AGM request forward.</p>
      </Card>
    );
  }

  if (action === "done") {
    return (
      <Card className="p-5 border-emerald-500/20 bg-emerald-500/5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <CheckCircle2 className="w-4 h-4" /> On the AGM board
        </div>
        <p className="text-sm text-slate-300">This AGM has moved to the meeting-day workspace for notice, quorum, voting and minutes.</p>
        <Link href="/agm"><Button variant="outline">Open meeting-day workspace</Button></Link>
      </Card>
    );
  }

  if (action === "confirm-log") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 2 — Admin: key the information into the system</h4>
        <p className="text-sm text-slate-400">Confirm the client's AGM details above have been keyed into the system.</p>
        <Button isLoading={logStep.isPending} onClick={() => logStep.mutate({ id: engagement.id, actor })}>
          Confirm logged
        </Button>
      </Card>
    );
  }

  if (action === "start-venue-inspection") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 3 — Initiate venue inspection</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startInspection.mutate({
              id: engagement.id,
              actor,
              notified: parseList(String(data.get("notified") || "")),
              notes: String(data.get("notes") || ""),
            });
          }}
        >
          <Input name="notified" placeholder="Units to notify (comma separated), e.g. Facilities, Security" />
          <Input name="notes" placeholder="Inspection notes (optional)" />
          <Button type="submit" isLoading={startInspection.isPending}>Initiate inspection &amp; notify</Button>
        </form>
      </Card>
    );
  }

  if (action === "complete-venue-inspection") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 3 — Venue inspection in progress</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Info label="Initiated by" value={engagement.venueInspection.initiatedBy} />
          <Info label="Notified" value={engagement.venueInspection.notified.join(", ")} />
        </div>
        <Button isLoading={completeInspection.isPending} onClick={() => completeInspection.mutate({ id: engagement.id, actor })}>
          Mark inspection complete
        </Button>
      </Card>
    );
  }

  if (action === "set-dividend") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 4 — Check dividend position</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setDividend.mutate({
              id: engagement.id,
              actor,
              position: String(data.get("position") || "none"),
              notes: String(data.get("notes") || ""),
            });
          }}
        >
          <select name="position" defaultValue="proposing" className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white">
            <option value="proposing">Proposing a dividend</option>
            <option value="defaulting">Defaulting on dividend</option>
            <option value="none">Not proposing a dividend</option>
          </select>
          <Input name="notes" placeholder="Notes (optional)" />
          <Button type="submit" isLoading={setDividend.isPending}>Save dividend position</Button>
        </form>
      </Card>
    );
  }

  if (action === "notify-departments") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 5 — Inform relevant departments</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            notifyDepartments.mutate({ id: engagement.id, actor, departments: parseList(String(data.get("departments") || "")) });
          }}
        >
          <Input name="departments" placeholder="Departments (comma separated), e.g. Registrar Ops, Compliance, Accounts" />
          <Button type="submit" isLoading={notifyDepartments.isPending}>Send AGM portal notification</Button>
        </form>
      </Card>
    );
  }

  if (action === "send-demand-notice") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 6 — Accounts: demand notice for dividend funds</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            sendDemandNotice.mutate({
              id: engagement.id,
              actor,
              designatedAccount: String(data.get("designatedAccount") || ""),
              preparedBy: String(data.get("preparedBy") || ""),
              sentBy: String(data.get("sentBy") || ""),
              senderEmail: String(data.get("senderEmail") || ""),
            });
          }}
        >
          <Input name="designatedAccount" required placeholder="Designated account for dividend funds" />
          <Input name="preparedBy" required placeholder="Prepared by (Accounts)" />
          <div className="grid grid-cols-2 gap-3">
            <Input name="sentBy" required defaultValue="Rebecca" placeholder="Sent by" />
            <Input name="senderEmail" required type="email" placeholder="Sender's official email" />
          </div>
          <p className="text-xs text-slate-500">Sent from the sender's own official email, through the platform.</p>
          <Button type="submit" isLoading={sendDemandNotice.isPending}>Send demand notice</Button>
        </form>
      </Card>
    );
  }

  if (action === "skip-demand-notice") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 6 — Demand notice not applicable</h4>
        <p className="text-sm text-slate-400">The company is not proposing a dividend, so no demand notice is required.</p>
        <Button isLoading={requestItBriefing.isPending} onClick={() => requestItBriefing.mutate({ id: engagement.id, actor })}>
          Continue to IT briefing
        </Button>
      </Card>
    );
  }

  if (action === "request-it-briefing") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 7 — Email IT for meeting information</h4>
        <Button isLoading={requestItBriefing.isPending} onClick={() => requestItBriefing.mutate({ id: engagement.id, actor })}>
          Send request to IT
        </Button>
      </Card>
    );
  }

  if (action === "assign-staff") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 8 — Assign staff to the AGM</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const staff = parseLines(String(data.get("staff") || "")).map((line) => {
              const [name, email, role] = line.split(",").map((part) => part.trim());
              return { name: name || line, email: email || "", role: role || "" };
            });
            assignStaff.mutate({ id: engagement.id, actor, staff });
          }}
        >
          <textarea
            name="staff"
            rows={4}
            placeholder={"One staff member per line: Name, email, role\ne.g. Adaeze Obi, adaeze@firstregistrars.com, Registration desk"}
            className="flex w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="text-xs text-slate-500">Assigned staff are emailed automatically.</p>
          <Button type="submit" isLoading={assignStaff.isPending}>Assign &amp; notify staff</Button>
        </form>
      </Card>
    );
  }

  if (action === "submit-items" || action === "resubmit-items") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">
          Step 9 — {action === "resubmit-items" ? "IT: resubmit the adjusted item list" : "IT: submit list of items required for the AGM"}
        </h4>
        {engagement.approval.status === "rejected" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Rejected{engagement.approval.reason ? `: ${engagement.approval.reason}` : "."} Adjust and resend until accepted.
          </div>
        )}
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            submitItems.mutate({
              id: engagement.id,
              actor,
              items: parseLines(String(data.get("items") || "")),
              approvers: parseList(String(data.get("approvers") || "")),
            });
          }}
        >
          <textarea
            name="items"
            rows={4}
            placeholder={"Items required for the AGM (one per line)"}
            className="flex w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Input name="approvers" placeholder="Send confirmation to (comma separated), e.g. Managing Director, Company Secretary" />
          <Button type="submit" isLoading={submitItems.isPending}>
            {action === "resubmit-items" ? "Resubmit item list" : "Submit item list for confirmation"}
          </Button>
        </form>
      </Card>
    );
  }

  if (action === "decide-approval") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 10 — Confirm or reject the item list</h4>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Items awaiting confirmation</p>
          <ul className="text-sm text-slate-300 list-disc list-inside space-y-1">
            {engagement.itemsRequired.slice(-20).map((item, index) => (
              <li key={index}>{item.description}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">Approvers: {engagement.approval.approvers.join(", ") || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            isLoading={decideApproval.isPending}
            onClick={() => decideApproval.mutate({ id: engagement.id, actor, decision: "approved" })}
          >
            Confirm items
          </Button>
          <Input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Reason for rejection" className="max-w-xs" />
          <Button
            variant="destructive"
            isLoading={decideApproval.isPending}
            onClick={() => decideApproval.mutate({ id: engagement.id, actor, decision: "rejected", reason: rejectReason })}
          >
            Reject
          </Button>
        </div>
      </Card>
    );
  }

  if (action === "send-logistics") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 12 — Logistics: email item list &amp; proxy form to Admin</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            sendLogistics.mutate({ id: engagement.id, actor, recipients: parseList(String(data.get("recipients") || "")) });
          }}
        >
          <Input name="recipients" required placeholder="Recipients (comma separated), e.g. Isaac (Admin)" />
          <Button type="submit" isLoading={sendLogistics.isPending}>Email item list &amp; proxy form</Button>
        </form>
      </Card>
    );
  }

  if (action === "record-proxy") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Step 13 — Capturing / proxy form</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            recordProxy.mutate({
              id: engagement.id,
              actor,
              capturedCount: Number(data.get("capturedCount") || 0),
              status: data.get("markComplete") ? "completed" : "in_progress",
            });
          }}
        >
          <Input name="capturedCount" type="number" min={0} defaultValue={engagement.proxyForm.capturedCount} placeholder="Proxy forms captured" />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="markComplete" />
            Capturing complete — ready for the AGM
          </label>
          <Button type="submit" isLoading={recordProxy.isPending}>Save proxy capture</Button>
        </form>
      </Card>
    );
  }

  if (action === "send-to-board") {
    return (
      <Card className="p-5 border-white/5 space-y-3">
        <h4 className="font-semibold text-white">Ready for the AGM</h4>
        <p className="text-sm text-slate-400">All 13 steps are complete. Send this AGM to the live board to run notice, quorum, voting and minutes.</p>
        <Button isLoading={sendToBoard.isPending} onClick={() => sendToBoard.mutate({ id: engagement.id, actor })}>
          Send to AGM board
        </Button>
      </Card>
    );
  }

  return null;
}

function EngagementListCard({ engagement, isActive, onSelect }: { engagement: AgmEngagement; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-2xl border p-5 transition-all ${
        isActive ? "border-[#c4a747]/50 bg-[#c4a747]/10" : "border-white/5 bg-card hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <Badge variant="outline" className={getStatusColor(engagement.status)}>{engagement.status.replace(/_/g, " ")}</Badge>
        <span className="text-xs text-slate-500">{engagement.meetingDate ? format(new Date(engagement.meetingDate), "MMM d, yyyy") : "—"}</span>
      </div>
      <h3 className="text-white font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-[#c4a747]" />{engagement.clientCompany}</h3>
      <p className="text-sm text-slate-400 mt-1">{engagement.contactName}</p>
      <p className="text-xs text-slate-500 mt-3">
        Step {Math.min(engagement.step, 13)} of 13 · {STEP_LABELS[Math.min(engagement.step, 13)]}
      </p>
    </button>
  );
}

function ReportsBoard() {
  const summaryQuery = useAgmEngagementsSummary();
  const summary = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-white/5">
          <p className="text-xs text-slate-400">Total AGM requests</p>
          <p className="text-3xl font-bold text-white mt-2">{summary.total}</p>
        </Card>
        <Card className="p-5 border-white/5">
          <p className="text-xs text-slate-400">Ready for the board</p>
          <p className="text-3xl font-bold text-white mt-2">{summary.ready}</p>
        </Card>
        <Card className="p-5 border-white/5">
          <p className="text-xs text-slate-400">On the AGM board</p>
          <p className="text-3xl font-bold text-white mt-2">{summary.onBoard}</p>
        </Card>
        <Card className="p-5 border-destructive/20">
          <p className="text-xs text-slate-400">Rejected / resubmitting</p>
          <p className="text-3xl font-bold text-white mt-2">{summary.rejected}</p>
        </Card>
      </div>

      <Card className="p-6 border-white/5">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-4"><ClipboardList className="w-4 h-4 text-[#c4a747]" /> Pipeline by step</h4>
        <div className="space-y-2">
          {Array.from({ length: 13 }, (_, index) => index + 1).map((step) => {
            const count = summary.byStep[step] || 0;
            const max = Math.max(1, ...Object.values(summary.byStep));
            return (
              <div key={step} className="flex items-center gap-3">
                <span className="w-6 text-xs text-slate-500">{step}</span>
                <span className="w-48 text-xs text-slate-300 truncate">{summary.stepLabels[step] || STEP_LABELS[step]}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-[#c4a747]" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="w-6 text-xs text-slate-400 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 border-white/5">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-4"><Radar className="w-4 h-4 text-[#c4a747]" /> Live now</h4>
        {summary.live.length === 0 ? (
          <p className="text-sm text-slate-500">No AGM is currently in session.</p>
        ) : (
          <div className="space-y-2">
            {summary.live.map((meeting) => (
              <Link key={meeting.id} href="/agm" className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3 hover:border-[#c4a747]/40">
                <div>
                  <p className="text-sm text-white">{meeting.title}</p>
                  <p className="text-xs text-slate-500">{meeting.company}</p>
                </div>
                <Badge variant="outline" className={getStatusColor(meeting.status)}>{meeting.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 border-white/5">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-4"><Mail className="w-4 h-4 text-[#c4a747]" /> Upcoming in the pipeline</h4>
        {summary.upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing in the pipeline right now.</p>
        ) : (
          <div className="space-y-2">
            {summary.upcoming.map((engagement) => (
              <div key={engagement.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3">
                <div>
                  <p className="text-sm text-white">{engagement.clientCompany}</p>
                  <p className="text-xs text-slate-500">{STEP_LABELS[Math.min(engagement.step, 13)]}</p>
                </div>
                <span className="text-xs text-slate-500">{engagement.meetingDate ? format(new Date(engagement.meetingDate), "MMM d, yyyy") : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function HistoryBoard({ onOpen }: { onOpen: (id: number) => void }) {
  const engagementsQuery = useAgmEngagements();
  const [search, setSearch] = useState("");
  const engagements = engagementsQuery.data || [];
  const filtered = engagements.filter((engagement) =>
    `${engagement.clientCompany} ${engagement.contactName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <History className="w-4 h-4 text-[#c4a747]" />
        <p className="text-sm text-slate-400">Every AGM request and its full audit trail, searchable anytime, from any device.</p>
      </div>
      <Input placeholder="Search by client company or contact" value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
      {engagementsQuery.isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Format</th>
                <th className="text-left px-4 py-3">Meeting date</th>
                <th className="text-left px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Logged</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((engagement) => (
                <tr
                  key={engagement.id}
                  className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => onOpen(engagement.id)}
                >
                  <td className="px-4 py-3 text-white">{engagement.clientCompany}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{engagement.meetingFormat}</td>
                  <td className="px-4 py-3 text-slate-400">{engagement.meetingDate ? format(new Date(engagement.meetingDate), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{STEP_LABELS[Math.min(engagement.step, 13)]}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={getStatusColor(engagement.status)}>{engagement.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{format(new Date(engagement.createdAt), "MMM d, yyyy")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No AGM requests match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "reports", label: "Reports" },
  { id: "history", label: "History" },
] as const;

export default function AgmEngagements() {
  const { user } = useAuth();
  const governor = canRunGovernance(user?.role);
  const actor = user?.name || "Admin";

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pipeline");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const engagementsQuery = useAgmEngagements();
  const engagements = engagementsQuery.data || [];
  const activeId = selectedId || engagements[0]?.id || null;
  const active = engagements.find((item) => item.id === activeId) || null;

  const openInPipeline = (id: number) => {
    setSelectedId(id);
    setTab("pipeline");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#c4a747]/20 bg-gradient-to-r from-[#0f1c2e] to-[#1b3a6b]/60 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[#c4a747]">Governance portal · AGM operations</p>
        <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Landmark className="w-6 h-6 text-[#c4a747]" />
              AGM request pipeline
            </h2>
            <p className="text-slate-300 mt-2 max-w-3xl">
              From the client's first notice through venue inspection, dividend checks, department and IT briefings, staff
              assignment, item-list approval, logistics, and proxy capture — end to end, before it goes live on the AGM board.
            </p>
          </div>
          {governor && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log AGM request
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                tab === item.id ? "border-[#c4a747]/50 bg-[#c4a747]/10 text-[#c4a747]" : "border-white/10 bg-black/30 text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "reports" && <ReportsBoard />}
      {tab === "history" && <HistoryBoard onOpen={openInPipeline} />}

      {tab === "pipeline" && (
        <>
          {engagementsQuery.isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : engagements.length === 0 ? (
            <Card className="p-10 border-dashed border-white/10 text-center">
              <Mail className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">No AGM requests yet</h3>
              <p className="text-slate-400 mt-2">Log the client's notice to Marketing &amp; Business Development to start the pipeline.</p>
              {governor && (
                <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log first request
                </Button>
              )}
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {engagements.map((engagement) => (
                  <EngagementListCard
                    key={engagement.id}
                    engagement={engagement}
                    isActive={engagement.id === activeId}
                    onSelect={() => setSelectedId(engagement.id)}
                  />
                ))}
              </div>

              {active && (
                <Card className="p-6 border-white/5 space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{active.clientCompany}</h3>
                      <p className="text-slate-400 mt-1">
                        {active.contactName} · {active.meetingFormat === "virtual" ? "Virtual" : "Physical"} ·{" "}
                        {active.meetingDate ? format(new Date(active.meetingDate), "MMMM d, yyyy") : "Date TBC"}
                        {active.meetingTime ? ` at ${active.meetingTime}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(active.status)}>{active.status.replace(/_/g, " ")}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Info label={active.meetingFormat === "virtual" ? "Meeting link" : "Venue"} value={active.meetingFormat === "virtual" ? active.meetingLink : active.venue} />
                    <Info label="Submitted by" value={active.submittedBy} />
                    <Info label="Dividend position" value={active.dividendPosition.status.replace(/_/g, " ")} />
                  </div>

                  <StepTracker engagement={active} />

                  <ActionPanel engagement={active} actor={actor} canAct={governor} />

                  <div>
                    <h4 className="font-semibold text-white mb-3">History &amp; records</h4>
                    <TimelineList engagement={active} />
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      <CreateEngagementDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} actor={actor} />
    </div>
  );
}

import { Link } from "wouter";
import { Card, Badge, Button } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import {
  useOperationsSummary,
  useOpsAlerts,
  useOpsApprovals,
  useAgmActions,
  useAgmMeetings,
  useUpdateAlert,
  useUpdateApproval,
  useUpdateAction,
} from "@/lib/operations-api";
import { AlertTriangle, CheckCircle2, ClipboardList, Landmark, Loader2, Shield, Siren, Workflow } from "lucide-react";
import { format } from "date-fns";

const severityClass: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export default function OperationsCenter() {
  const summaryQuery = useOperationsSummary();
  const alertsQuery = useOpsAlerts();
  const approvalsQuery = useOpsApprovals();
  const actionsQuery = useAgmActions();
  const meetingsQuery = useAgmMeetings();
  const updateAlert = useUpdateAlert();
  const updateApproval = useUpdateApproval();
  const updateAction = useUpdateAction();

  if (summaryQuery.isLoading || alertsQuery.isLoading || approvalsQuery.isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const summary = summaryQuery.data;
  const alerts = alertsQuery.data || [];
  const approvals = approvalsQuery.data || [];
  const actions = actionsQuery.data || [];
  const meetings = meetingsQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#c4a747]/20 bg-gradient-to-r from-[#1b3a6b]/40 to-[#c4a747]/10 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[#c4a747]">Phase 4 · Week 7–8</p>
        <h2 className="mt-2 text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="w-6 h-6 text-[#c4a747]" />
          Operations & Governance
        </h2>
        <p className="mt-2 text-slate-300 max-w-3xl">
          Approvals, alerts, meeting workflows, and filing actions for issuer AGMs. Software products are built under Software, not here.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/agm"><Button variant="outline">Issuer meetings</Button></Link>
          <Link href="/playbooks"><Button variant="outline">Playbooks & Time</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Open alerts", value: summary?.openAlerts ?? 0, icon: Siren, href: "/operations" },
          { label: "Pending approvals", value: summary?.pendingApprovals ?? 0, icon: CheckCircle2, href: "/operations" },
          { label: "Active AGMs", value: summary?.activeMeetings ?? 0, icon: Landmark, href: "/agm" },
          { label: "Open actions", value: summary?.openActions ?? 0, icon: ClipboardList, href: "/agm" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="block group">
              <Card className="p-5 border-white/5 group-hover:border-[#c4a747]/40 transition-colors">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Icon className="w-4 h-4 text-[#c4a747]" />
                  {item.label}
                </div>
                <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Alerts</h3>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={severityClass[alert.severity] || severityClass.low}>{alert.severity}</Badge>
                  <Badge variant="outline" className={getStatusColor(alert.status)}>{alert.status}</Badge>
                  <span className="text-xs text-slate-500 ml-auto">{alert.source}</span>
                </div>
                <p className="text-sm text-white">{alert.title}</p>
                {alert.status !== "resolved" && (
                  <div className="mt-3 flex gap-2">
                    {alert.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => updateAlert.mutate({ id: alert.id, status: "acknowledged" })}>
                        Acknowledge
                      </Button>
                    )}
                    <Button size="sm" onClick={() => updateAlert.mutate({ id: alert.id, status: "resolved" })}>
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Approvals</h3>
          </div>
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="uppercase text-[10px]">{approval.type}</Badge>
                  <Badge variant="outline" className={getStatusColor(approval.status)}>{approval.status}</Badge>
                  <span className="text-xs text-slate-500 ml-auto">{format(new Date(approval.createdAt), "MMM d")}</span>
                </div>
                <p className="text-sm text-white">{approval.title}</p>
                <p className="text-xs text-slate-500 mt-1">Requested by {approval.requester}</p>
                {approval.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => updateApproval.mutate({ id: approval.id, status: "approved" })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateApproval.mutate({ id: approval.id, status: "rejected" })}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Workflow className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Workflow management</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">Automated AGM pipeline: planning → pack → notice → quorum → voting → minutes → compliance.</p>
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href="/agm" className="block rounded-xl border border-white/5 bg-black/20 p-4 hover:border-[#c4a747]/40 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{meeting.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{meeting.company} · {format(new Date(meeting.meetingDate), "MMM d")}</p>
                </div>
                <Badge variant="outline" className={getStatusColor(meeting.status)}>{meeting.status.replace("_", " ")}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-[#c4a747]" />
            <h3 className="text-lg font-semibold text-white">Action tracking</h3>
          </div>
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">{action.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{action.owner} · {action.source} · due {format(new Date(action.dueDate), "MMM d")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(action.status)}>{action.status.replace("_", " ")}</Badge>
                    {action.status !== "completed" && (
                      <Button size="sm" variant="outline" onClick={() => updateAction.mutate({ id: action.id, status: "completed" })}>
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Workflow className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Centralized information</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <p>AGM board packs, notices, attendance, votes, minutes, and follow-up actions live in one workspace.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Meeting planning",
                "Document distribution",
                "Notice & compliance",
                "Attendance / quorum",
                "Voting & resolutions",
                "Minutes & action tracking",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-slate-200">{item}</div>
              ))}
            </div>
            <Link href="/agm" className="inline-flex">
              <Button variant="outline">Open issuer meeting workspace</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

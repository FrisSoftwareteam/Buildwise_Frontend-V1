import { useState } from "react";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { canRunGovernance } from "@/lib/software-roles";
import {
  useAgmMeetings,
  useAgmWorkspace,
  useCloseResolution,
  useCreateAction,
  useCreateMeeting,
  useCreateResolution,
  useUpdateAction,
  useUpdateAttendee,
  useUpdateDocument,
  useUpdateMeeting,
  useVoteResolution,
} from "@/lib/operations-api";
import {
  ClipboardList,
  FileText,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";
import { format } from "date-fns";

const WORKFLOW = [
  { id: "planning", label: "Meeting planning" },
  { id: "pack", label: "Document distribution" },
  { id: "notice", label: "Notice distribution" },
  { id: "attendance", label: "Attendance / quorum" },
  { id: "voting", label: "Voting" },
  { id: "resolutions", label: "Resolutions" },
  { id: "minutes", label: "Minutes" },
  { id: "compliance", label: "Compliance" },
] as const;

const MEETING_STATUSES = ["planning", "notice_issued", "in_session", "voting", "completed"];

function workflowIndex(meeting: { status: string; packStatus?: string; noticeStatus?: string; minutesStatus?: string }) {
  if (meeting.status === "completed" || meeting.minutesStatus === "approved") return 7;
  if (meeting.status === "voting") return 5;
  if (meeting.status === "in_session") return 3;
  if (meeting.noticeStatus === "distributed" || meeting.status === "notice_issued") return 2;
  if (meeting.packStatus === "distributed" || meeting.packStatus === "ready") return 1;
  return 0;
}

export default function AgmOperations() {
  const { user } = useAuth();
  const meetingsQuery = useAgmMeetings();
  const createMeeting = useCreateMeeting();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [tab, setTab] = useState<(typeof WORKFLOW)[number]["id"]>("planning");

  const meetings = meetingsQuery.data || [];
  const activeMeetingId = selectedMeetingId || meetings[0]?.id || null;
  const workspaceQuery = useAgmWorkspace(activeMeetingId);
  const workspace = workspaceQuery.data;
  const meeting = workspace?.meeting || meetings.find((item) => item.id === activeMeetingId);
  const step = meeting ? workflowIndex(meeting) : 0;
  const governor = canRunGovernance(user?.role);

  if (meetingsQuery.isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (meetingsQuery.isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <p className="text-white font-medium">Could not load issuer meetings.</p>
        <p className="text-sm mt-2">Check that the API is running, then refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#c4a747]/20 bg-gradient-to-r from-[#0f1c2e] to-[#1b3a6b]/60 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[#c4a747]">Board portal · Diligent-style governance</p>
        <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Landmark className="w-6 h-6 text-[#c4a747]" />
              AGM workspace
            </h2>
            <p className="text-slate-300 mt-2 max-w-3xl">
              Running an issuer meeting — notice, vote, minutes. This is governance, not software delivery. Web, desktop, and enterprise builds live under Software.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {WORKFLOW.map((item) => (
                <span key={item.id} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300">
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          {governor && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New meeting
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {meetings.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedMeetingId(item.id)}
            className={`text-left rounded-2xl border p-5 transition-all ${
              item.id === activeMeetingId ? "border-[#c4a747]/50 bg-[#c4a747]/10" : "border-white/5 bg-card hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <Badge variant="outline" className={getStatusColor(item.status)}>{item.status.replace("_", " ")}</Badge>
              <span className="text-xs text-slate-500">{format(new Date(item.meetingDate), "MMM d, yyyy")}</span>
            </div>
            <h3 className="text-white font-semibold">{item.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{item.company}</p>
            <p className="text-xs text-slate-500 mt-3">{item.venue}</p>
          </button>
        ))}
      </div>

      {meetings.length === 0 && (
        <Card className="p-10 border-dashed border-white/10 text-center">
          <Landmark className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No issuer meetings yet</h3>
          <p className="text-slate-400 mt-2">Open a statutory AGM or EGM here. Software products stay in the Software portal.</p>
          {governor && (
            <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create first meeting
            </Button>
          )}
        </Card>
      )}

      {meeting && (
        <Card className="p-6 border-white/5 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">{meeting.title}</h3>
              <p className="text-slate-400 mt-1">{meeting.company} · Chair {meeting.chair || "Unassigned"} · Secretary {meeting.secretary || "Unassigned"}</p>
            </div>
            <Badge variant="outline" className={getStatusColor(meeting.status)}>{meeting.status.replace("_", " ")}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {WORKFLOW.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  tab === item.id ? "border-[#c4a747]/50 bg-[#c4a747]/10" : "border-white/5 bg-black/20"
                }`}
              >
                <p className={`text-[10px] uppercase tracking-wider ${index <= step ? "text-[#c4a747]" : "text-slate-500"}`}>
                  {index <= step ? "Ready" : "Queued"}
                </p>
                <p className="text-xs text-white mt-1 leading-snug">{item.label}</p>
              </button>
            ))}
          </div>

          {workspaceQuery.isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : workspace ? (
            <WorkspacePanels
              key={meeting.id}
              tab={tab}
              workspace={workspace}
              governor={governor}
              actor={user?.name || "Member"}
            />
          ) : null}
        </Card>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create board meeting">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            createMeeting.mutate({
              title: String(data.get("title") || ""),
              company: String(data.get("company") || ""),
              meetingDate: String(data.get("meetingDate") || ""),
              venue: String(data.get("venue") || ""),
              status: "planning",
              agenda: String(data.get("agenda") || ""),
              quorumRequired: Number(data.get("quorumRequired") || 50),
              attendeesExpected: Number(data.get("attendeesExpected") || 0),
            }, { onSuccess: () => setIsCreateOpen(false) });
          }}
        >
          <Input name="title" required placeholder="Meeting title" />
          <Input name="company" required placeholder="Issuer / company" />
          <Input name="meetingDate" type="date" required />
          <Input name="venue" required placeholder="Venue" />
          <Input name="agenda" placeholder="Agenda" />
          <div className="grid grid-cols-2 gap-3">
            <Input name="quorumRequired" type="number" placeholder="Quorum %" defaultValue={50} />
            <Input name="attendeesExpected" type="number" placeholder="Expected attendees" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMeeting.isPending}>Create meeting</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function WorkspacePanels({
  tab,
  workspace,
  governor,
  actor,
}: {
  tab: (typeof WORKFLOW)[number]["id"];
  workspace: NonNullable<ReturnType<typeof useAgmWorkspace>["data"]>;
  governor: boolean;
  actor: string;
}) {
  const updateMeeting = useUpdateMeeting();
  const updateDocument = useUpdateDocument();
  const updateAttendee = useUpdateAttendee();
  const createResolution = useCreateResolution();
  const voteResolution = useVoteResolution();
  const closeResolution = useCloseResolution();
  const createAction = useCreateAction();
  const updateAction = useUpdateAction();
  const [minutes, setMinutes] = useState(workspace.meeting.minutes || "");

  const meeting = workspace.meeting;
  const quorumPct = meeting.attendeesExpected
    ? Math.round((workspace.present / meeting.attendeesExpected) * 100)
    : 0;

  const statusSelect = (
    value: string,
    onChange: (status: string) => void,
  ) => (
    <select
      className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={!governor}
    >
      {MEETING_STATUSES.map((status) => (
        <option key={status} value={status}>{status.replace("_", " ")}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-5">
      {tab === "planning" && (
        <section className="space-y-4">
          <h4 className="font-semibold text-white flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#c4a747]" /> Meeting planning</h4>
          <p className="text-sm text-slate-400">{meeting.agenda}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info label="Venue" value={meeting.venue} />
            <Info label="Date" value={format(new Date(meeting.meetingDate), "MMMM d, yyyy")} />
            <Info label="Your access" value={governor ? "Chair / secretary controls" : "Member / viewer"} />
          </div>
          {governor && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Workflow stage</span>
              {statusSelect(meeting.status, (status) => updateMeeting.mutate({
                id: meeting.id,
                status,
                audit: { actor, action: "Updated workflow", detail: `Moved meeting to ${status.replace("_", " ")}.` },
              }))}
            </div>
          )}
        </section>
      )}

      {tab === "pack" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-[#c4a747]" /> Board pack</h4>
            {governor && meeting.packStatus !== "distributed" && (
              <Button size="sm" onClick={() => updateMeeting.mutate({
                id: meeting.id,
                packStatus: "distributed",
                audit: { actor, action: "Distributed board pack", detail: "Released agenda, accounts, and proxy forms to invitees." },
              })}>
                Distribute pack
              </Button>
            )}
          </div>
          {workspace.documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
              <div>
                <p className="text-sm text-white">{document.name}</p>
                <p className="text-xs text-slate-500 mt-1">{document.category} · {document.owner}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(document.status)}>{document.status}</Badge>
                {governor && document.status !== "distributed" && (
                  <Button size="sm" variant="outline" onClick={() => updateDocument.mutate({ id: document.id, status: "distributed" })}>
                    Release
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "notice" && (
        <section className="space-y-4">
          <h4 className="font-semibold text-white">Notice distribution</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info label="Notice status" value={(meeting.noticeStatus || "draft").replace("_", " ")} />
            <Info label="Sent" value={meeting.noticeSentAt ? format(new Date(meeting.noticeSentAt), "MMM d, yyyy") : "Not sent"} />
            <Info label="Compliance" value="SEC / CAC filing window tracked" />
          </div>
          {governor && meeting.noticeStatus !== "distributed" && (
            <Button onClick={() => updateMeeting.mutate({
              id: meeting.id,
              noticeStatus: "distributed",
              noticeSentAt: new Date().toISOString().slice(0, 10),
              status: "notice_issued",
              audit: { actor, action: "Distributed notice", detail: "Published the statutory notice and emailed the board pack." },
            })}>
              Distribute notice
            </Button>
          )}
        </section>
      )}

      {tab === "attendance" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-[#c4a747]" /> Attendance / quorum</h4>
            <Badge variant="outline" className={workspace.quorumMet ? getStatusColor("approved") : getStatusColor("pending")}>
              {workspace.quorumMet ? "Quorum met" : "Quorum short"} · {quorumPct}%
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            {workspace.present} present or by proxy of {meeting.attendeesExpected} expected. Required quorum is {meeting.quorumRequired}%.
          </p>
          {workspace.attendees.map((attendee) => (
            <div key={attendee.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
              <div>
                <p className="text-sm text-white">{attendee.name}</p>
                <p className="text-xs text-slate-500 mt-1">{attendee.role}{attendee.holding ? ` · ${attendee.holding}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(attendee.status)}>{attendee.status}</Badge>
                {governor && (
                  <select
                    className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-xs text-white"
                    value={attendee.status}
                    onChange={(event) => updateAttendee.mutate({ id: attendee.id, status: event.target.value })}
                  >
                    {["invited", "confirmed", "present", "proxy", "absent"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "voting" && (
        <section className="space-y-4">
          <h4 className="font-semibold text-white flex items-center gap-2"><Vote className="w-4 h-4 text-[#c4a747]" /> Voting</h4>
          <p className="text-sm text-slate-400">Live vote capture with an audit trail. Chair and secretary can close the poll once quorum is confirmed.</p>
          {workspace.resolutions.map((resolution) => (
            <ResolutionCard
              key={resolution.id}
              resolution={resolution}
              showVotes
              onVote={resolution.status !== "passed" && resolution.status !== "rejected"
                ? (choice) => voteResolution.mutate({ id: resolution.id, choice, actor })
                : undefined}
            />
          ))}
        </section>
      )}

      {tab === "resolutions" && (
        <section className="space-y-4">
          <h4 className="font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-[#c4a747]" /> Resolutions</h4>
          {workspace.resolutions.map((resolution) => (
            <ResolutionCard
              key={resolution.id}
              resolution={resolution}
              onClose={governor && resolution.status !== "passed" && resolution.status !== "rejected"
                ? (status) => closeResolution.mutate({ id: resolution.id, status })
                : undefined}
            />
          ))}
          {governor && (
            <form
              className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                createResolution.mutate({
                  meetingId: meeting.id,
                  title: String(data.get("title") || ""),
                  description: String(data.get("description") || ""),
                }, { onSuccess: () => form.reset() });
              }}
            >
              <Input name="title" required placeholder="Add a resolution" />
              <Button type="submit" isLoading={createResolution.isPending}>Add</Button>
              <Input name="description" placeholder="Motion text / compliance note" className="md:col-span-2" />
            </form>
          )}
        </section>
      )}

      {tab === "minutes" && (
        <section className="space-y-4">
          <h4 className="font-semibold text-white">Minutes</h4>
          <textarea
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            disabled={!governor}
            className="w-full min-h-40 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            placeholder="Record attendance, resolutions, and decisions."
          />
          {governor && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => updateMeeting.mutate({
                id: meeting.id,
                minutes,
                minutesStatus: "draft",
                audit: { actor, action: "Saved draft minutes", detail: "Updated the meeting minute book." },
              })}>
                Save draft
              </Button>
              <Button onClick={() => updateMeeting.mutate({
                id: meeting.id,
                minutes,
                minutesStatus: "approved",
                status: "completed",
                audit: { actor, action: "Approved minutes", detail: "Minutes locked and meeting marked complete." },
              })}>
                Approve minutes
              </Button>
            </div>
          )}
          <p className="text-xs text-slate-500">Minute status: {(meeting.minutesStatus || "not_started").replace("_", " ")}</p>
        </section>
      )}

      {tab === "compliance" && (
        <section className="space-y-4">
          <h4 className="font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#c4a747]" /> Compliance</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info label="Notice" value={(meeting.noticeStatus || "draft").replace("_", " ")} />
            <Info label="Pack" value={(meeting.packStatus || "assembling").replace("_", " ")} />
            <Info label="Minutes" value={(meeting.minutesStatus || "not_started").replace("_", " ")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {[
              { label: "Statutory notice window", done: meeting.noticeStatus === "distributed" },
              { label: "Board pack distributed", done: meeting.packStatus === "distributed" },
              { label: "Quorum recorded", done: workspace.quorumMet },
              { label: "Minutes approved", done: meeting.minutesStatus === "approved" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 flex items-center justify-between">
                <span className="text-slate-200">{item.label}</span>
                <Badge variant="outline" className={getStatusColor(item.done ? "approved" : "pending")}>
                  {item.done ? "Complete" : "Open"}
                </Badge>
              </div>
            ))}
          </div>
          {workspace.actions.map((action) => (
            <div key={action.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
              <div>
                <p className="text-sm text-white">{action.title}</p>
                <p className="text-xs text-slate-500 mt-1">{action.owner} · due {format(new Date(action.dueDate), "MMM d")} · {action.source}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(action.status)}>{action.status.replace("_", " ")}</Badge>
                {governor && action.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => updateAction.mutate({ id: action.id, status: "completed" })}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
          {governor && (
            <form
              className="grid grid-cols-1 md:grid-cols-4 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                createAction.mutate({
                  meetingId: meeting.id,
                  title: String(data.get("title") || ""),
                  owner: String(data.get("owner") || actor),
                  dueDate: String(data.get("dueDate") || ""),
                  source: "Compliance",
                }, { onSuccess: () => form.reset() });
              }}
            >
              <Input name="title" required placeholder="Compliance action" className="md:col-span-2" />
              <Input name="owner" placeholder="Owner" defaultValue={actor} />
              <Input name="dueDate" type="date" required />
              <Button type="submit" isLoading={createAction.isPending} className="md:col-span-4">Add filing action</Button>
            </form>
          )}
        </section>
      )}

      <section className="rounded-xl border border-white/5 bg-black/20 p-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#c4a747]" />
          Audit trail
        </h4>
        <div className="space-y-2">
          {workspace.audit.map((event) => (
            <p key={event.id} className="text-xs text-slate-400">
              <span className="text-slate-300">{event.actor}</span> · {event.action} · {event.detail}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResolutionCard({
  resolution,
  showVotes,
  onVote,
  onClose,
}: {
  resolution: {
    id: number;
    title: string;
    description: string;
    status: string;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
  };
  showVotes?: boolean;
  onVote?: (choice: "for" | "against" | "abstain") => void;
  onClose?: (status: "passed" | "rejected") => void;
}) {
  const total = resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain;
  const forPct = total ? Math.round((resolution.votesFor / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge variant="outline" className={getStatusColor(resolution.status)}>{resolution.status}</Badge>
        <span className="text-xs text-slate-500">{total} votes</span>
      </div>
      <h5 className="text-white font-medium">{resolution.title}</h5>
      <p className="text-sm text-slate-400 mt-1">{resolution.description}</p>
      {showVotes && (
        <>
          <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${forPct}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">For {resolution.votesFor} · Against {resolution.votesAgainst} · Abstain {resolution.votesAbstain}</p>
        </>
      )}
      {onVote && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onVote("for")}>Vote for</Button>
          <Button size="sm" variant="outline" onClick={() => onVote("against")}>Vote against</Button>
          <Button size="sm" variant="outline" onClick={() => onVote("abstain")}>Abstain</Button>
        </div>
      )}
      {onClose && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onClose("passed")}>Mark passed</Button>
          <Button size="sm" variant="destructive" onClick={() => onClose("rejected")}>Reject</Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  );
}

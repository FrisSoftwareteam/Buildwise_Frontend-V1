import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type OperationsSummary = {
  openAlerts: number;
  pendingApprovals: number;
  activeMeetings: number;
  openResolutions: number;
  activePlaybooks: number;
  minutesLogged: number;
  openActions: number;
  openEngagements: number;
};

export type AgmMeeting = {
  id: number;
  title: string;
  company: string;
  meetingDate: string;
  venue: string;
  status: string;
  agenda: string;
  quorumRequired: number;
  attendeesExpected: number;
  attendeesPresent?: number;
  chair?: string;
  secretary?: string;
  noticeStatus?: string;
  noticeSentAt?: string | null;
  packStatus?: string;
  minutes?: string;
  minutesStatus?: string;
};

export type AgmDocument = {
  id: number;
  meetingId: number;
  name: string;
  category: string;
  status: string;
  owner: string;
};

export type AgmAttendee = {
  id: number;
  meetingId: number;
  name: string;
  role: string;
  status: string;
  holding?: string | null;
};

export type AgmAction = {
  id: number;
  meetingId: number;
  title: string;
  owner: string;
  dueDate: string;
  status: string;
  source: string;
};

export type GovernanceAudit = {
  id: number;
  meetingId?: number | null;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type AgmWorkspace = {
  meeting: AgmMeeting;
  documents: AgmDocument[];
  attendees: AgmAttendee[];
  resolutions: AgmResolution[];
  actions: AgmAction[];
  audit: GovernanceAudit[];
  present: number;
  quorumMet: boolean;
};

export type AgmResolution = {
  id: number;
  meetingId: number;
  title: string;
  description: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
};

export type AgmEngagementTimelineEntry = {
  step: number;
  status: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
};

export type AgmEngagementStaff = {
  name: string;
  email: string;
  role: string;
  notifiedAt?: string | null;
};

export type AgmEngagementItem = {
  description: string;
  addedBy: string;
  addedAt: string;
};

export type AgmEngagement = {
  id: number;
  clientCompany: string;
  contactName: string;
  contactEmail?: string | null;
  submittedBy: string;
  meetingFormat: "physical" | "virtual";
  meetingDate: string;
  meetingTime: string;
  venue?: string | null;
  meetingLink?: string | null;
  meetingPassword?: string | null;
  notes?: string | null;
  step: number;
  status: string;
  loggedBy?: string | null;
  loggedAt?: string | null;
  venueInspection: {
    status: string;
    initiatedBy?: string | null;
    initiatedAt?: string | null;
    notified: string[];
    notes?: string | null;
  };
  dividendPosition: {
    status: string;
    setBy?: string | null;
    setAt?: string | null;
    notes?: string | null;
  };
  departmentsNotified: {
    departments: string[];
    notifiedBy?: string | null;
    notifiedAt?: string | null;
  };
  demandNotice: {
    status: string;
    designatedAccount?: string | null;
    preparedBy?: string | null;
    sentBy?: string | null;
    senderEmail?: string | null;
    sentAt?: string | null;
  };
  itBriefing: {
    status: string;
    requestedBy?: string | null;
    requestedAt?: string | null;
    infoReceivedAt?: string | null;
  };
  staffAssigned: AgmEngagementStaff[];
  itemsRequired: AgmEngagementItem[];
  approval: {
    status: string;
    approvers: string[];
    requestedBy?: string | null;
    requestedAt?: string | null;
    decidedBy?: string | null;
    decidedAt?: string | null;
    reason?: string | null;
    rounds: number;
  };
  logistics: {
    status: string;
    recipients: string[];
    sentBy?: string | null;
    sentAt?: string | null;
  };
  proxyForm: {
    status: string;
    capturedCount: number;
    updatedBy?: string | null;
    updatedAt?: string | null;
  };
  timeline: AgmEngagementTimelineEntry[];
  linkedMeetingId?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AgmEngagementsSummary = {
  total: number;
  byStep: Record<number, number>;
  stepLabels: Record<number, string>;
  rejected: number;
  ready: number;
  onBoard: number;
  live: AgmMeeting[];
  upcoming: AgmEngagement[];
};

export type OpsAlert = {
  id: number;
  severity: string;
  title: string;
  source: string;
  status: string;
  createdAt: string;
};

export type OpsApproval = {
  id: number;
  title: string;
  type: string;
  requester: string;
  status: string;
  createdAt: string;
};

export type Playbook = {
  id: number;
  name: string;
  category: string;
  ownerId: number;
  status: string;
  steps: string[];
  estimatedMinutes: number;
};

export type TimeLog = {
  id: number;
  playbookId: number;
  userId: number;
  activity: string;
  minutes: number;
  loggedAt: string;
  notes?: string | null;
};

const keys = {
  summary: ["operations-summary"] as const,
  alerts: ["operations-alerts"] as const,
  approvals: ["operations-approvals"] as const,
  meetings: ["agm-meetings"] as const,
  workspace: (id: number) => ["agm-workspace", id] as const,
  resolutions: ["agm-resolutions"] as const,
  actions: ["agm-actions"] as const,
  engagements: ["agm-engagements"] as const,
  engagement: (id: number) => ["agm-engagement", id] as const,
  engagementsSummary: ["agm-engagements-summary"] as const,
  playbooks: ["playbooks"] as const,
  timeLogs: ["time-logs"] as const,
};

export function useOperationsSummary() {
  return useQuery({ queryKey: keys.summary, queryFn: () => api<OperationsSummary>("/api/operations/summary") });
}

export function useOpsAlerts() {
  return useQuery({ queryKey: keys.alerts, queryFn: () => api<OpsAlert[]>("/api/operations/alerts") });
}

export function useOpsApprovals() {
  return useQuery({ queryKey: keys.approvals, queryFn: () => api<OpsApproval[]>("/api/operations/approvals") });
}

export function useAgmMeetings() {
  return useQuery({ queryKey: keys.meetings, queryFn: () => api<AgmMeeting[]>("/api/agm/meetings") });
}

export function useAgmWorkspace(meetingId: number | null) {
  return useQuery({
    queryKey: keys.workspace(meetingId || 0),
    queryFn: () => api<AgmWorkspace>(`/api/agm/meetings/${meetingId}/workspace`),
    enabled: !!meetingId,
  });
}

export function useAgmActions() {
  return useQuery({ queryKey: keys.actions, queryFn: () => api<AgmAction[]>("/api/agm/actions") });
}

export function usePlaybooks() {
  return useQuery({ queryKey: keys.playbooks, queryFn: () => api<Playbook[]>("/api/playbooks") });
}

export function useTimeLogs() {
  return useQuery({ queryKey: keys.timeLogs, queryFn: () => api<TimeLog[]>("/api/time-logs") });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api<OpsAlert>(`/api/operations/alerts/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.alerts });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useUpdateApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api<OpsApproval>(`/api/operations/approvals/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.approvals });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AgmMeeting, "id">) =>
      api<AgmMeeting>("/api/agm/meetings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.meetings });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      api<AgmMeeting>(`/api/agm/meetings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: keys.meetings });
      void queryClient.invalidateQueries({ queryKey: keys.workspace(variables.id) });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useCreateResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { meetingId: number; title: string; description: string }) =>
      api<AgmResolution>("/api/agm/resolutions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.resolutions });
      void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] });
    },
  });
}

export function useVoteResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, choice, actor }: { id: number; choice: "for" | "against" | "abstain"; actor?: string }) =>
      api<AgmResolution>(`/api/agm/resolutions/${id}/vote`, { method: "POST", body: JSON.stringify({ choice, actor }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.resolutions });
      void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] });
    },
  });
}

export function useCloseResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "passed" | "rejected" }) =>
      api<AgmResolution>(`/api/agm/resolutions/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.resolutions });
      void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api<AgmDocument>(`/api/agm/documents/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] }),
  });
}

export function useUpdateAttendee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api<AgmAttendee>(`/api/agm/attendees/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.meetings });
      void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] });
    },
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { meetingId: number; title: string; owner: string; dueDate: string; source?: string }) =>
      api<AgmAction>("/api/agm/actions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.actions });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
      void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api<AgmAction>(`/api/agm/actions/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.actions });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
      void queryClient.invalidateQueries({ queryKey: ["agm-workspace"] });
    },
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; estimatedMinutes: number; steps: string }) =>
      api<Playbook>("/api/playbooks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.playbooks }),
  });
}

export function useCreateTimeLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { playbookId: number; userId: number; activity: string; minutes: number; notes?: string }) =>
      api<TimeLog>("/api/time-logs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.timeLogs });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
  });
}
export function useAgmEngagements() {
  return useQuery({ queryKey: keys.engagements, queryFn: () => api<AgmEngagement[]>("/api/agm/engagements") });
}

export function useAgmEngagement(id: number | null) {
  return useQuery({
    queryKey: keys.engagement(id || 0),
    queryFn: () => api<AgmEngagement>(`/api/agm/engagements/${id}`),
    enabled: !!id,
  });
}

export function useAgmEngagementsSummary() {
  return useQuery({ queryKey: keys.engagementsSummary, queryFn: () => api<AgmEngagementsSummary>("/api/agm/engagements/summary") });
}

function useAgmEngagementAction(path: (id: number) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      api<AgmEngagement>(path(id), { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: keys.engagements });
      void queryClient.invalidateQueries({ queryKey: keys.engagement(variables.id) });
      void queryClient.invalidateQueries({ queryKey: keys.engagementsSummary });
      void queryClient.invalidateQueries({ queryKey: keys.meetings });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useCreateAgmEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientCompany: string;
      contactName: string;
      contactEmail?: string;
      submittedBy: string;
      meetingFormat: "physical" | "virtual";
      meetingDate: string;
      meetingTime: string;
      venue?: string;
      meetingLink?: string;
      meetingPassword?: string;
      notes?: string;
    }) => api<AgmEngagement>("/api/agm/engagements", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.engagements });
      void queryClient.invalidateQueries({ queryKey: keys.engagementsSummary });
    },
  });
}

export function useLogAgmEngagement() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/log`);
}

export function useInitiateAgmVenueInspection() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/venue-inspection`);
}

export function useCompleteAgmVenueInspection() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/venue-inspection/complete`);
}

export function useSetAgmDividendPosition() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/dividend`);
}

export function useNotifyAgmDepartments() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/notify-departments`);
}

export function useSendAgmDemandNotice() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/demand-notice`);
}

export function useRequestAgmItBriefing() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/it-briefing`);
}

export function useAssignAgmStaff() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/staff`);
}

export function useSubmitAgmItems() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/items`);
}

export function useDecideAgmApproval() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/approval`);
}

export function useSendAgmLogisticsPack() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/logistics`);
}

export function useRecordAgmProxyCapture() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/proxy`);
}

export function useSendAgmEngagementToBoard() {
  return useAgmEngagementAction((id) => `/api/agm/engagements/${id}/send-to-board`);
}

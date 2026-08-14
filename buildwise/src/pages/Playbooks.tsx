import { useState } from "react";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import { useCreatePlaybook, useCreateTimeLog, usePlaybooks, useTimeLogs } from "@/lib/operations-api";
import { useAuth } from "@/context/AuthContext";
import { useListUsers } from "@workspace/api-client-react";
import { Clock3, Loader2, Plus, ScrollText } from "lucide-react";
import { format } from "date-fns";

export default function Playbooks() {
  const { user } = useAuth();
  const playbooksQuery = usePlaybooks();
  const timeLogsQuery = useTimeLogs();
  const usersQuery = useListUsers();
  const createPlaybook = useCreatePlaybook();
  const createTimeLog = useCreateTimeLog();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<number | null>(null);

  const playbooks = playbooksQuery.data || [];
  const timeLogs = timeLogsQuery.data || [];
  const users = usersQuery.data || [];
  const activePlaybookId = selectedPlaybookId || playbooks[0]?.id;
  const activePlaybook = playbooks.find((playbook) => playbook.id === activePlaybookId);
  const minutesForPlaybook = timeLogs
    .filter((log) => log.playbookId === activePlaybookId)
    .reduce((sum, log) => sum + log.minutes, 0);

  const userName = (id: number) => users.find((item) => item.id === id)?.name || `User ${id}`;

  if (playbooksQuery.isLoading || timeLogsQuery.isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-[#c4a747]" />
            Operational Playbooks & Time Logging
          </h2>
          <p className="text-slate-400 text-sm mt-1">Execution tracking for AGM, dividend, probate, and transfer runbooks.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New playbook
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-3">
          {playbooks.map((playbook) => (
            <button
              key={playbook.id}
              type="button"
              onClick={() => setSelectedPlaybookId(playbook.id)}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                playbook.id === activePlaybookId ? "border-[#c4a747]/50 bg-[#c4a747]/10" : "border-white/5 bg-card hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="outline">{playbook.category}</Badge>
                <Badge variant="outline" className={getStatusColor(playbook.status)}>{playbook.status}</Badge>
              </div>
              <h3 className="text-white font-semibold">{playbook.name}</h3>
              <p className="text-xs text-slate-500 mt-2">{playbook.estimatedMinutes} min estimated</p>
            </button>
          ))}
        </div>

        {activePlaybook && (
          <Card className="xl:col-span-2 p-6 border-white/5 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white">{activePlaybook.name}</h3>
              <p className="text-sm text-slate-400 mt-1">
                Owner {userName(activePlaybook.ownerId)} · {minutesForPlaybook} minutes logged
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Steps</h4>
              <ol className="space-y-2">
                {activePlaybook.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                    <span className="text-[#c4a747] font-semibold">{index + 1}</span>
                    <span className="text-sm text-white">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <form
              className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                createTimeLog.mutate({
                  playbookId: activePlaybook.id,
                  userId: user?.id || 1,
                  activity: String(data.get("activity") || ""),
                  minutes: Number(data.get("minutes") || 0),
                  notes: String(data.get("notes") || ""),
                }, { onSuccess: () => form.reset() });
              }}
            >
              <Input name="activity" required placeholder="What did you execute?" />
              <Input name="minutes" type="number" min={1} required placeholder="Minutes" />
              <Button type="submit" isLoading={createTimeLog.isPending}>
                <Clock3 className="w-4 h-4 mr-2" />
                Log time
              </Button>
              <Input name="notes" placeholder="Notes" className="md:col-span-3" />
            </form>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Time log</h4>
              <div className="space-y-3">
                {timeLogs.filter((log) => log.playbookId === activePlaybook.id).map((log) => (
                  <div key={log.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white">{log.activity}</p>
                      <span className="text-sm text-[#c4a747] font-semibold">{log.minutes}m</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {userName(log.userId)} · {format(new Date(log.loggedAt), "MMM d, HH:mm")}
                    </p>
                    {log.notes && <p className="text-xs text-slate-400 mt-2">{log.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New playbook">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            createPlaybook.mutate({
              name: String(data.get("name") || ""),
              category: String(data.get("category") || "Operations"),
              estimatedMinutes: Number(data.get("estimatedMinutes") || 60),
              steps: String(data.get("steps") || ""),
            }, { onSuccess: () => setIsCreateOpen(false) });
          }}
        >
          <Input name="name" required placeholder="Playbook name" />
          <Input name="category" placeholder="Category (AGM, Registry, Compliance)" />
          <Input name="estimatedMinutes" type="number" placeholder="Estimated minutes" defaultValue={60} />
          <textarea
            name="steps"
            required
            placeholder="One step per line"
            className="w-full min-h-32 rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createPlaybook.isPending}>Create playbook</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

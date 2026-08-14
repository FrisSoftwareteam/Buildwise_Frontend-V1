import { CalendarClock } from "lucide-react";
import { formatTaskTimeline, isTaskOverdue } from "@/lib/task-timeline";

export function TaskTimelineBadge({
  dueDate,
  status,
}: {
  dueDate?: string | null;
  status?: string | null;
}) {
  const overdue = isTaskOverdue({ dueDate, status });

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] ${
        overdue ? "text-red-400" : "text-slate-400"
      }`}
    >
      <CalendarClock className="w-3 h-3" />
      {overdue ? `Overdue · ${formatTaskTimeline(dueDate)}` : formatTaskTimeline(dueDate)}
    </span>
  );
}

import { format } from "date-fns";

export function todayStamp(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(task: { dueDate?: string | null; status?: string | null }) {
  if (!task.dueDate || task.status === "done") return false;
  return task.dueDate < todayStamp();
}

export function formatTaskTimeline(dueDate?: string | null) {
  if (!dueDate) return "No timeline";
  const date = new Date(dueDate.includes("T") ? dueDate : `${dueDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dueDate;
  return format(date, "MMM d, yyyy");
}

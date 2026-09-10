import type { Project, UpdateProjectBody } from "@workspace/api-client-react";

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function productLifecyclePatch(
  status: "inactive" | "completed" | "in_progress" | "on_hold",
  project: Pick<Project, "endDate">,
): UpdateProjectBody {
  if (status === "completed") {
    return {
      status: "completed",
      completionRate: 100,
      endDate: project.endDate || todayIsoDate(),
    };
  }
  if (status === "inactive") {
    return {
      status: "inactive",
      endDate: project.endDate || todayIsoDate(),
    };
  }
  if (status === "on_hold") {
    // Reopen a closed product into review/on-hold rather than straight back
    // to active work. Clears the completed-date since the product is no
    // longer considered finished.
    return { status: "on_hold", endDate: null };
  }
  // Reopening back to active work also clears a stale completed-date left
  // over from when the product was previously marked completed/inactive.
  return { status: "in_progress", endDate: null };
}

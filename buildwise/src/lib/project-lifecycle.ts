import type { Project, UpdateProjectBody } from "@workspace/api-client-react";

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function productLifecyclePatch(
  status: "inactive" | "completed" | "in_progress",
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
  return { status: "in_progress" };
}

export const WORK_PARTS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "database", label: "Database" },
  { value: "integration", label: "Integration" },
  { value: "cloud_hosting", label: "Cloud hosting" },
] as const;

export type WorkPart = (typeof WORK_PARTS)[number]["value"];

export type ProjectContributor = {
  name: string;
  userId?: number | null;
  parts: WorkPart[];
};

export function workPartLabel(value: string) {
  return WORK_PARTS.find((part) => part.value === value)?.label || value;
}

export function formatContributor(contributor: { name: string; parts?: string[] | null }) {
  const parts = (contributor.parts || []).map(workPartLabel);
  return parts.length ? `${contributor.name} — ${parts.join(", ")}` : contributor.name;
}

export function emptyContributor(): ProjectContributor {
  return { name: "", userId: null, parts: [] };
}

export function sanitizeContributors(contributors: ProjectContributor[]) {
  return contributors
    .map((contributor) => ({
      name: contributor.name.trim(),
      userId: contributor.userId ?? null,
      parts: (contributor.parts || []).filter((part): part is WorkPart =>
        WORK_PARTS.some((item) => item.value === part),
      ),
    }))
    .filter((contributor) => contributor.name);
}

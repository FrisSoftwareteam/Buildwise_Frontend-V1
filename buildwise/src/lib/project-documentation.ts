const STORAGE_KEY = "buildwise.projectDocumentation";

type ProjectDocumentationMap = Record<string, string>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAllProjectDocumentation(): ProjectDocumentationMap {
  if (!isBrowser()) return {};

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as ProjectDocumentationMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllProjectDocumentation(data: ProjectDocumentationMap): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getProjectDocumentation(projectId: number): string {
  return readAllProjectDocumentation()[String(projectId)] ?? "";
}

export function saveProjectDocumentation(projectId: number, documentation: string): void {
  const existing = readAllProjectDocumentation();
  const normalized = documentation.trim();

  if (normalized) {
    existing[String(projectId)] = documentation;
  } else {
    delete existing[String(projectId)];
  }

  writeAllProjectDocumentation(existing);
}

export const PROJECT_REQUIRED_DOCUMENTS = [
  { value: "scope", label: "Project Scope" },
  { value: "manual", label: "Project Manual" },
  { value: "technical", label: "Project Technical Documentation" },
  { value: "sign_off", label: "Project Sign Off Document" },
] as const;

export type ProjectRequiredDocumentKind = (typeof PROJECT_REQUIRED_DOCUMENTS)[number]["value"];

export type UploadedProjectDocument = {
  kind: ProjectRequiredDocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt?: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

async function readApiError(res: Response) {
  try {
    const body = await res.json() as { error?: string };
    return body.error || res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export function documentForKind(
  documents: UploadedProjectDocument[] | undefined,
  kind: ProjectRequiredDocumentKind,
) {
  return (documents || []).find((item) => item.kind === kind) || null;
}

export function uploadedRequiredCount(documents: UploadedProjectDocument[] | undefined) {
  return PROJECT_REQUIRED_DOCUMENTS.filter((item) => documentForKind(documents, item.value)).length;
}

export function formatDocumentSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadProjectDocument(
  projectId: number,
  kind: ProjectRequiredDocumentKind,
  file: File,
) {
  if (file.size > MAX_BYTES) {
    throw new Error("Each document must be 10 MB or smaller");
  }

  const res = await fetch(`/api/projects/${projectId}/documents/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      content: await fileToBase64(file),
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function deleteProjectDocument(projectId: number, kind: ProjectRequiredDocumentKind) {
  const res = await fetch(`/api/projects/${projectId}/documents/${kind}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export function projectDocumentDownloadUrl(projectId: number, kind: ProjectRequiredDocumentKind) {
  return `/api/projects/${projectId}/documents/${kind}`;
}

export async function getProjectDocumentsForAi(projectId: number, documents: UploadedProjectDocument[] | undefined) {
  const sections = await Promise.all(
    PROJECT_REQUIRED_DOCUMENTS.map(async (item) => {
      const uploaded = documentForKind(documents, item.value);
      if (!uploaded) {
        return `${item.label}: missing`;
      }
      try {
        const res = await fetch(`/api/projects/${projectId}/documents/${item.value}/text`);
        if (!res.ok) {
          return `${item.label}: uploaded as ${uploaded.fileName}`;
        }
        const body = await res.json() as { fileName?: string; text?: string | null };
        if (body.text?.trim()) {
          return `${item.label} (${body.fileName}):\n${body.text.trim()}`;
        }
        return `${item.label}: uploaded as ${uploaded.fileName} (binary file; contents not extracted)`;
      } catch {
        return `${item.label}: uploaded as ${uploaded.fileName}`;
      }
    }),
  );

  return sections.join("\n\n");
}

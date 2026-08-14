import { useRef, useState } from "react";
import { Badge, Button } from "@/components/ui/shared";
import {
  PROJECT_REQUIRED_DOCUMENTS,
  deleteProjectDocument,
  documentForKind,
  formatDocumentSize,
  projectDocumentDownloadUrl,
  uploadProjectDocument,
  uploadedRequiredCount,
  type ProjectRequiredDocumentKind,
  type UploadedProjectDocument,
} from "@/lib/project-required-documents";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";

export function ProjectRequiredDocuments({
  projectId,
  documents,
  canUpload,
  onChanged,
}: {
  projectId: number;
  documents?: UploadedProjectDocument[];
  canUpload: boolean;
  onChanged: () => Promise<unknown> | unknown;
}) {
  const [busyKind, setBusyKind] = useState<ProjectRequiredDocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Partial<Record<ProjectRequiredDocumentKind, HTMLInputElement | null>>>({});
  const uploaded = uploadedRequiredCount(documents);

  const run = async (kind: ProjectRequiredDocumentKind, work: () => Promise<unknown>) => {
    setBusyKind(kind);
    setError(null);
    try {
      await work();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that document");
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center">
            <FileText className="w-4 h-4 mr-2 text-primary" />
            Required documents
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Every product needs these four files: Project Scope, Project Manual, Project Technical Documentation, and Project Sign Off Document.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            uploaded === PROJECT_REQUIRED_DOCUMENTS.length
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              : "border-amber-500/30 text-amber-300 bg-amber-500/10"
          }
        >
          {uploaded}/{PROJECT_REQUIRED_DOCUMENTS.length} uploaded
        </Badge>
      </div>

      <div className="space-y-3">
        {PROJECT_REQUIRED_DOCUMENTS.map((item) => {
          const current = documentForKind(documents, item.value);
          const busy = busyKind === item.value;
          return (
            <div key={item.value} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  {current ? (
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {current.fileName} · {formatDocumentSize(current.size)}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-300 mt-1">Required — not uploaded yet</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {current && (
                    <a href={projectDocumentDownloadUrl(projectId, item.value)}>
                      <Button type="button" variant="outline" size="sm">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download
                      </Button>
                    </a>
                  )}
                  {canUpload && (
                    <>
                      <input
                        ref={(node) => {
                          inputs.current[item.value] = node;
                        }}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          void run(item.value, () => uploadProjectDocument(projectId, item.value, file));
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => inputs.current[item.value]?.click()}
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                        {current ? "Replace" : "Upload"}
                      </Button>
                      {current && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => run(item.value, () => deleteProjectDocument(projectId, item.value))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

import { Button, Input } from "@/components/ui/shared";
import { emptyContributor, WORK_PARTS, type ProjectContributor, type WorkPart } from "@/lib/developer-work";
import { Plus, Trash2 } from "lucide-react";

type TeamMember = {
  id: number;
  name: string;
};

type ContributorsEditorProps = {
  value: ProjectContributor[];
  onChange: (next: ProjectContributor[]) => void;
  teamMembers?: TeamMember[];
};

export function ContributorsEditor({ value, onChange, teamMembers = [] }: ContributorsEditorProps) {
  const updateRow = (index: number, patch: Partial<ProjectContributor>) => {
    onChange(value.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const togglePart = (index: number, part: WorkPart) => {
    const current = value[index]?.parts || [];
    const parts = current.includes(part)
      ? current.filter((item) => item !== part)
      : [...current, part];
    updateRow(index, { parts });
  };

  return (
    <div className="space-y-3">
      {value.map((contributor, index) => (
        <div key={`${contributor.userId ?? "name"}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1.5 block">Developer name</label>
              <Input
                list="software-developer-names"
                value={contributor.name}
                placeholder="Exact name, e.g. Ifeanyi Ayodeji"
                onChange={(event) => {
                  const name = event.target.value;
                  const match = teamMembers.find((member) => member.name.toLowerCase() === name.toLowerCase());
                  updateRow(index, { name, userId: match?.id ?? null });
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-6 text-slate-400 hover:text-red-400"
              onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Parts worked on</p>
            <div className="flex flex-wrap gap-2">
              {WORK_PARTS.map((part) => {
                const checked = contributor.parts.includes(part.value);
                return (
                  <label
                    key={part.value}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      checked
                        ? "border-primary/50 bg-primary/15 text-white"
                        : "border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => togglePart(index, part.value)}
                    />
                    {part.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      {teamMembers.length > 0 && (
        <datalist id="software-developer-names">
          {teamMembers.map((member) => (
            <option key={member.id} value={member.name} />
          ))}
        </datalist>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, emptyContributor()])}>
        <Plus className="w-4 h-4 mr-2" />
        Add developer
      </Button>
    </div>
  );
}

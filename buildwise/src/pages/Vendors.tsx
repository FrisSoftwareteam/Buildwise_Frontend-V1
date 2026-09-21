import { useMemo, useState } from "react";
import {
  useListVendors,
  useCreateVendor,
  useUpdateVendor,
  useListVendorProjects,
  useListProjects,
  useCreateVendorProject,
  useUpdateVendorProject,
  useDeleteVendor,
} from "@workspace/api-client-react";
import { Card, Button, Badge, Input, Dialog } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import { Plus, Search, Building2, Phone, Mail, Globe, Briefcase, Send, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRefreshQueries } from "@/lib/refresh-queries";
import { useAuth } from "@/context/AuthContext";
import { canDeleteVendors, canManageVendors } from "@/lib/software-roles";

export default function Vendors() {
  const { user } = useAuth();
  const canManage = canManageVendors(user?.role, user?.email);
  const canDelete = canDeleteVendors(user?.role, user?.email);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteProjectIds, setInviteProjectIds] = useState<number[]>([]);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    link: string;
    invites?: Array<{ email: string; link: string }>;
    smtpConfigured: boolean;
    mailError?: string;
    linkWarning?: string;
  } | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<number | null>(null);
  const vendorsQuery = useListVendors();
  const vendorProjectsQuery = useListVendorProjects();
  const projectsQuery = useListProjects();
  const { data: vendors, isLoading } = vendorsQuery;
  const { data: vendorProjects } = vendorProjectsQuery;
  const { data: projects } = projectsQuery;
  const refresh = useRefreshQueries();
  
  const createMutation = useCreateVendor({
    mutation: {
      onSuccess: async () => {
        setIsCreateOpen(false);
        await refresh(vendorsQuery.queryKey);
      }
    }
  });
  const updateMutation = useUpdateVendor({
    mutation: {
      onSuccess: async () => {
        setEditingVendorId(null);
        await refresh(vendorsQuery.queryKey, vendorProjectsQuery.queryKey, projectsQuery.queryKey);
      }
    }
  });
  const createVendorProjectMutation = useCreateVendorProject();
  const updateVendorProjectMutation = useUpdateVendorProject();
  const deleteMutation = useDeleteVendor({
    mutation: {
      onSuccess: async () => {
        setDeletingVendorId(null);
        await refresh(vendorsQuery.queryKey, vendorProjectsQuery.queryKey, projectsQuery.queryKey);
      },
    },
  });

  const filteredVendors = vendors?.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const editingVendor = vendors?.find((vendor) => vendor.id === editingVendorId) || null;
  const deletingVendor = vendors?.find((vendor) => vendor.id === deletingVendorId) || null;

  const activeProjectNamesByVendor = useMemo(() => {
    const projectNameById = new Map((projects || []).map((project) => [project.id, project.name]));
    const result = new Map<number, string[]>();

    (vendorProjects || [])
      .filter((vendorProject) =>
        vendorProject.projectId &&
        vendorProject.stage !== "rejected" &&
        vendorProject.stage !== "handover_complete"
      )
      .forEach((vendorProject) => {
        const projectName = vendorProject.projectId
          ? projectNameById.get(vendorProject.projectId)
          : vendorProject.title;
        if (!projectName) {
          return;
        }

        const existing = result.get(vendorProject.vendorId) || [];
        if (!existing.includes(projectName)) {
          existing.push(projectName);
        }
        result.set(vendorProject.vendorId, existing);
      });

    return result;
  }, [projects, vendorProjects]);
  const editableVendorProjectByVendor = useMemo(() => {
    const result = new Map<number, NonNullable<typeof vendorProjects>[number]>();

    (vendorProjects || [])
      .filter((vendorProject) =>
        vendorProject.stage !== "rejected" &&
        vendorProject.stage !== "handover_complete"
      )
      .forEach((vendorProject) => {
        if (!result.has(vendorProject.vendorId)) {
          result.set(vendorProject.vendorId, vendorProject);
        }
      });

    return result;
  }, [vendorProjects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Vendor Directory</h2>
          <p className="text-slate-400 text-sm">Manage third-party partners and contractors.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search vendors..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {canManage && (
            <>
              <Button
                onClick={() => {
                  setInviteError("");
                  setInviteResult(null);
                  setInviteProjectIds([]);
                  setIsInviteOpen(true);
                }}
                className="shrink-0 bg-[#c4a747] hover:bg-[#d4b85c] text-[#0f1c2e] shadow-[#c4a747]/20"
              >
                <Send className="w-4 h-4 mr-2" />
                Invite vendor
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVendors?.map(vendor => (
          <Card key={vendor.id} className="overflow-hidden hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
                  <Briefcase className="w-6 h-6 text-indigo-400" />
                </div>
                <Badge variant="custom" className={getStatusColor(vendor.status)}>
                  {vendor.status.toUpperCase()}
                </Badge>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1">{vendor.name}</h3>
              <p className="text-sm text-indigo-400 mb-3 font-medium">{vendor.specialization || "General Contractor"}</p>
              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: Math.max(vendor.stars || 0, 0) }).map((_, index) => (
                  <Star key={index} className="w-4 h-4 fill-[#c4a747] text-[#c4a747]" />
                ))}
                <span className="text-xs text-slate-400 ml-1">
                  {vendor.stars || 0} star{(vendor.stars || 0) === 1 ? "" : "s"}
                </span>
              </div>

              {activeProjectNamesByVendor.get(vendor.id)?.length ? (
                <div className="mb-5 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">Projects Handling</p>
                  <p className="text-sm text-white leading-relaxed">
                    {activeProjectNamesByVendor.get(vendor.id)?.join(", ")}
                  </p>
                </div>
              ) : null}

              <div className="space-y-3 text-sm">
                <div className="flex items-center text-slate-400">
                  <Globe className="w-4 h-4 mr-3 text-slate-500" />
                  {vendor.country || 'Global'}
                </div>
                {vendor.contactEmail && (
                  <div className="flex items-center text-slate-400">
                    <Mail className="w-4 h-4 mr-3 text-slate-500" />
                    {vendor.contactEmail}
                  </div>
                )}
                {vendor.contactEmail2 && (
                  <div className="flex items-center text-slate-400">
                    <Mail className="w-4 h-4 mr-3 text-slate-500" />
                    {vendor.contactEmail2}
                  </div>
                )}
                {vendor.contactPhone && (
                  <div className="flex items-center text-slate-400">
                    <Phone className="w-4 h-4 mr-3 text-slate-500" />
                    {vendor.contactPhone}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-900/50 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
              <span>Added {format(new Date(vendor.createdAt), 'MMM yyyy')}</span>
              <div className="flex items-center gap-1">
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                    onClick={() => setEditingVendorId(vendor.id)}
                  >
                    Edit Profile
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => setDeletingVendorId(vendor.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        isOpen={isInviteOpen}
        onClose={() => {
          if (!inviteLoading) setIsInviteOpen(false);
        }}
        title="Invite vendor"
      >
        {inviteResult ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {inviteResult.mailError
                ? `The invite was created, but email sending failed (${inviteResult.mailError}). Copy the full link${(inviteResult.invites?.length || 1) > 1 ? "s" : ""} and share them with the vendor.`
                : inviteResult.smtpConfigured
                ? "Invitation email was sent to the vendor Google account(s). PMO officers were copied."
                : "SMTP is not configured, so the email was logged instead of sent. Copy the full link and share it with the vendor."}
            </p>
            {inviteResult.linkWarning && (
              <p className="text-sm text-amber-300">{inviteResult.linkWarning} Set PUBLIC_WEB_URL on the backend to your live site, for example https://your-app.vercel.app, then send the invite again.</p>
            )}
            {(inviteResult.invites && inviteResult.invites.length > 0 ? inviteResult.invites : [{ email: "Vendor", link: inviteResult.link }]).map((invite) => (
              <div key={invite.link} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Sign-in link for {invite.email}</p>
                <a href={invite.link} className="text-sm text-[#c4a747] break-all underline" target="_blank" rel="noreferrer">
                  {invite.link}
                </a>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invite.link);
                      } catch {}
                    }}
                  >
                    Copy full link
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-500"
                onClick={() => setIsInviteOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setInviteError("");
              const fd = new FormData(e.currentTarget);
              const name = String(fd.get("name") || "").trim();
              const contactName = String(fd.get("contactName") || "").trim();
              const email = String(fd.get("email") || "").trim().toLowerCase();
              const email2 = String(fd.get("email2") || "").trim().toLowerCase();
              if (inviteProjectIds.length === 0) {
                setInviteError("Select at least one software product.");
                return;
              }
              if (email2 && email2 === email) {
                setInviteError("Use two different Google emails, or leave the second email blank.");
                return;
              }
              setInviteLoading(true);
              try {
                const base = import.meta.env.BASE_URL.replace(/\/$/, "");
                const res = await fetch(`${base}/api/vendor-invites`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(user?.id ? { "x-buildwise-user-id": String(user.id) } : {}),
                    ...(user?.email ? { "x-buildwise-user-email": user.email } : {}),
                  },
                  body: JSON.stringify({
                    name,
                    contactName,
                    email,
                    email2: email2 || undefined,
                    projectIds: inviteProjectIds,
                    invitedBy: user?.email,
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  throw new Error(typeof data.error === "string" ? data.error : "Failed to send invite");
                }
                setInviteResult({
                  link: data.link,
                  invites: Array.isArray(data.invites) ? data.invites : [{ email, link: data.link }],
                  smtpConfigured: Boolean(data.smtpConfigured),
                  mailError: typeof data.mailError === "string" ? data.mailError : undefined,
                  linkWarning: typeof data.linkWarning === "string" ? data.linkWarning : undefined,
                });
                await refresh(vendorsQuery.queryKey, vendorProjectsQuery.queryKey, projectsQuery.queryKey);
              } catch (err) {
                setInviteError(err instanceof Error ? err.message : "Failed to send invite");
              } finally {
                setInviteLoading(false);
              }
            }}
            className="space-y-4"
          >
            {inviteError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {inviteError}
              </p>
            )}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor company name</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Contact name</label>
              <Input name="contactName" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor Google email 1</label>
              <Input name="email" type="email" required placeholder="pm@vendor.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor Google email 2 (optional)</label>
              <Input name="email2" type="email" placeholder="developer@vendor.com" />
              <p className="text-xs text-slate-500 mt-1">Up to two people from the same company can share this vendor account.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Assign software products</p>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-white/10 p-3">
                {(projects || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No software products available yet.</p>
                ) : (
                  (projects || []).map((project) => (
                    <label key={project.id} className="flex items-start gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={inviteProjectIds.includes(project.id)}
                        onChange={(event) => {
                          setInviteProjectIds((current) =>
                            event.target.checked
                              ? [...current, project.id]
                              : current.filter((id) => id !== project.id),
                          );
                        }}
                      />
                      <span>{project.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Each email receives its own Google sign-in link. Both people see the same products, milestones, and stars. PMO officers are copied automatically.
            </p>
            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={inviteLoading} className="bg-[#c4a747] hover:bg-[#d4b85c] text-[#0f1c2e]">
                Send invite
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Vendor">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createMutation.mutate({
            data: {
              name: fd.get('name') as string,
              contactName: fd.get('contactName') as string,
              contactEmail: fd.get('contactEmail') as string,
              status: fd.get('status') as any,
              specialization: fd.get('specialization') as string,
              country: fd.get('country') as string,
            }
          });
        }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor Company Name</label>
            <Input name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Specialization</label>
              <Input name="specialization" placeholder="e.g. Cloud Security" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select name="status" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Primary Contact</label>
              <Input name="contactName" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Contact Email</label>
              <Input name="contactEmail" type="email" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Country</label>
            <Input name="country" />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500">Register Vendor</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={!!editingVendor}
        onClose={() => setEditingVendorId(null)}
        title={editingVendor ? `Edit ${editingVendor.name}` : "Edit Vendor"}
      >
        {editingVendor && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const selectedProjectId = fd.get("projectId")
                ? Number(fd.get("projectId"))
                : null;
              const existingVendorProject = editableVendorProjectByVendor.get(editingVendor.id);
              const selectedProject = projects?.find((project) => project.id === selectedProjectId) || null;

              await updateMutation.mutateAsync({
                id: editingVendor.id,
                data: {
                  name: fd.get("name") as string,
                  contactName: (fd.get("contactName") as string) || undefined,
                  contactEmail: (fd.get("contactEmail") as string) || undefined,
                  contactEmail2: (fd.get("contactEmail2") as string) || null,
                  contactPhone: (fd.get("contactPhone") as string) || undefined,
                  status: fd.get("status") as "pending" | "active" | "blacklisted",
                  specialization: (fd.get("specialization") as string) || undefined,
                  country: (fd.get("country") as string) || undefined,
                  registrationNumber: (fd.get("registrationNumber") as string) || undefined,
                },
              });

              if (existingVendorProject) {
                await updateVendorProjectMutation.mutateAsync({
                  id: existingVendorProject.id,
                  data: {
                    title: selectedProject?.name || existingVendorProject.title,
                    description: existingVendorProject.description,
                    stage: selectedProjectId ? existingVendorProject.stage : "submitted",
                    estimatedValue: existingVendorProject.estimatedValue,
                    handoverDate: existingVendorProject.handoverDate,
                    reviewNotes: existingVendorProject.reviewNotes,
                    projectId: selectedProjectId,
                  },
                });
              } else if (selectedProjectId && selectedProject) {
                const createdVendorProject = await createVendorProjectMutation.mutateAsync({
                  data: {
                    vendorId: editingVendor.id,
                    title: selectedProject.name,
                    description: `Vendor assignment for ${selectedProject.name}.`,
                  },
                });

                await updateVendorProjectMutation.mutateAsync({
                  id: createdVendorProject.id,
                  data: {
                    title: selectedProject.name,
                    description: createdVendorProject.description,
                    stage: "approved",
                    estimatedValue: createdVendorProject.estimatedValue,
                    handoverDate: createdVendorProject.handoverDate,
                    reviewNotes: "Linked from vendor profile.",
                    projectId: selectedProjectId,
                  },
                });
              }

              setEditingVendorId(null);
              await refresh(vendorsQuery.queryKey, vendorProjectsQuery.queryKey, projectsQuery.queryKey);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor Company Name</label>
              <Input name="name" required defaultValue={editingVendor.name} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Projects Handling</label>
              <select
                name="projectId"
                defaultValue={editableVendorProjectByVendor.get(editingVendor.id)?.projectId || ""}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">No linked project</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Specialization</label>
                <Input name="specialization" defaultValue={editingVendor.specialization || ""} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
                <select
                  name="status"
                  defaultValue={editingVendor.status}
                  className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Primary Contact</label>
                <Input name="contactName" defaultValue={editingVendor.contactName || ""} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Contact Phone</label>
                <Input name="contactPhone" defaultValue={editingVendor.contactPhone || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Google email 1</label>
                <Input name="contactEmail" type="email" defaultValue={editingVendor.contactEmail || ""} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Google email 2</label>
                <Input name="contactEmail2" type="email" defaultValue={editingVendor.contactEmail2 || ""} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Country</label>
              <Input name="country" defaultValue={editingVendor.country || ""} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Registration Number</label>
              <Input name="registrationNumber" defaultValue={editingVendor.registrationNumber || ""} />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingVendorId(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={
                  updateMutation.isPending ||
                  createVendorProjectMutation.isPending ||
                  updateVendorProjectMutation.isPending
                }
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <Dialog
        isOpen={!!deletingVendor}
        onClose={() => {
          if (!deleteMutation.isPending) setDeletingVendorId(null);
        }}
        title={deletingVendor ? `Delete ${deletingVendor.name}` : "Delete vendor"}
      >
        {deletingVendor && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              This removes {deletingVendor.name} from the directory, unassigns their products, and they will no longer be able to sign in as this vendor.
            </p>
            {deleteMutation.error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Failed to delete vendor"}
              </p>
            )}
            <div className="pt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={deleteMutation.isPending}
                onClick={() => setDeletingVendorId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-500"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deletingVendor.id })}
              >
                Delete vendor
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

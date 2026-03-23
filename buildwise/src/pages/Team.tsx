import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateUser, useListUsers, useUpdateUser } from "@workspace/api-client-react";
import { Avatar, Badge, Button, Card, Dialog, Input } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import { Briefcase, Mail, Pencil, Plus, Search, Users } from "lucide-react";
import { format } from "date-fns";

const roleOptions = [
  { value: "manager", label: "Project Manager" },
  { value: "admin", label: "Portfolio Admin" },
  { value: "developer", label: "Software Engineer" },
  { value: "viewer", label: "Stakeholder" },
] as const;

type TeamRole = (typeof roleOptions)[number]["value"];

function getRoleLabel(role: TeamRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Team() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const usersQuery = useListUsers();
  const users = usersQuery.data || [];

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: async () => {
        setIsCreateOpen(false);
        await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
      },
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: async () => {
        setEditingMemberId(null);
        await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
      },
    },
  });

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.department, getRoleLabel(user.role)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search)),
    );
  }, [searchTerm, users]);

  const teamStats = useMemo(() => {
    return {
      total: users.length,
    };
  }, [users]);

  const editingMember = users.find((user) => user.id === editingMemberId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Team Directory</h2>
          <p className="text-slate-400 text-sm">
            Add and manage project management team members across the portfolio.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
              placeholder="Search team members..."
            />
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-indigo-500/15 bg-gradient-to-br from-indigo-500/10 to-slate-950">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Members</p>
              <p className="mt-2 text-3xl font-bold text-white">{teamStats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card
            key={user.id}
            className="overflow-hidden border-white/10 hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={user.avatarUrl}
                    fallback={getInitials(user.name)}
                    className="h-12 w-12 border-indigo-500/20 bg-indigo-500/10"
                  />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{user.name}</h3>
                    <p className="text-sm text-slate-400 truncate">{user.department}</p>
                  </div>
                </div>
                <Badge variant="custom" className={getStatusColor(user.role === "viewer" ? "pending" : "active")}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <span>{getRoleLabel(user.role)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-900/50 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span>Added {format(new Date(user.createdAt), "MMM yyyy")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                onClick={() => setEditingMemberId(user.id)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Member
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {!filteredUsers.length ? (
        <Card className="border-dashed border-white/10">
          <div className="py-16 px-6 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-white">No team members found</h3>
            <p className="mt-2 text-sm text-slate-400">
              Add project management team members here so they appear in the directory.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-5">
              <Plus className="w-4 h-4 mr-2" />
              Add First Member
            </Button>
          </div>
        </Card>
      ) : null}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Team Member">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);

            createMutation.mutate({
              data: {
                name: fd.get("name") as string,
                email: fd.get("email") as string,
                role: fd.get("role") as "admin" | "manager" | "developer" | "viewer",
                department: fd.get("department") as string,
                avatarUrl: (fd.get("avatarUrl") as string) || undefined,
              },
            });
          }}
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Full Name</label>
            <Input name="name" required placeholder="e.g. Amina Yusuf" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Work Email</label>
            <Input name="email" type="email" required placeholder="e.g. amina@firstregistrarsnigeria.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Role</label>
              <select
                name="role"
                defaultValue="manager"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Department</label>
              <Input name="department" required defaultValue="Project Management Office" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Avatar URL</label>
            <Input name="avatarUrl" placeholder="Optional profile image link" />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500">
              Save Member
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={!!editingMember}
        onClose={() => setEditingMemberId(null)}
        title={editingMember ? `Edit ${editingMember.name}` : "Edit Team Member"}
      >
        {editingMember ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);

              updateMutation.mutate({
                id: editingMember.id,
                data: {
                  name: fd.get("name") as string,
                  email: fd.get("email") as string,
                  role: fd.get("role") as "admin" | "manager" | "developer" | "viewer",
                  department: fd.get("department") as string,
                  avatarUrl: (fd.get("avatarUrl") as string) || undefined,
                },
              });
            }}
          >
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Full Name</label>
              <Input name="name" required defaultValue={editingMember.name} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Work Email</label>
              <Input name="email" type="email" required defaultValue={editingMember.email} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Role</label>
                <select
                  name="role"
                  defaultValue={editingMember.role}
                  className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Department</label>
                <Input name="department" required defaultValue={editingMember.department} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Avatar URL</label>
              <Input name="avatarUrl" defaultValue={editingMember.avatarUrl || ""} />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingMemberId(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500">
                Update Member
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}

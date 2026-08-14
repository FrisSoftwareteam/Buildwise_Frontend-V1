import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { softwareRoleLabel } from "@/lib/software-roles";
import { Card, Button, Badge } from "@/components/ui/shared";
import { LogOut, Mail, Shield, Building2, UserRound } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const roleLabel = softwareRoleLabel(user?.role);

  const initials = user?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("") || "FR";

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Your BuildWise profile and workspace preferences.</p>
      </div>

      <Card className="p-6 border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#1b3a6b] to-[#2a5298] border border-[#c4a747]/40 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white">{user?.name}</h3>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
          </div>
          <Badge variant="outline" className="border-[#c4a747]/30 text-[#c4a747] bg-[#c4a747]/10">
            {roleLabel}
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 border-white/5">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <UserRound className="h-4 w-4 text-[#c4a747]" />
            Full name
          </div>
          <p className="mt-2 text-white font-medium">{user?.name}</p>
        </Card>
        <Card className="p-5 border-white/5">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Mail className="h-4 w-4 text-[#c4a747]" />
            Work email
          </div>
          <p className="mt-2 text-white font-medium">{user?.email}</p>
        </Card>
        <Card className="p-5 border-white/5">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Building2 className="h-4 w-4 text-[#c4a747]" />
            Department
          </div>
          <p className="mt-2 text-white font-medium">{user?.department || "Not set"}</p>
        </Card>
        <Card className="p-5 border-white/5">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Shield className="h-4 w-4 text-[#c4a747]" />
            Role
          </div>
          <p className="mt-2 text-white font-medium capitalize">{roleLabel}</p>
        </Card>
      </div>

      <Card className="p-6 border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-semibold">Sign out</h3>
          <p className="text-slate-400 text-sm mt-1">End this session on this device.</p>
        </div>
        <Button
          onClick={handleLogout}
          className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </Card>
    </div>
  );
}

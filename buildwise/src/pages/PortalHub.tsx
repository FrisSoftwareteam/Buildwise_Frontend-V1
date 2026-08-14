import { Link } from "wouter";
import { Code2, Landmark } from "lucide-react";
import { GOVERNANCE_HOME, SOFTWARE_HOME, rememberPortal } from "@/lib/portals";
import { useAuth } from "@/context/AuthContext";
import { canAccessGovernance, softwareRoleLabel } from "@/lib/software-roles";

export default function PortalHub() {
  const { user } = useAuth();
  const showGovernance = canAccessGovernance(user?.role);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-[#c4a747]">BuildWise</p>
        <h2 className="text-3xl font-bold text-white">Choose a portal</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          {showGovernance
            ? "Software is for building products. Governance is for running issuer meetings. They stay separate on purpose."
            : "You are signed in as an External Software Vendor. Use the Software portal to follow products and your pipeline."}
        </p>
        {user?.role && (
          <p className="text-sm text-indigo-300">Software role: {softwareRoleLabel(user.role)}</p>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showGovernance ? "md:grid-cols-2" : ""} gap-6`}>
        <Link
          href={SOFTWARE_HOME}
          onClick={() => rememberPortal("software")}
          className="group rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/50 to-slate-950 p-8 hover:border-indigo-400/50 transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-6">
            <Code2 className="h-6 w-6" />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-300">Sub-portal 1</p>
          <h3 className="mt-2 text-2xl font-bold text-white group-hover:text-indigo-200">Software</h3>
          <p className="mt-3 text-slate-400">Building a web app, desktop app, mobile app, or enterprise system.</p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li>Products</li>
            <li>Sprint board</li>
            <li>Backlog</li>
            <li>Sprints</li>
          </ul>
        </Link>

        {showGovernance && (
        <Link
          href={GOVERNANCE_HOME}
          onClick={() => rememberPortal("governance")}
          className="group rounded-2xl border border-[#c4a747]/20 bg-gradient-to-br from-[#1b3a6b]/40 to-slate-950 p-8 hover:border-[#c4a747]/50 transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-[#c4a747]/15 text-[#c4a747] flex items-center justify-center mb-6">
            <Landmark className="h-6 w-6" />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#c4a747]">Sub-portal 2</p>
          <h3 className="mt-2 text-2xl font-bold text-white group-hover:text-[#e4d08a]">Governance</h3>
          <p className="mt-3 text-slate-400">Running an issuer meeting — notice, vote, minutes. Not software delivery.</p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li>Issuer meetings</li>
            <li>Operations Center</li>
            <li>Playbooks &amp; Time</li>
          </ul>
        </Link>
        )}
      </div>
    </div>
  );
}

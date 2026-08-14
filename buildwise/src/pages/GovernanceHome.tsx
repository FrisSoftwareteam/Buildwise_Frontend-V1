import { Link } from "wouter";
import { Card, Badge, Button } from "@/components/ui/shared";
import { useOperationsSummary } from "@/lib/operations-api";
import { Landmark, Loader2, ScrollText, Shield } from "lucide-react";

export default function GovernanceHome() {
  const summaryQuery = useOperationsSummary();
  const summary = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (summaryQuery.isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <p className="text-white font-medium">Could not load the Governance portal.</p>
        <p className="text-sm mt-2">Check that the API is running, then refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#c4a747]/20 bg-gradient-to-r from-[#0f1c2e] to-[#1b3a6b]/60 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[#c4a747]">Governance portal</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Issuer meetings</h2>
        <p className="mt-2 text-slate-300 max-w-3xl">
          Running an AGM or class meeting — notice, vote, minutes. Software products are built in the Software portal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Active meetings", value: summary?.activeMeetings ?? 0, href: "/agm", icon: Landmark },
          { label: "Open alerts", value: summary?.openAlerts ?? 0, href: "/operations", icon: Shield },
          { label: "Open actions", value: summary?.openActions ?? 0, href: "/operations", icon: ScrollText },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="block group">
              <Card className="p-5 border-white/5 group-hover:border-[#c4a747]/40 transition-colors">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Icon className="w-4 h-4 text-[#c4a747]" />
                  {item.label}
                </div>
                <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-white/5 space-y-3">
          <Badge variant="outline" className="border-[#c4a747]/30 text-[#c4a747]">Issuer meetings</Badge>
          <p className="text-white font-semibold">Notice, quorum, voting, minutes</p>
          <p className="text-sm text-slate-400">Open the meeting workspace for a statutory AGM or EGM.</p>
          <Link href="/agm"><Button variant="outline">Open meetings</Button></Link>
        </Card>
        <Card className="p-6 border-white/5 space-y-3">
          <Badge variant="outline">Operations Center</Badge>
          <p className="text-white font-semibold">Approvals, alerts, filing actions</p>
          <p className="text-sm text-slate-400">The control room around those meetings.</p>
          <Link href="/operations"><Button variant="outline">Open operations</Button></Link>
        </Card>
        <Card className="p-6 border-white/5 space-y-3">
          <Badge variant="outline">Playbooks</Badge>
          <p className="text-white font-semibold">AGM, dividend, probate runbooks</p>
          <p className="text-sm text-slate-400">Standard steps and time logging for registry work.</p>
          <Link href="/playbooks"><Button variant="outline">Open playbooks</Button></Link>
        </Card>
      </div>
    </div>
  );
}

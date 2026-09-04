import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { AuthProviderButtons, hasVisibleProviders } from "@/components/auth/AuthProviderButtons";

export default function Login() {
  const { loginWithProvider, oauthProviders, isLoading } = useAuth();
  const [locationSearch] = useLocation();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const oauthError = params?.get("error") || "";
  void locationSearch;

  const microsoftAvailable = hasVisibleProviders(oauthProviders);

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0f1c2e] flex-col justify-between p-12 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#c4a747] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#1b3a6b] rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="bg-white rounded-xl px-6 py-4 inline-block">
            <img
              src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`}
              alt="First Registrars"
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Build software.<br />
              <span className="text-[#c4a747]">Run meetings.</span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed">
              BuildWise keeps software products (web, desktop, enterprise) on a sprint board, and issuer AGMs in a separate governance workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Software products", value: "16+" },
              { label: "Vendors Managed", value: "3+" },
              { label: "Tasks Tracked", value: "120+" },
              { label: "AI Insights", value: "Daily" },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-[#0a1628] px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Branded header */}
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="bg-white rounded-xl px-4 py-2 shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`}
                alt="First Registrars"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c4a747]">First Registrars</p>
              <p className="text-lg font-bold text-white leading-tight">BuildWise</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="mt-2 text-slate-400">Sign in with your First Registrars Microsoft account</p>
          </div>

          {oauthError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {oauthError}
            </div>
          )}

          {microsoftAvailable ? (
            <AuthProviderButtons
              availableProviders={oauthProviders}
              disabled={isLoading}
              onSelect={(provider) => loginWithProvider(provider)}
            />
          ) : (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Microsoft sign-in is not yet configured for this environment. Contact your administrator.
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            BuildWise accounts are managed by First Registrars &amp; Investor Services. Only organizational Microsoft accounts can sign in.
          </p>

        </div>
      </div>
    </div>
  );
}

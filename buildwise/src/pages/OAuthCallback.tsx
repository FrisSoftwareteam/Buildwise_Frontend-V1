import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export default function OAuthCallback() {
  const { completeOAuthRedirect } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const result = completeOAuthRedirect(window.location.search);

    if (result.ok) {
      setLocation("/");
      return;
    }

    setError(result.error ?? "Sign-in failed.");
  }, [completeOAuthRedirect, setLocation]);

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white shadow-2xl shadow-black/20">
        <div className="mx-auto mb-5 w-fit rounded-xl bg-white px-4 py-2">
          <img
            src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`}
            alt="First Registrars"
            className="h-8 w-auto object-contain"
          />
        </div>

        {error ? (
          <>
            <h1 className="text-2xl font-bold">Sign-in was not completed</h1>
            <p className="mt-3 text-sm text-slate-300">{error}</p>
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="mt-6 w-full rounded-xl border border-[#c4a747]/40 bg-[#1b3a6b] px-4 py-3 font-semibold transition hover:bg-[#214680]"
            >
              Return to login
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#c4a747]" />
            <h1 className="text-2xl font-bold">Finishing sign-in</h1>
            <p className="mt-3 text-sm text-slate-300">We are linking your account and taking you into BuildWise.</p>
          </>
        )}
      </div>
    </div>
  );
}

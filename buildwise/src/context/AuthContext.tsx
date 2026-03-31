import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roles?: string[] | null;
  department: string;
  avatarUrl?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  oauthProviders: Record<"google" | "microsoft", boolean>;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; department: string; role: string }) => Promise<void>;
  loginWithProvider: (provider: "google" | "microsoft") => void;
  completeOAuthRedirect: (search: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "buildwise_user";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function buildOAuthCallbackUrl() {
  return new URL(`${BASE || ""}/auth/callback`, window.location.origin).toString();
}

function normalizeStoredUser(user: AuthUser): AuthUser {
  if (user.email === "ifeanyiayodeji@firstregistrarsnigeria.com") {
    return {
      ...user,
      role: "Software Engineer",
      roles: ["Software Engineer", "Software Unit Supervisor"],
      department: "Software",
    };
  }

  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oauthProviders, setOauthProviders] = useState<Record<"google" | "microsoft", boolean>>({
    google: false,
    microsoft: false,
  });

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isMounted) {
          const normalizedUser = normalizeStoredUser(JSON.parse(stored));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
          setUser(normalizedUser);
        }
      } catch {}

      try {
        const response = await fetch(`${BASE}/api/auth/providers`);
        if (!response.ok) {
          throw new Error("Provider lookup failed");
        }

        const data = await response.json() as Partial<Record<"google" | "microsoft", boolean>>;
        if (isMounted) {
          setOauthProviders({
            google: Boolean(data.google),
            microsoft: Boolean(data.microsoft),
          });
        }
      } catch {
        if (isMounted) {
          setOauthProviders({
            google: false,
            microsoft: false,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    const normalizedUser = normalizeStoredUser(data.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const signup = async (payload: { name: string; email: string; password: string; department: string; role: string }) => {
    const res = await fetch(`${BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    const normalizedUser = normalizeStoredUser(data.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const loginWithProvider = (provider: "google" | "microsoft") => {
    const url = new URL(`${BASE}/api/auth/oauth/${provider}/start`, window.location.origin);
    url.searchParams.set("redirectTo", buildOAuthCallbackUrl());
    window.location.assign(url.toString());
  };

  const completeOAuthRedirect = (search: string) => {
    const params = new URLSearchParams(search);
    const error = params.get("error");
    const auth = params.get("auth");

    if (error) {
      return { ok: false, error };
    }

    if (!auth) {
      return { ok: false, error: "Sign-in response is missing." };
    }

    try {
      const parsed = JSON.parse(decodeBase64Url(auth)) as { user?: AuthUser };
      if (!parsed.user) {
        return { ok: false, error: "Sign-in response is invalid." };
      }

      const normalizedUser = normalizeStoredUser(parsed.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not finish sign-in." };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, oauthProviders, login, signup, loginWithProvider, completeOAuthRedirect, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

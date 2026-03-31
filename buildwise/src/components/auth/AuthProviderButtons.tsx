import { Chrome, Building2 } from "lucide-react";

type Provider = "google" | "microsoft";

type AuthProviderButtonsProps = {
  availableProviders: Record<Provider, boolean>;
  disabled?: boolean;
  onSelect: (provider: Provider) => void;
};

const PROVIDERS: Array<{
  provider: Provider;
  label: string;
  Icon: typeof Chrome;
}> = [
  {
    provider: "google",
    label: "Continue with Google",
    Icon: Chrome,
  },
  {
    provider: "microsoft",
    label: "Continue with Microsoft",
    Icon: Building2,
  },
];

export function AuthProviderButtons({
  availableProviders,
  disabled = false,
  onSelect,
}: AuthProviderButtonsProps) {
  const visibleProviders = PROVIDERS.filter(
    ({ provider }) => availableProviders[provider],
  );

  if (visibleProviders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleProviders.map(({ provider, label, Icon }) => (
        <button
          key={provider}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(provider)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-[#c4a747]/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-3">
            <Icon className="h-4 w-4 text-[#c4a747]" />
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

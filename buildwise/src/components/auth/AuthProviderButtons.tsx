type Provider = "microsoft";

type AuthProviderButtonsProps = {
  availableProviders: Record<Provider, boolean>;
  disabled?: boolean;
  onSelect: (provider: Provider) => void;
};

const PROVIDERS: Array<{
  provider: Provider;
  label: string;
}> = [
  {
    provider: "microsoft",
    label: "Continue with Microsoft",
  },
];

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function hasVisibleProviders(availableProviders: Record<Provider, boolean>) {
  return PROVIDERS.some(({ provider }) => availableProviders[provider]);
}

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
      {visibleProviders.map(({ provider, label }) => (
        <button
          key={provider}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(provider)}
          className="w-full rounded-xl border border-white/10 bg-white px-4 py-3.5 text-[#1c2436] font-semibold transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-3">
            <MicrosoftLogo className="h-5 w-5" />
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

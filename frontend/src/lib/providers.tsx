"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext } from "react";
import { ToastProvider } from "@/components/Toast";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { setAuthTokenGetter } from "@/lib/api";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const usePrivyAuth = !!PRIVY_APP_ID && !USE_MOCK;

// Auth context — provides ready/authenticated/authVerified state to the whole app tree.
// authVerified becomes true only after the token getter is registered, guaranteeing
// no page query fires before apiFetch can attach a Bearer token.
// Defaults to all-true so mock mode works unchanged.
interface AppAuthState {
  ready: boolean;
  authenticated: boolean;
  authVerified: boolean;
}
const AuthContext = createContext<AppAuthState>({ ready: true, authenticated: true, authVerified: true });
export const useAppAuth = () => useContext(AuthContext);

// Merged bridge: reads Privy state, registers the token getter, exposes authVerified,
// and handles unauthorized logout — all in one component to avoid sibling-effect races.
function PrivyAuthContextBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const [authVerified, setAuthVerified] = useState(false);

  // Register token getter the moment Privy says we're authenticated, then warm up
  // the token with one real call before flipping authVerified. This guarantees the
  // cached JWT is ready before any child query fires — no more 401 on first load.
  useEffect(() => {
    if (!authenticated) {
      setAuthVerified(false);
      return;
    }
    let cancelled = false;
    setAuthTokenGetter(() => getAccessToken());
    // Warm up: resolve the token once so Privy caches it internally.
    // Proceed regardless of the result — apiFetch will handle a null token gracefully.
    getAccessToken()
      .catch(() => null)
      .then(() => { if (!cancelled) setAuthVerified(true); });
    return () => { cancelled = true; };
  }, [authenticated, getAccessToken]);

  // Handle unauthorized API responses → logout
  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("oria:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("oria:unauthorized", handleUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ready, authenticated, authVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
            retryDelay: 500,
          },
        },
      }),
  );

  // On iOS PWA (standalone mode), OAuth popups (Google/Apple) open Safari
  // and never return to the app. Detect standalone and restrict to email OTP
  // which runs entirely in-app with no redirect or popup needed.
  const [isIosPwa, setIsIosPwa] = useState(false);
  useEffect(() => {
    setIsIosPwa((window.navigator as Navigator & { standalone?: boolean }).standalone === true);
  }, []);

  // Dev-agent bypass: when localStorage.oria_dev_token is set, skip Privy and
  // use the dev token as the bearer. Controlled server-side by DEV_AGENT_TOKEN.
  const [devToken, setDevToken] = useState<string | null>(null);
  const [devTokenChecked, setDevTokenChecked] = useState(false);
  useEffect(() => {
    setDevToken(localStorage.getItem("oria_dev_token"));
    setDevTokenChecked(true);
  }, []);
  useEffect(() => {
    if (devToken) setAuthTokenGetter(async () => devToken);
  }, [devToken]);

  const inner = (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );

  if (devToken) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ ready: true, authenticated: true, authVerified: true }}>
          <ToastProvider>{children}</ToastProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  if (!usePrivyAuth) {
    return inner;
  }

  // Avoid mounting Privy until localStorage has been checked, so dev mode wins
  // when set. (Prevents a Privy login flash before we discover the dev token.)
  if (!devTokenChecked) return null;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID!}
      config={{
        loginMethods: isIosPwa ? ["email"] : ["email", "google", "apple"],
        appearance: {
          theme: "light",
          loginMessage: "Sign in to start saving",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          disableAllExternalWallets: true,
        },
      }}
    >
      <PrivyAuthContextBridge>
        {inner}
      </PrivyAuthContextBridge>
    </PrivyProvider>
  );
}

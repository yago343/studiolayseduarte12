import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, type AuthUser } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function sessionToUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email ?? "",
    name: u.user_metadata?.name ?? u.user_metadata?.full_name ?? "",
    phone: u.user_metadata?.phone ?? "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setIsLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  };

  return (
    <AuthContext.Provider
      value={{
        user: sessionToUser(session),
        session,
        isLoading,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

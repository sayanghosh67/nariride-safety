import type { Session, User as AuthUser } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { resetMatchCache } from "./match-bus";

export type AppMode = "passenger" | "driver";

export type Profile = {
  id: string;
  name: string;
  phone: string;
  homeLabel: string;
  workLabel: string;
  mode: AppMode;
};

type Ctx = {
  ready: boolean;
  session: Session | null;
  authUser: AuthUser | null;
  profile: Profile | null;
  mode: AppMode;
  signUp: (input: { name: string; email: string; phone: string; password: string; mode: AppMode }) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  setMode: (mode: AppMode) => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "id">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

type ProfileRow = {
  id: string;
  name: string;
  phone: string;
  home_label: string;
  work_label: string;
  active_mode: string;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    homeLabel: row.home_label,
    workLabel: row.work_label,
    mode: row.active_mode === "driver" ? "driver" : "passenger",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) {
      setProfile(toProfile(data as unknown as ProfileRow));
      return;
    }
    // Profile row is normally created by the signup trigger; create it if missing.
    const { data: created } = await supabase
      .from("profiles")
      .insert({ id: userId })
      .select("*")
      .maybeSingle();
    if (created) setProfile(toProfile(created as unknown as ProfileRow));
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      const id = next?.user?.id ?? null;
      if (id !== userIdRef.current) {
        userIdRef.current = id;
        resetMatchCache();
        if (id) void loadProfile(id);
        else setProfile(null);
      }
      setReady(true);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      const id = data.session?.user?.id ?? null;
      userIdRef.current = id;
      if (id) void loadProfile(id);
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<Ctx["signUp"]>(async (input) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name: input.name.trim(), phone: input.phone.trim() },
      },
    });
    if (error) return error.message;
    const id = data.user?.id;
    if (id && data.session) {
      await supabase
        .from("profiles")
        .upsert({ id, name: input.name.trim(), phone: input.phone.trim(), active_mode: input.mode });
      await loadProfile(id);
    }
    return null;
  }, [loadProfile]);

  const signIn = useCallback<Ctx["signIn"]>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? error.message : null;
  }, []);

  const signInWithGoogle = useCallback<Ctx["signInWithGoogle"]>(async () => {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = (await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    })) as { error?: unknown };
    if (result.error) return typeof result.error === "string" ? result.error : "Google sign-in failed.";
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    resetMatchCache();
  }, []);

  const updateProfile = useCallback<Ctx["updateProfile"]>(
    async (patch) => {
      const id = userIdRef.current;
      if (!id) return;
      setProfile((p) => (p ? { ...p, ...patch } : p));
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row["name"] = patch.name;
      if (patch.phone !== undefined) row["phone"] = patch.phone;
      if (patch.homeLabel !== undefined) row["home_label"] = patch.homeLabel;
      if (patch.workLabel !== undefined) row["work_label"] = patch.workLabel;
      if (patch.mode !== undefined) row["active_mode"] = patch.mode;
      if (Object.keys(row).length === 0) return;
      await supabase.from("profiles").update(row as never).eq("id", id);
    },
    [],
  );

  const setMode = useCallback<Ctx["setMode"]>(async (mode) => {
    await updateProfile({ mode });
  }, [updateProfile]);

  const refreshProfile = useCallback(async () => {
    const id = userIdRef.current;
    if (id) await loadProfile(id);
  }, [loadProfile]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      session,
      authUser: session?.user ?? null,
      profile,
      mode: profile?.mode ?? "passenger",
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      setMode,
      updateProfile,
      refreshProfile,
    }),
    [ready, session, profile, signUp, signIn, signInWithGoogle, signOut, setMode, updateProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

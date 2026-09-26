import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { forgetAllGrants } from "@/community/v1/accessMemo";

export type MemberStatus = "approved" | "pending" | "blocked" | "none";

export type CommunitySession = {
  loading: boolean;
  /** null = not signed in */
  session: Session | null;
  status: MemberStatus;
  displayName: string;
  /** true when the backend could not be reached at all (no internet / blocked) */
  offline: boolean;
  refresh: () => void;
};

type RememberedMember = {
  userId: string;
  status: MemberStatus;
  displayName: string;
};

const MEMBER_KEY = "achotikala.community.member";

const readRememberedMember = (): RememberedMember | null => {
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    return raw ? (JSON.parse(raw) as RememberedMember) : null;
  } catch {
    return null;
  }
};

const rememberMember = (member: RememberedMember | null) => {
  try {
    if (member) localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
    else localStorage.removeItem(MEMBER_KEY);
  } catch {
    /* Storage may be unavailable in private mode. */
  }
};

const CommunitySessionContext = createContext<CommunitySession | null>(null);

/**
 * One shared session + membership hook for BOTH entry points:
 * the regular site and the Offline (file://) build. Same auth, same backend.
 */
export function CommunitySessionProvider({ children }: { children: ReactNode }) {
  const remembered = useMemo(readRememberedMember, []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MemberStatus>(remembered?.status ?? "none");
  const [displayName, setDisplayName] = useState(remembered?.displayName ?? "");
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setSessionReady(true);
      if (event === "SIGNED_OUT") {
        rememberMember(null);
        forgetAllGrants();
        setStatus("none");
        setDisplayName("");
        setOffline(false);
        setLoading(false);
        return;
      }
      if (s?.user.id && s.user.id !== remembered?.userId) {
        rememberMember(null);
        forgetAllGrants();
        setStatus("none");
        setDisplayName("");
        setTick((t) => t + 1);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
      if (!data.session) {
        setLoading(false);
        return;
      }
      if (data.session.user.id === remembered?.userId && remembered.status === "approved") {
        setLoading(false);
        return;
      }
      setTick((t) => t + 1);
    });
    return () => sub.subscription.unsubscribe();
  }, [remembered]);

  useEffect(() => {
    let alive = true;
    if (!sessionReady) return;
    if (!session?.user) {
      setStatus("none");
      setDisplayName("");
      setLoading(false);
      return;
    }
    const hasRememberedApproval = remembered?.userId === session.user.id && remembered.status === "approved";
    if (!hasRememberedApproval) setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("forum_members")
          .select("display_name, status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!alive) return;
        if (error) throw error;
        setOffline(false);
        setStatus((data?.status as MemberStatus) ?? "none");
        // an email address is never shown as a name
        setDisplayName(data?.display_name ?? "");
        rememberMember({
          userId: session.user.id,
          status: (data?.status as MemberStatus) ?? "none",
          displayName: data?.display_name ?? "",
        });

      } catch {
        if (!alive) return;
        setOffline(true);
        if (!hasRememberedApproval) setStatus("none");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session?.user.id, sessionReady, tick, remembered]);

  const value = {
    loading,
    session,
    status,
    displayName,
    offline,
    refresh: () => setTick((t) => t + 1),
  };

  return <CommunitySessionContext.Provider value={value}>{children}</CommunitySessionContext.Provider>;
}

export function useCommunitySession(): CommunitySession {
  const value = useContext(CommunitySessionContext);
  if (!value) throw new Error("useCommunitySession must be used inside CommunitySessionProvider");
  return value;
}

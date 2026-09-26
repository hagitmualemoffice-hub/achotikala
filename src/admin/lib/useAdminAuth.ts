import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminAuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
};

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    session: null,
    user: null,
    isAdmin: false,
  });

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (session: Session | null) => {
      if (!session?.user) {
        if (mounted) setState({ loading: false, session: null, user: null, isAdmin: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (mounted) {
        setState({
          loading: false,
          session,
          user: session.user,
          isAdmin: !!data,
        });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // defer async work
      setTimeout(() => checkAdmin(session), 0);
    });

    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session));

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

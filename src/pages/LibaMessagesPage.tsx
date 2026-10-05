import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LibaHeaderActions from "@/community/v1/LibaHeaderActions";
import LibaTopBar from "@/community/v1/LibaTopBar";
import { MessagesInbox } from "@/community/v1/LibaMessages";
import { bootstrap, type Bootstrap } from "@/community/v1/api";

const LibaMessagesPage = () => {
  const [params] = useSearchParams();
  const [boot, setBoot] = useState<Bootstrap | null>(null);

  useEffect(() => {
    bootstrap().then(setBoot).catch(() => undefined);
  }, []);

  const me = {
    displayName: boot?.profile?.display_name ?? "חברה",
    avatarUrl: boot?.profile?.avatar_url ?? null,
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background lg:pl-[250px]">
      <LibaTopBar
        active="messages"
        actions={
          <LibaHeaderActions
            me={me}
            isAdmin={!!boot?.is_admin}
            onSignOut={() => supabase.auth.signOut()}
          />
        }
      />
      <main className="mx-auto w-full max-w-[1200px] px-0 py-0 md:px-5 md:py-5">
        <MessagesInbox initialThreadId={params.get("thread")} />
      </main>
    </div>
  );
};

export default LibaMessagesPage;
import { supabase } from "@/integrations/supabase/client";

export interface SubscribeLeadInput {
  email: string;
  name?: string | null;
  source: string;
}

/**
 * Saves a mailing-list signup.
 * Goes through the `subscribe-lead` backend function, which stores the lead and
 * pushes the contact to Google Contacts (label "אחותי כלה 2").
 * Falls back to a direct insert so a signup is never lost.
 */
export async function subscribeLead({ email, name, source }: SubscribeLeadInput) {
  try {
    const { error } = await supabase.functions.invoke("subscribe-lead", {
      body: { email, name: name ?? null, source },
    });
    if (!error) return { error: null };
    console.error("subscribe-lead failed, falling back to direct insert:", error);
  } catch (e) {
    console.error("subscribe-lead threw, falling back to direct insert:", e);
  }

  const { error } = await supabase
    .from("leads")
    .insert({ email, name: name ?? null, source });
  return { error };
}

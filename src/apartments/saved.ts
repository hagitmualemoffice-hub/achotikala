/**
 * שמירת מודעות דירות — "שמורים" באזור האישי.
 * הטבלה מוגנת ב-RLS: כל אחת רואה ומנהלת רק את השמורות שלה.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "./types";

export type SavedListing = Listing & { saved_at: string };

/** מזהי המודעות ששמרה המשתמשת המחוברת */
export const fetchSavedListingIds = async (): Promise<Set<string>> => {
  const { data, error } = await supabase.from("apartment_saved").select("listing_id");
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.listing_id as string));
};

/** מוסיף/מסיר שמירה, ומחזיר את המצב החדש */
export const toggleSavedListing = async (listingId: string, saved: boolean): Promise<boolean> => {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return saved;
  if (saved) {
    await supabase.from("apartment_saved").delete().eq("listing_id", listingId).eq("user_id", uid);
    return false;
  }
  await supabase.from("apartment_saved").insert({ listing_id: listingId, user_id: uid });
  return true;
};

/** המודעות השמורות עצמן, החדשות קודם */
export const fetchSavedListings = async (): Promise<SavedListing[]> => {
  const { data, error } = await supabase
    .from("apartment_saved")
    .select("created_at, listing:apartment_listings(*)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? [])
    .filter((r) => r.listing)
    .map((r) => ({ ...(r.listing as unknown as Listing), saved_at: r.created_at as string }));
};

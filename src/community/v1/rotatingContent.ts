import { supabase } from "@/integrations/supabase/client";
import type { ApiPost } from "./api";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export type RotatingKind = "quiz" | "announcement";
export type RotatingStatus = "draft" | "published" | "archived";

export type RotatingContent = {
  id: string;
  kind: RotatingKind;
  tab_label: string;
  title: string;
  body: string;
  cover_image: string | null;
  status?: RotatingStatus;
  starts_at: string | null;
  ends_at: string | null;
  post_id: string | null;
  post?: ApiPost | null;
  config: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export const fetchActiveRotatingContent = () =>
  rpc<RotatingContent[]>("community_active_rotating_content");

export const fetchRotatingAdmin = () =>
  rpc<RotatingContent[]>("community_rotating_admin_list");

export const saveRotatingContent = (item: {
  id?: string | null;
  kind: RotatingKind;
  tabLabel: string;
  title: string;
  body: string;
  coverImage?: string | null;
  status: RotatingStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  config?: Record<string, unknown>;
}) =>
  rpc<string>("community_rotating_admin_upsert", {
    _id: item.id ?? null,
    _kind: item.kind,
    _tab_label: item.tabLabel,
    _title: item.title,
    _body: item.body,
    _cover_image: item.coverImage ?? null,
    _status: item.status,
    _starts_at: item.startsAt ?? null,
    _ends_at: item.endsAt ?? null,
    _config: item.config ?? {},
  });

export const archiveRotatingContent = (id: string) =>
  rpc<void>("community_rotating_admin_archive", { _id: id });

export const duplicateRotatingContent = (id: string) =>
  rpc<string>("community_rotating_admin_duplicate", { _id: id });
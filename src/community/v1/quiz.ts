/**
 * "מה חדש בליבה?" — a temporary game with a giveaway.
 *
 * The server is the only source of truth for who solved the riddle and who
 * completed the task by sending the secret sign in the chat.
 */
import { supabase } from "@/integrations/supabase/client";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export type QuizNote = {
  id: string;
  name: string | null;
  body: string;
  at: string;
};

export type QuizState = {
  authorized: boolean;
  attempts: number;
  solved: boolean;
  solved_at: string | null;
  note: string | null;
  note_anonymous: boolean;
  flamingo: boolean;
  flamingo_at: string | null;
  /** she asked for the answer with 🐣 in the private chat */
  hint: boolean;
  /** answered wrong and hasn't asked for the answer yet */
  locked: boolean;
  winner: boolean;
  host_id: string;
  notes: QuizNote[];
  can_moderate: boolean;
  /** only returned by an answer call */
  correct?: boolean;
};

export const fetchQuizState = (campaignId: string) =>
  rpc<QuizState>("community_rotating_quiz_state", { _campaign_id: campaignId });

export const answerQuiz = (campaignId: string, choice: string) =>
  rpc<QuizState>("community_rotating_quiz_answer", { _campaign_id: campaignId, _choice: choice });

export const saveQuizNote = (campaignId: string, body: string, anonymous: boolean) =>
  rpc<QuizState>("community_rotating_quiz_note", { _campaign_id: campaignId, _body: body, _anonymous: anonymous });

/* --------------------------------- admin ---------------------------------- */

export type QuizAdminRow = {
  user_id: string;
  name: string;
  attempts: number;
  solved_at: string | null;
  flamingo_at: string | null;
  note: string | null;
  winner_rank: number | null;
};

export type QuizAdminData = {
  started: number;
  solved: number;
  completed: number;
  rows: QuizAdminRow[];
};

export const fetchQuizAdmin = (campaignId?: string | null) =>
  campaignId
    ? rpc<QuizAdminData>("community_rotating_quiz_admin_list", { _campaign_id: campaignId })
    : rpc<QuizAdminData>("community_quiz_admin_list");

export const drawQuizWinners = (campaignId?: string | null) =>
  campaignId
    ? rpc<QuizAdminData>("community_rotating_quiz_draw", { _campaign_id: campaignId })
    : rpc<QuizAdminData>("community_quiz_draw");

import { useIdentityExperiment } from "./identityExperiment";

export default function IdentityPostingNotice({ comment = false }: { comment?: boolean }) {
  const { state, ready, allowNickname } = useIdentityExperiment();
  if (allowNickname) return null;
  return <p className="my-2 text-sm leading-relaxed text-primary" role="status">
    {!ready ? "בודקות את הגדרות הפרסום…" : <>
      {comment ? "התגובה תפורסם בשם המלא שלך" : "הפוסט יפורסם בשם המלא שלך"}
      {state?.full_name && <span className="block font-medium text-foreground">{state.full_name}</span>}
      {!state?.has_full_name && <span className="block text-destructive">יש להשלים שם פרטי ושם משפחה בהגדרות החשבון לפני הפרסום.</span>}
    </>}
  </p>;
}
import { useIdentityExperiment } from "./identityExperiment";
import { Button } from "@/components/ui/button";

export default function IdentityPostingNotice({ comment = false, previousNickname = false, onUseName }: { comment?: boolean; previousNickname?: boolean; onUseName?: () => void }) {
  const { state, ready, allowNickname } = useIdentityExperiment();
  if (allowNickname) return null;
  return <div className="my-2 text-sm leading-relaxed text-primary" role="status">
    {!ready ? "בודקות את הגדרות הפרסום…" : <>
      {comment ? "התגובה תפורסם בשם המלא שלך" : "הפוסט יפורסם בשם המלא שלך"}
      {state?.full_name && <span className="block font-medium text-foreground">{state.full_name}</span>}
      {!state?.has_full_name && <span className="block text-destructive">יש להשלים שם פרטי ושם משפחה בהגדרות החשבון לפני הפרסום.</span>}
      {previousNickname && <><span className="block text-foreground">קודם בחרת לפרסם בניק. הטיוטה לא תפורסם עד שתאשרי כתיבה בשמך.</span><Button variant="outline" className="mt-2" onClick={onUseName}>אני מאשרת פרסום בשם המלא</Button></>}
    </>}
  </div>;
}
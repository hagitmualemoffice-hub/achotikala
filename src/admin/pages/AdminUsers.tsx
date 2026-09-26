import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Users } from "lucide-react";

type Member = {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  created_at: string;
  accepted_agreement_at: string | null;
  accepted_advertising_at: string | null;
};

export default function AdminUsers() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cName, setCName] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const loadMembers = useCallback(async () => {
    const [{ data: membersData, error: membersError }, { data: profilesData }] = await Promise.all([
      supabase.from("forum_members").select("*").order("created_at", { ascending: false }),
      supabase.from("community_profiles").select("user_id, accepted_agreement_at, accepted_advertising_at"),
    ]);
    if (membersError) return;
    const profileMap = new Map(
      (profilesData ?? []).map((p) => [
        p.user_id,
        { accepted_agreement_at: p.accepted_agreement_at, accepted_advertising_at: p.accepted_advertising_at },
      ]),
    );
    setMembers(
      (membersData ?? []).map((m) => ({
        ...m,
        accepted_agreement_at: profileMap.get(m.user_id)?.accepted_agreement_at ?? null,
        accepted_advertising_at: profileMap.get(m.user_id)?.accepted_advertising_at ?? null,
      })) as Member[],
    );
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, makeAdmin: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("המשתמשת נוצרה בהצלחה וקיבלה הרשאת ניהול");
      setEmail("");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירת המשתמשת נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const createMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: cEmail,
          password: cPassword,
          makeAdmin: false,
          forumMember: true,
          displayName: cName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("החשבון נוצר ואושר לקהילה");
      setCEmail("");
      setCPassword("");
      setCName("");
      void loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירת החשבון נכשלה");
    } finally {
      setCLoading(false);
    }
  };

  const setStatus = async (m: Member, status: string) => {
    const { error } = await supabase.from("forum_members").update({ status }).eq("id", m.id);
    if (error) {
      toast.error("עדכון ההרשאה נכשל");
      return;
    }
    void loadMembers();
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-medium">מנהלות ומשתמשות</h1>
        <p className="text-muted-foreground text-sm mt-1">
          יצירת חשבונות ואישור כניסה לאזור "הקהילה". אין אפשרות להירשם מבחוץ.
        </p>
      </div>

      <form onSubmit={createUser} className="bg-background rounded-xl border p-5 space-y-4">
        <h2 className="font-medium">חשבון ניהול חדש</h2>
        <div className="space-y-1.5">
          <Label htmlFor="new-email">אימייל</Label>
          <Input
            id="new-email"
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">סיסמה ראשונית</Label>
          <Input
            id="new-password"
            type="text"
            required
            minLength={8}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            לפחות 8 תווים. אפשר להעביר את הסיסמה למנהלת החדשה והיא תוכל לשנות אותה דרך "שכחתי
            סיסמה".
          </p>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <UserPlus className="h-4 w-4 me-2" />
          )}
          יצירת חשבון ניהול
        </Button>
      </form>

      <form onSubmit={createMember} className="bg-background rounded-xl border p-5 space-y-4">
        <h2 className="font-medium">חשבון לחברת קהילה</h2>
        <div className="space-y-1.5">
          <Label htmlFor="c-name">שם תצוגה בקהילה</Label>
          <Input id="c-name" required value={cName} onChange={(e) => setCName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">אימייל</Label>
          <Input
            id="c-email"
            type="email"
            required
            dir="ltr"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-password">סיסמה ראשונית</Label>
          <Input
            id="c-password"
            type="text"
            required
            minLength={8}
            dir="ltr"
            value={cPassword}
            onChange={(e) => setCPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={cLoading}>
          {cLoading ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Users className="h-4 w-4 me-2" />
          )}
          יצירת חשבון קהילה
        </Button>
      </form>

      <div className="bg-background rounded-xl border p-5 space-y-3">
        <h2 className="font-medium">חברות הקהילה ({members.length})</h2>
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">עוד לא נוספו חברות קהילה.</p>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between border-b last:border-0 pb-3 last:pb-0 gap-3"
          >
            <div>
              <div className="text-sm font-medium">{m.display_name}</div>
              <div className="text-xs text-muted-foreground">
                {m.status === "approved" ? "מאושרת" : m.status === "blocked" ? "חסומה" : "ממתינה"}
                {m.status === "approved" && (
                  <span className="me-2">
                    {" · "}
                    {m.accepted_agreement_at && m.accepted_advertising_at
                      ? "אישרה הסכם כניסה"
                      : m.accepted_agreement_at
                        ? "אישרה הסכם, ממתינה לאישור פרסום"
                        : m.accepted_advertising_at
                          ? "אישרה פרסום, ממתינה להסכם"
                          : "טרם אישרה הסכם כניסה"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {m.status !== "approved" && (
                <Button size="sm" variant="secondary" onClick={() => setStatus(m, "approved")}>
                  אישור
                </Button>
              )}
              {m.status !== "blocked" && (
                <Button size="sm" variant="outline" onClick={() => setStatus(m, "blocked")}>
                  חסימה
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

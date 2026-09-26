import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Layers,
  Mic,
  Image as ImageIcon,
  LogOut,
  Loader2,
  Eye,
  Users,
  Mail,
  Activity,
  HandHeart,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/admin/lib/useAdminAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "לוח בקרה", icon: LayoutDashboard, end: true },
  { to: "/admin/blog", label: "בלוג", icon: FileText },
  { to: "/admin/events", label: "אירועים", icon: Calendar },
  { to: "/admin/events/templates", label: "תבניות אירועים", icon: Layers },
  { to: "/admin/podcast", label: "פודקאסט", icon: Mic },
  { to: "/admin/media", label: "ספריית מדיה", icon: ImageIcon },
  { to: "/admin/pulse", label: "בדיקת דופק", icon: Activity },
  { to: "/admin/rotating-content", label: "תוכן מתחלף בליבה", icon: Megaphone },
  { to: "/admin/quiz", label: "הגרלת מה חדש בליבה", icon: Sparkles },
  { to: "/admin/inquiries", label: "בירורים", icon: HandHeart },
  { to: "/admin/leads", label: "נרשמות לתפוצה", icon: Mail },
  { to: "/admin/users", label: "מנהלות המערכת", icon: Users },
];

export default function AdminLayout() {
  const { loading, session, isAdmin, user } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
        dir="rtl"
      >
        <h1 className="text-xl font-medium">אין לך הרשאת גישה למערכת הניהול</h1>
        <p className="text-sm text-muted-foreground">
          אם הגעת לכאן בטעות, יש לפנות למנהלת הראשית.
        </p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          התנתקי
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-row-reverse" dir="rtl">
      <aside className="w-64 shrink-0 border-l bg-background flex flex-col">
        <div className="p-5 border-b">
          <div className="text-lg font-medium">אחותי כלה</div>
          <div className="text-xs text-muted-foreground mt-0.5">ניהול תוכן</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted",
                )
              }
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <a
            href="/?preview=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/15 transition-colors font-medium"
          >
            <Eye className="h-4 w-4" />
            <span>תצוגה מקדימה של האתר</span>
          </a>
          <div className="text-xs text-muted-foreground px-2 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4 me-2" />
            התנתקות
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">ממשק ניהול</div>
          <a
            href="/?preview=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            <Eye className="h-4 w-4" />
            <span>תצוגה מקדימה לפני פרסום</span>
          </a>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

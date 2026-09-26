import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, Mic, Image as ImageIcon } from "lucide-react";
import OfflineSyncCard from "@/admin/components/OfflineSyncCard";
import ApartmentAccessCard from "@/admin/components/ApartmentAccessCard";
import AccessRequestsCard from "@/admin/components/AccessRequestsCard";
import BaarDeletionRequestsCard from "@/admin/components/BaarDeletionRequestsCard";
import AccessAttemptsCard from "@/admin/components/AccessAttemptsCard";
import ManualAccessCard from "@/admin/components/ManualAccessCard";

type Counts = { posts: number; events: number; episodes: number; media: number };

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts>({ posts: 0, events: 0, episodes: 0, media: 0 });

  useEffect(() => {
    (async () => {
      const [p, e, ep, m] = await Promise.all([
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("events_db").select("id", { count: "exact", head: true }),
        supabase.from("podcast_episodes").select("id", { count: "exact", head: true }),
        supabase.from("media_assets").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        posts: p.count ?? 0,
        events: e.count ?? 0,
        episodes: ep.count ?? 0,
        media: m.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { to: "/admin/blog", label: "פוסטים בבלוג", value: counts.posts, icon: FileText },
    { to: "/admin/events", label: "אירועים", value: counts.events, icon: Calendar },
    { to: "/admin/podcast", label: "פרקי פודקאסט", value: counts.episodes, icon: Mic },
    { to: "/admin/media", label: "פריטי מדיה", value: counts.media, icon: ImageIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">ברוכה הבאה</h1>
        <p className="text-muted-foreground text-sm mt-1">מכאן ניתן לנהל את כל תוכן האתר.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-background rounded-xl border p-5 hover:border-primary/40 transition-colors"
          >
            <c.icon className="h-5 w-5 text-primary mb-3" />
            <div className="text-2xl font-medium">{c.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
          </Link>
        ))}
      </div>
      <OfflineSyncCard />
      <ApartmentAccessCard />
      <ManualAccessCard />
      <AccessRequestsCard />
      <BaarDeletionRequestsCard />
      <AccessAttemptsCard />
    </div>
  );
}

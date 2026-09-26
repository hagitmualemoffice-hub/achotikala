import { CalendarDays } from "lucide-react";
import PostCard from "./PostCard";
import type { RotatingContent } from "./rotatingContent";

type Me = {
  displayName: string;
  initials: string;
  nickname: string | null;
  avatarUrl?: string | null;
  avatarInNicknameMode?: boolean;
};

export default function RotatingAnnouncement({
  item,
  me,
  onChanged,
}: {
  item: RotatingContent;
  me: Me;
  onChanged: () => void;
}) {
  if (!item.post) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
      {item.cover_image && (
        <img
          src={item.cover_image}
          alt={item.title}
          className="max-h-[34rem] w-full bg-muted/20 object-contain"
        />
      )}
      <div className="border-b border-border/60 bg-primary/[0.04] px-5 py-4 md:px-8">
        <p className="flex items-center gap-2 text-[12px] text-primary">
          <CalendarDays className="h-4 w-4" /> פרסום מיוחד בליבה
        </p>
      </div>
      <div className="px-4 pb-3 md:px-7">
        <PostCard
          post={item.post}
          me={me}
          onRecommend={() => undefined}
          onChanged={onChanged}
          defaultOpen
          featured
        />
      </div>
    </div>
  );
}
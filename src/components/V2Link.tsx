import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const V2Link = () => (
  <Link
    to="/v2"
    className="hidden md:inline-flex fixed top-4 left-4 z-50 items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs tracking-wide shadow-md shadow-primary/30 hover:bg-[hsl(var(--primary-glow))] transition-all duration-300"
    aria-label="מעבר לוורסיה החדשה"
  >
    <Sparkles className="w-3.5 h-3.5" />
    וורסיה חדשה
  </Link>
);

export default V2Link;

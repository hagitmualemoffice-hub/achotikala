import { useState, type ReactNode } from "react";
import { Grid2X2, Info, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import ResponsiveDialog from "@/components/ResponsiveDialog";

export function DirectoryHeading({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="text-2xl font-light leading-tight text-foreground md:text-[34px]">{title}</h1>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground" onClick={() => setOpen(true)} aria-label={`מידע על ${title}`} title={`מידע על ${title}`}><Info /></Button>
      </div>
      {actions}
    </div>
    <ResponsiveDialog open={open} onOpenChange={setOpen} desktopContentClassName="max-w-lg">
      <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
        <h2 className="border-b border-border px-6 py-5 text-xl font-medium">{title}</h2>
        <div className="popup-scroll space-y-4 px-6 py-5 text-sm font-light leading-7 text-foreground">{children}</div>
        <div className="popup-footer p-4"><Button variant="outline" className="w-full" onClick={() => setOpen(false)}>סגירה</Button></div>
      </div>
    </ResponsiveDialog>
  </>;
}

export function DirectoryAdd({ onClick, label }: { onClick: () => void; label: string }) {
  return <Button size="icon" onClick={onClick} aria-label={label} title={label} className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-40 h-12 w-12 shrink-0 rounded-full shadow-lg md:static md:h-10 md:w-10 md:shadow-none"><Plus className="h-5 w-5" /></Button>;
}

export function DirectoryView({ value, onChange }: { value: "cards" | "list"; onChange: (value: "cards" | "list") => void }) {
  return <div className="ms-auto flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5" role="group" aria-label="תצוגה">
    {([{ id: "cards", label: "כרטיסים", Icon: Grid2X2 }, { id: "list", label: "רשימה", Icon: List }] as const).map(({ id, label, Icon }) => <Button key={id} variant="ghost" size="icon" onClick={() => onChange(id)} aria-label={label} title={label} aria-pressed={value === id} className={`h-7 w-7 rounded-full ${value === id ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}><Icon className="h-3.5 w-3.5" /></Button>)}
  </div>;
}

export function DirectoryFilter({ label, value, options, onChange, inDrawer = false }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void; inDrawer?: boolean }) {
  const selected = options.find((option) => option.value === value);
  return <Select value={value} onValueChange={onChange} dir="rtl">
    <SelectTrigger aria-label={label} className={`${inDrawer ? "flex" : "hidden md:flex"} h-9 w-auto max-w-full shrink-0 gap-2 rounded-full border-border bg-card px-3 text-[13px] font-light`}><span className="truncate">{label}: {selected?.label ?? "הכול"}</span></SelectTrigger>
    <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
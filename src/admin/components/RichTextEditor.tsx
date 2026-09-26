import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
  Undo,
  Redo,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  onInsertImage?: () => void;
}

function Toolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage?: () => void }) {
  const btn = (active: boolean) =>
    `h-8 w-8 p-0 ${active ? "bg-primary/10 text-primary" : ""}`;

  const addLink = () => {
    const url = window.prompt("קישור (URL):");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };
  const addYoutube = () => {
    const url = window.prompt("YouTube URL:");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b p-2 bg-muted/30">
      <Button type="button" variant="ghost" className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" className={btn(false)} onClick={addLink}>
        <LinkIcon className="h-4 w-4" />
      </Button>
      {onInsertImage && (
        <Button type="button" variant="ghost" className={btn(false)} onClick={onInsertImage}>
          <ImageIcon className="h-4 w-4" />
        </Button>
      )}
      <Button type="button" variant="ghost" className={btn(false)} onClick={addYoutube}>
        <YoutubeIcon className="h-4 w-4" />
      </Button>
      <div className="mr-auto flex gap-1">
        <Button type="button" variant="ghost" className={btn(false)}
          onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={btn(false)}
          onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, onInsertImage }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "התחילי לכתוב..." }),
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none rtl:prose-headings:text-right",
        dir: "rtl",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === "" ? "" : null]);

  if (!editor) return <div className="border rounded-md h-64 bg-muted/20" />;

  return (
    <div className="border rounded-md bg-background overflow-hidden">
      <Toolbar editor={editor} onInsertImage={onInsertImage} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function insertImageIntoEditor(editor: Editor | null, url: string, alt = "") {
  if (!editor) return;
  editor.chain().focus().setImage({ src: url, alt }).run();
}

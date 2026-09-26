import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type Provider = "gemini" | "openai";

const ApiTester = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState<Provider | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Provider | null>(null);

  const generate = async (provider: Provider) => {
    if (!prompt.trim()) {
      toast({ title: "נדרש prompt", description: "כתוב תיאור לפני שליחה.", variant: "destructive" });
      return;
    }
    setLoading(provider);
    setError(null);
    setImageUrl(null);
    setText("");
    setSource(provider);

    const fnName = provider === "gemini" ? "generate-image-gemini" : "generate-image-openai";
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body: { prompt } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImageUrl(data?.imageUrl ?? null);
      setText(data?.text ?? "");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-background py-12 px-4" dir="ltr">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">API Tester</h1>
        <p className="text-muted-foreground mb-8">Generate images using Gemini (Nano-Banana) or OpenAI.</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => generate("gemini")} disabled={loading !== null}>
              {loading === "gemini" && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Image with Nano-Banana
            </Button>
            <Button onClick={() => generate("openai")} disabled={loading !== null} variant="secondary">
              {loading === "openai" && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate image with OpenAI
            </Button>
          </div>
        </div>

        <section className="mt-10">
          {loading && (
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating with {loading === "gemini" ? "Nano-Banana" : "OpenAI"}...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {imageUrl && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Source: {source === "gemini" ? "Nano-Banana (Gemini)" : "OpenAI"}
              </div>
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full rounded-lg border border-border shadow-sm"
              />
              {text && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ApiTester;

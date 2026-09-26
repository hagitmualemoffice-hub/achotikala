// Generate a cover image for blog/event/podcast content using Lovable AI.
// Injects a fixed site style guide so all generated images share the visual language.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Global brand look — applied to EVERY generated image so the site feels coherent.
// The site's visual language is soft WATERCOLOR / GOUACHE ILLUSTRATION, not photography.
const BRAND_LOOK = `
BRAND: "אחותי כלה" (Achoti Kallah) — a warm, feminine, Israeli-Haredi content platform for single religious women aged 28+.

MEDIUM (most important rule): a hand-painted WATERCOLOR / GOUACHE ILLUSTRATION on textured cotton paper.
- Visible paper grain, soft bleeding pigment edges, wet-on-wet blooms, gentle dry-brush strokes
- Loose, abstract, poetic, semi-figurative — shapes suggested rather than drawn precisely
- Soft white halos where the paper breathes; NO hard outlines, NO ink linework
- It must NOT look like a photograph, a 3D render, a digital vector, or AI-glossy art

PALETTE: see the CATEGORY PALETTE block below — use ONLY the colors listed there.
- Absolutely NO: bright red, purple, neon, black, harsh saturated colors, cold LED white


Universal aesthetic:
- Editorial, elegant, minimal, calm, hopeful, intimate, contemplative
- Generous negative space (at least 40% of the canvas nearly empty cream paper)
- Asymmetric, breathable composition; NEVER busy, NEVER cluttered, NEVER a full-bleed scene
- Feels like a page from a handmade Hebrew poetry chapbook

Recurring visual vocabulary (pull from these, mix & match — painted, never photographed):
- Abstract washes: a soft sunrise gradient, rolling light, a horizon line, gentle waves of pigment
- Peonies, garden roses, ranunculus, anemones, dried wildflowers, olive branches — loosely painted
- Suggested linen fabric, a curtain, an open journal, a candle flame, a simple ceramic mug
- Arched window shapes, soft light pooling on a floor, Jerusalem stone hinted as warm blocks of color
- Hands only if needed (no faces) — a few simple painted strokes, never detailed

ABSOLUTELY FORBIDDEN:
- Photographic realism of any kind, film grain look, camera bokeh, lens flare
- Any human face or identifiable person, any man, any child
- Immodest clothing, bare shoulders/legs/arms above elbow
- Explicit religious symbols as focal point (crosses, stars of david, menorahs)
- Text, letters, Hebrew script, numbers, logos, watermarks, signatures
- Stock-photo cliché, corporate imagery, cartoon, comic, anime, plastic AI-slick look
- Harsh contrast, cold blue/white LED light, saturated primary colors

Aspect ratio: landscape 16:9, suitable for a website cover.
`;

// Per-content-type sub-styles.
const SUBSTYLES: Record<string, string> = {
  poem: `
SUB-STYLE — POEM / שיר (יוצאות לאור):
- The most abstract and poetic of all. Almost pure color and light — barely any object.
- Very wet watercolor: broad soft washes, a single pigment bloom, a faint horizon or sunrise band.
- Optional single delicate motif: one pressed flower, one branch, one candle flame, a bird as two strokes.
- Extremely large empty area (top or one side) as if reserved for a stanza. Very still, very quiet.
`,
  personal: `
SUB-STYLE — PERSONAL POST / פוסט אישי (טור אישי):
- Intimate painted vignette from the writer's inner world. Warm, nostalgic, gently emotional.
- Loose gouache, slightly more object presence than a poem, still abstract and unfinished at the edges.
- Motifs: a painted mug of tea with a wisp of steam, an open journal on rumpled cloth, a chair in warm light,
  a window with a curtain lifting, one peony in a small vase, a soft path of light across a floor.
- Composition candid and imperfect, brushstrokes visible, edges fading into cream paper.
`,
  article: `
SUB-STYLE — ARTICLE / מאמר:
- Painted editorial still-life. A touch more structure and arrangement, still watercolor and airy.
- Motifs: a loose flat-lay of flowers and a book, a painted vignette on a warm surface, a metaphorical
  landscape at golden hour rendered as soft washes.
`,
  event: `
SUB-STYLE — EVENT / אירוע:
- Warmer, gently celebratory, atmospheric — still a painting.
- Motifs: a painted set table with candles and flowers, an empty chair in golden light,
  garden lights at dusk as soft glowing dots, stacked ceramic plates suggested with a few strokes.
`,
  podcast: `
SUB-STYLE — PODCAST:
- Contemplative listening mood. Deeper warm tones allowed (cream + terracotta washes).
- Motifs: a painted reading nook at dusk, headphones suggested over an open journal,
  a candle beside a mug, an armchair by a window in golden light.
`,
};

// CATEGORY PALETTES — each content category has its own color world, matching the site.
const PINK_PALETTE = `
CATEGORY PALETTE — PINK / ROSE (blog posts & articles, like the site's pink sections):
- Dominant: dusty rose pink (#E7B8C2, #D48A9B), warm coral peach (#F2B5A1), soft blush (#F7DDE0)
- Base: warm cream / off-white (#FBF6EF, #F4EADB), muted sand beige (#E8D9C4)
- Accents (sparingly): warm terracotta (#C97C63), matte gold (#C9A66B)
- NO teal, NO turquoise, NO blue, NO green as a visible color here.
`;

const TEAL_PALETTE = `
CATEGORY PALETTE — TURQUOISE / TEAL (poems of "יוצאות לאור", like the site's turquoise gradient):
- Dominant: soft turquoise (#A8E9E1, #7FD8CE), pale aqua mint (#CFF2ED), dusty teal (#5FB8AE) sparingly
- Base: warm cream / off-white (#FBF6EF, #F4EADB), soft ivory paper
- Accents (very small, never dominant): a whisper of dusty rose (#E7B8C2) as a single soft bloom, matte gold (#C9A66B)
- The overall impression must read as TURQUOISE / AQUA, calm and airy — NOT pink, NOT blue-navy, NOT green.
`;

const PALETTES: Record<string, string> = {
  poem: TEAL_PALETTE,
  personal: PINK_PALETTE,
  article: PINK_PALETTE,
  event: PINK_PALETTE,
  podcast: PINK_PALETTE,
};


function detectType(content: string, hint?: string): keyof typeof SUBSTYLES {
  if (hint && SUBSTYLES[hint]) return hint as keyof typeof SUBSTYLES;
  const trimmed = content.trim();
  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const avgLen = lines.reduce((a, l) => a + l.length, 0) / Math.max(lines.length, 1);
  // Poem heuristic: many short lines, whole piece short-ish
  if (lines.length >= 4 && avgLen < 60 && trimmed.length < 900) return "poem";
  // Personal heuristic: uses first person "אני" often
  const iCount = (trimmed.match(/\bאני\b|\bשלי\b|\bלי\b/g) || []).length;
  if (iCount >= 4 && trimmed.length < 2500) return "personal";
  return "article";
}

async function buildPrompt(content: string, apiKey: string, type: keyof typeof SUBSTYLES): Promise<string> {
  const substyle = SUBSTYLES[type];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You write short, vivid English prompts for hand-painted WATERCOLOR/GOUACHE cover illustrations on a warm feminine Israeli-Haredi website. Reply with ONLY the prompt, no preface, no quotes. Max 70 words. Always describe a painted composition (shapes, washes, brushwork, light, palette, empty space) — never a photograph, never people, faces, text or religious symbols. Stay strictly inside the brand palette and forbidden list you're given.",
        },
        {
          role: "user",
          content:
`BRAND LOOK (must obey):
${BRAND_LOOK}

CATEGORY PALETTE (must obey — this is the color world of this category):
${PALETTES[type] ?? PINK_PALETTE}

CONTENT TYPE: ${type}
${substyle}

CONTENT (Hebrew — read the emotional tone, do NOT translate literally):
${content.slice(0, 2000)}

Write ONE vivid English prompt for a hand-painted watercolor cover illustration that emotionally echoes this content while strictly obeying the brand look, the category palette and the sub-style above. Name the painted motif, the washes, the direction of light, the exact palette colors, and where the empty paper is. End with: "loose watercolor and gouache on textured cotton paper, soft bleeding edges, visible paper grain, ${type === "poem" ? "soft turquoise, aqua and cream palette" : "dusty rose, blush and cream palette"}, generous negative space, landscape 16:9, no text, no faces, not a photograph".`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`prompt build failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, customPrompt, contentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const type = detectType(typeof content === "string" ? content : "", contentType);

    let visualPrompt = customPrompt?.trim();
    if (!visualPrompt) {
      if (!content || typeof content !== "string") {
        return new Response(JSON.stringify({ error: "content or customPrompt required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      visualPrompt = await buildPrompt(content, LOVABLE_API_KEY, type);
    }

    const fullPrompt = `Hand-painted watercolor & gouache illustration (NOT a photograph): ${visualPrompt}

--- MANDATORY BRAND CONSTRAINTS (obey strictly) ---
${BRAND_LOOK}
${PALETTES[type] ?? PINK_PALETTE}
${SUBSTYLES[type]}
`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      return new Response(
        JSON.stringify({
          error:
            res.status === 429
              ? "חרגת ממגבלת השימוש, נסי שוב מאוחר יותר."
              : res.status === 402
                ? "נדרש להוסיף קרדיטים ל־Lovable AI."
                : `שגיאה ביצירת תמונה: ${errText}`,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: "לא התקבלה תמונה" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        imageBase64: b64,
        dataUrl: `data:image/png;base64,${b64}`,
        prompt: visualPrompt,
        detectedType: type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

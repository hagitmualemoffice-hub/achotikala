import { useEffect } from "react";
import { Sparkles, Heart, Users, Lightbulb, Home, HandHeart, Mic2, BookOpen, ArrowUpRight, Flower2, Moon, Waves, type LucideIcon } from "lucide-react";
import heroBg from "@/assets/hero-sisters.webp";

const GRADIENT =
  "linear-gradient(90deg, hsl(5 79% 74%) 0%, hsl(354 76% 74%) 25%, hsl(344 75% 72%) 50%, hsl(335 75% 70%) 75%, hsl(326 75% 69%) 100%)";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-10 md:mb-14 text-left">
    <div className="w-12 h-px bg-primary mb-6" />
    <h2 className="text-2xl md:text-4xl font-light tracking-tight text-foreground">{children}</h2>
  </div>
);

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="text-primary font-normal">{children}</span>
);

const PullQuote = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-xl md:text-2xl font-light text-primary leading-relaxed ${className}`}>{children}</p>
);

/* Subtle gradient-washed icon chip */
const SoftIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <div
    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
    style={{ background: GRADIENT, opacity: 0.9 }}
  >
    <Icon className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
  </div>
);

const Hadassah = () => {
  useEffect(() => {
    document.title = "Achoti Kalah – Five Years of Building What Was Missing";
  }, []);

  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground font-light overflow-x-hidden">
      {/* HERO – white text over image, like the homepage */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt="Women of the Achoti Kalah community"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/70" />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-[42px] py-24 text-center">
          <p
            className="tracking-[0.35em] text-sm md:text-base mb-6 uppercase font-normal bg-clip-text text-transparent inline-block"
            style={{ backgroundImage: GRADIENT }}
          >
            Achoti Kalah
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-light leading-tight text-white mb-5">
            Life Is Happening Now
          </h1>
          <p className="text-lg md:text-2xl text-white/85 font-light max-w-2xl mx-auto">
            A Community-Led Model for Women Experiencing Prolonged Singlehood
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-6 md:px-[42px]">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto">
          <SectionTitle>Why This Work Exists</SectionTitle>
          <div className="max-w-3xl space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed text-left">
            <p>
              For women experiencing prolonged singlehood, most existing attention focuses on one question: How can
              she find a partner?
            </p>
            <p>Achoti Kalah starts with a different question:</p>
            <p className="text-primary font-normal">
              How can she build a full life now, while the future remains uncertain?
            </p>
            <p>This shift changes the solution entirely.</p>
            <p>
              When prolonged singlehood is understood primarily as a relationship problem, the response naturally
              centers on matchmaking. But when it is understood as a distinct life stage, a much broader set of
              needs becomes visible: emotional resilience, belonging, body and womanhood, independence and mobility,
              financial security, fertility, professional development, creativity, and opportunities to lead and grow.
            </p>
            <p>
              For five years, Achoti Kalah has been building responses around those needs – not from a predefined
              service model, but by listening to women, identifying what is missing from their lives, and creating
              practical solutions with and around them.
            </p>
            <p>
              The innovation is not a single program. It is a different way of seeing the woman and the life she
              is living now.
            </p>
            <p>
              We support the hope for partnership. But her wellbeing, development, security, body, community, and
              future cannot be postponed until marriage.
            </p>
            <PullQuote className="pt-4">
              Prolonged singlehood should not become prolonged waiting.
            </PullQuote>
          </div>
        </div>
      </section>

      {/* AT A GLANCE – gradient strip like homepage */}
      <section className="w-full px-6 md:px-12">
        <div className="w-full md:w-[min(1200px,86%)] mx-auto">
          <div
            className="rounded-[28px] md:rounded-[36px] px-8 py-[4.5rem] md:px-16 md:py-[7.5rem] shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.3)]"
            style={{ background: GRADIENT }}
          >
            <h2 className="text-center text-white text-[1.75rem] md:text-5xl font-light leading-tight mb-10 md:mb-14">
              At a Glance
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
              {[
                { num: "893", label: "Women aged 28+ connected to the community" },
                { num: "5", label: "Years of continuous grassroots community-building" },
                { num: "2–3", label: "Activities every week at our current level of programming" },
                { num: "14", label: "Women currently creating and leading activities through Meholelot Kehila" },
              ].map((item) => (
                <div key={item.label} className="text-center text-white">
                  <div className="text-4xl md:text-6xl font-light leading-none mb-3 md:mb-4">{item.num}</div>
                  <div className="text-sm md:text-base font-light text-white/95">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MANY WAYS IN */}
      <section className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-6 md:px-[42px]">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto">
          <SectionTitle>Many Ways In. One Community to Discover.</SectionTitle>
          <div className="max-w-3xl space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed mb-14 text-left">
            <p>
              Joining a community for women experiencing prolonged singlehood can itself be a difficult first step.
              For some women, it means confronting a life stage they did not expect to be in, or entering a space
              associated with a status they may not yet feel ready to identify with.
            </p>
            <p>That is why Achoti Kalah intentionally creates many different points of entry.</p>
            <p>
              A woman might come for a DJ party or a board-game night. Another for a professional lecture. Others
              for art, writing, dance, movement, improvisation, yoga, meditation, or content around finances,
              relationships, health, or personal development.
            </p>
            <p className="text-foreground">
              The diversity is intentional: <Highlight>different women need different doors into community.</Highlight>
            </p>
            <p className="text-primary">
              A woman may come because one particular event interests her – and discover through it an entire
              world of connection, belonging, and community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-7">
            {[
              {
                size: "~15",
                title: "Intimate gatherings",
                text: "Intentionally small, allowing conversation, familiarity, and genuine relationships to form.",
              },
              {
                size: "~50",
                title: "Lectures & professional workshops",
                text: "Knowledge, professionals, and conversations around issues relevant to women's lives.",
              },
              {
                size: "~80",
                title: "Festivals & larger community events",
                text: "Culture, content, creativity, and the experience of belonging to something larger.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="bg-card rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(0_0%_0%_/_0.12)] border border-primary/5 px-6 py-8 hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.28)] hover:-translate-y-1.5 transition-all duration-500"
              >
                <span className="text-3xl md:text-4xl font-light text-primary block mb-3">{c.size}</span>
                <h3 className="text-base md:text-lg mb-2 text-foreground">{c.title}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Figures represent typical approximate event sizes.
          </p>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-6 md:px-[42px] bg-card/40">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto">
          <SectionTitle>An Ecosystem Built Around Real Life</SectionTitle>
          <div className="max-w-3xl space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed mb-16 text-left">
            <p>The needs of women experiencing prolonged singlehood do not begin and end with finding a partner.</p>
            <p>
              Over time, Achoti Kalah has developed very different responses to needs emerging directly from women's
              lives.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-7 mb-12">
            {[
              {
                icon: Heart,
                title: "Emotional Resilience & Mental Wellbeing",
                text: "Gently facilitated conversations and spaces for emotional, spiritual, and existential questions – places where women can speak openly, receive validation, and draw strength from one another.",
                highlight: "We do not ask women to give up hope for a different future. We help them build the emotional resources to live fully in the present while the future remains uncertain.",
              },
              {
                icon: Users,
                title: "Belonging & Community",
                text: "Ba'ot Shabbat, Meholelot Kehila, gatherings and festivals – social spaces where marital status does not make a woman the exception in the room.",
              },
              {
                icon: Lightbulb,
                title: "Independence & Financial Future",
                text: "Achot LaDerech, Achoti Kalah Finance, and Ravaka Atzma'it – supporting mobility, financial planning, and self-employed women with peer support.",
              },
              {
                icon: Home,
                title: "Fertility & Practical Support",
                text: "A shared medication refrigerator and rides for egg retrieval, in partnership with Yedidim – practical support around fertility treatment.",
              },
              {
                icon: HandHeart,
                title: "Relationships & Mutual Aid",
                text: "Berurim Group – women sharing knowledge and helping one another navigate inquiries within the matchmaking process.",
              },
              {
                icon: Mic2,
                title: "Voice & Creativity",
                text: "Yotzot La'Or – a writing group creating space for women's voices, creativity, reflection, and experiences that often remain invisible.",
              },
            ].map(({ icon: Icon, title, text, highlight }) => (
              <div
                key={title}
                className="bg-background rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(0_0%_0%_/_0.12)] border border-primary/5 px-6 md:px-8 py-8 md:py-10 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <SoftIcon icon={Icon} />
                  <h3 className="text-lg md:text-xl font-normal text-foreground">{title}</h3>
                </div>
                <p className="text-base text-foreground/75 leading-relaxed flex-1">{text}</p>
                {highlight && <p className="text-primary text-sm md:text-base mt-4 leading-relaxed">{highlight}</p>}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary/90 to-[hsl(var(--primary-glow))] rounded-[28px] md:rounded-[36px] px-8 py-10 md:px-16 md:py-14 text-center text-primary-foreground shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.3)]">
            <p className="text-lg md:text-2xl font-light leading-relaxed">
              When a recurring need emerges, we ask: What could make this part of a woman's life easier, stronger, or
              less lonely – and can we build a response to it?
            </p>
          </div>
        </div>
      </section>

      {/* BODY & WOMANHOOD – soft, feminine redesign */}
      <section className="relative w-full pt-[4.5rem] pb-[4rem] md:pt-[7.5rem] md:pb-[6.5rem] px-6 md:px-[42px] overflow-hidden bg-accent/30">
        {/* delicate decorative gradient orbs */}
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: GRADIENT }}
        />
        <div
          className="absolute -bottom-40 -right-32 w-[460px] h-[460px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: GRADIENT }}
        />

        <div className="relative w-full md:w-[min(1100px,80%)] mx-auto">
          <div className="text-left mb-12 md:mb-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-px bg-primary" />
              <Flower2 className="w-5 h-5 text-primary/70" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl md:text-4xl font-light tracking-tight text-foreground mb-6">
              The Body and Womanhood Are Not on Hold
            </h2>
            <div className="space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed">
              <p>
                Within Haredi society, much of the conversation around women's bodies and sexuality naturally takes
                place in the context of marriage and family formation.
              </p>
              <p>
                For a woman who remains single for years beyond the age at which she expected to marry, this can
                sometimes create a sense that parts of her body and womanhood are also waiting.
              </p>
            </div>
          </div>

          {/* centerpiece quote */}
          <div className="relative max-w-2xl mx-auto mb-12 md:mb-16">
            <div
              className="rounded-[28px] md:rounded-[36px] px-8 py-12 md:px-14 md:py-14 text-center text-white shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.35)]"
              style={{ background: GRADIENT }}
            >
              <Moon className="w-6 h-6 mx-auto mb-5 opacity-80" strokeWidth={1.5} />
              <p className="text-xl md:text-3xl font-light leading-relaxed">
                A woman should not have to wait for marriage to know her body, care for it, and feel connected to her
                womanhood.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-7">
            {[
              {
                icon: Heart,
                title: "Professional conversation",
                text: "The community creates professional conversations around women's health, menstrual health and cycles, sexuality during singlehood, and body awareness, with physicians, sexologists, and other professionals.",
              },
              {
                icon: Waves,
                title: "Positive embodied experience",
                text: "Alongside knowledge, women encounter the body through movement, dance, yoga, improvisation, meditation, self-reflexology, and other forms of positive embodied experience.",
              },
              {
                icon: Flower2,
                title: "Language matters",
                text: "Achoti Kalah intentionally speaks about single women, rather than continuing to refer to adult unmarried women as girls until they marry. Marriage is not the moment at which a woman becomes a woman.",
              },
              {
                icon: Sparkles,
                title: "Change begins with naming",
                text: "Some women may not yet be ready to attend a conversation about sexuality, fertility, or the body. But simply seeing these subjects named respectfully and professionally begins to change what feels possible to discuss. There is a place for this experience. We are allowed to talk about it.",
              },
            ].map(({ icon, title, text }) => (
              <div
                key={title}
                className="bg-background/80 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(var(--primary)/0.15)] border border-primary/10 px-6 md:px-8 py-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <SoftIcon icon={icon} />
                  <h3 className="text-lg md:text-xl font-normal text-foreground">{title}</h3>
                </div>
                <p className="text-base text-foreground/75 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTICIPANTS TO BUILDERS */}
      <section className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-6 md:px-[42px] bg-card/40">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            <div className="bg-background rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(0_0%_0%_/_0.12)] border border-primary/5 px-6 md:px-8 py-8 md:py-10">
              <div className="flex items-center gap-3 mb-5">
                <SoftIcon icon={Sparkles} />
                <h2 className="text-xl md:text-2xl font-light tracking-tight text-foreground">
                  From Participants to Community Builders
                </h2>
              </div>
              <div className="space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed">
                <p>
                  In 2026, Achoti Kalah launched Meholelot Kehila – Community Catalysts, a growing initiative that is
                  becoming an important part of the organization's long-term community infrastructure.
                </p>
                <p>Today, 14 women from within the community create and lead gatherings themselves.</p>
                <p>
                  The model expands the diversity and frequency of programming, but its significance goes further: it
                  gradually places more initiative, creativity, and leadership in the hands of the women themselves.
                </p>
                <PullQuote>
                  From a community built for women
                  <br />
                  to a community increasingly built by women.
                </PullQuote>
              </div>
            </div>

            <div className="bg-background rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(0_0%_0%_/_0.12)] border border-primary/5 px-6 md:px-8 py-8 md:py-10">
              <div className="flex items-center gap-3 mb-5">
                <SoftIcon icon={BookOpen} />
                <h2 className="text-xl md:text-2xl font-light tracking-tight text-foreground">
                  Not Only a Place to Receive. A Place to Grow.
                </h2>
              </div>
              <div className="space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed">
                <p>
                  Prolonged singlehood can sometimes become a period of waiting rather than development. Years of
                  uncertainty and repeated rejection can affect confidence, while some of the transitions and
                  partnerships that naturally propel other stages of adult life may be absent.
                </p>
                <p>
                  Achoti Kalah therefore also looks for talent already present within the community and, whenever
                  possible, hires women from the community as paid lecturers, facilitators, artists, and professionals.
                </p>
                <p>
                  The community can become not only a source of support, but a place where ability is recognized and a
                  next step becomes possible.
                </p>
                <p className="text-primary">
                  The community is not only a place to receive support. It can also be a place to discover what you have
                  to give.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 md:mt-14 bg-accent/40 rounded-2xl md:rounded-3xl border border-primary/5 px-6 md:px-8 py-8 md:py-10">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <SoftIcon icon={ArrowUpRight} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-normal text-foreground mb-3">From Talent to Opportunity</h3>
                <div className="space-y-4 text-base md:text-lg text-foreground/80 leading-relaxed">
                  <p>
                    One community member, a talented dance artist, wanted to begin teaching modern dance but lacked the
                    confidence to take the first step.
                  </p>
                  <p>
                    Achoti Kalah hired her to lead a session at one of its events. The women loved it and asked for
                    more. We then commissioned a full workshop series – while encouraging her to use the confidence and
                    experience she had gained to launch another series for an audience beyond the community.
                  </p>
                  <p>
                    The community became a place where talent received recognition, a paid opportunity, and the
                    confidence to take the next professional step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-6 md:px-[42px]">
        <div className="w-full md:w-[min(1200px,86%)] mx-auto">
          <div className="mb-12">
            <div className="w-12 h-px bg-primary mb-6" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight text-foreground">
              What Happens When a Place Is Built for You?
            </h2>
            <p className="text-foreground/70 mt-4 text-base md:text-lg">
              One phrase we hear from women again and again:{" "}
              <span className="text-primary">"Achoti Kalah changed my life."</span>
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 md:gap-7">
            {[
              {
                quote:
                  "I left with a sense of belonging that had been so missing in our community... I had something to receive from and something to contribute to each woman.",
                title: "“I realized I am not alone.”",
                name: "Naama, Bnei Brak",
              },
              {
                quote:
                  "I have a place where I can be myself, in my situation and as I am... I am not alone. There is community, meaningful content, and respectful conversation.",
                title: "“I have a place where I can simply be myself.”",
                name: "Sarah, Petah Tikva",
              },
              {
                quote:
                  "From the moment I discovered Achoti Kalah, my life changed... The events, learning evenings, and special festivals give me enormous strength for the entire week.",
                title: "“It gives me strength.”",
                name: "Noa, Jerusalem",
              },
              {
                quote: "There are other organizations for single women, but there is nothing like this. This is exactly what we need.",
                title: "",
                name: "Tamar, Jerusalem",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-card rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(0_0%_0%_/_0.12)] border border-primary/5 px-7 py-8 md:px-8 md:py-10 flex flex-col hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.28)] hover:-translate-y-1 transition-all duration-500"
              >
                {t.title && <h3 className="text-lg md:text-xl text-primary mb-3">{t.title}</h3>}
                <p className="text-foreground/75 leading-relaxed flex-1 text-base">{t.quote}</p>
                <p className="text-sm text-muted-foreground mt-4">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MORE THAN EVENTS */}
      <section className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-6 md:px-[42px] bg-card/40">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto">
          <SectionTitle>More Than Events</SectionTitle>
          <div className="max-w-3xl space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed mb-12 text-left">
            <p>
              Five years after it began, 893 women are connected to a community that does far more than organize
              activities.
            </p>
            <p>
              Achoti Kalah listens for what is missing in women's lives, builds responses around needs emerging from
              the ground, creates opportunities from within the community, and increasingly enables women to move from
              participants to creators and leaders.
            </p>
            <p>
              What began as a grassroots initiative is becoming a model that approaches prolonged singlehood as a whole
              life stage – encompassing emotional wellbeing, belonging, body and womanhood, independence, financial
              security, fertility, relationships, professional development, creativity, and leadership.
            </p>
            <p className="text-foreground">The goal is not only to help women cope better with prolonged singlehood.</p>
            <PullQuote>
              The goal is to make sure that even within uncertainty, life keeps being built.
            </PullQuote>
          </div>

          <div className="bg-primary rounded-[28px] md:rounded-[36px] px-8 py-10 md:px-16 md:py-14 text-center text-primary-foreground shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.3)]">
            <Sparkles className="w-6 h-6 mx-auto mb-5 opacity-80" strokeWidth={1.5} />
            <p className="text-lg md:text-2xl font-light leading-relaxed mb-6">
              Listen → Identify a need → Build a response → Learn → Refine → Enable women to create and lead
            </p>
            <p className="text-primary-foreground/85 text-base md:text-lg">
              Built with women. Shaped by their lives. Growing through the strengths and leadership already within
              them.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hadassah;

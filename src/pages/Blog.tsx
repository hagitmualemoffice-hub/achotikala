import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import logo from "@/assets/logo-achoti-kala.png";
import yotzotYearImg from "@/assets/yotzot-laor-year.jpg";
import { blogPosts, getPostsBySection, SECTION_META, type BlogSection, type BlogPostData } from "@/data/blogPosts";
import { useDbPosts, dbPostsForSection } from "@/hooks/useDbPosts";
import DonationCTA from "@/components/DonationCTA";

const sectionsOrder: BlogSection[] = ["torim", "shirim", "tochen"];

const PostCard = ({ post }: { post: BlogPostData }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_10px_30px_-15px_hsl(0_0%_0%_/_0.1)] hover:shadow-[0_20px_45px_-15px_hsl(var(--primary)/0.22)] transition-all duration-300 hover:-translate-y-1 flex flex-col"
  >
    <div className="relative h-44 md:h-52 overflow-hidden bg-accent">
      <img
        src={post.image}
        alt={post.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
    <div className="p-6 md:p-7 text-right flex flex-col flex-1">
      <div className="flex items-center justify-start gap-3 mb-3">
        <span className="inline-block px-3 py-1 rounded-md bg-accent text-primary text-xs font-light">
          {post.category}
        </span>
        <span className="text-foreground/50 text-xs font-light">{post.author ?? post.date}</span>
      </div>
      <h3 className="text-foreground text-base md:text-xl font-light leading-tight mb-3 group-hover:text-primary transition-colors whitespace-pre-line">
        {post.title}
      </h3>
      {post.section !== "shirim" && (
        <p className="text-foreground/70 text-sm font-light leading-relaxed mb-5 md:mb-6 flex-1">
          {post.excerpt}
        </p>
      )}
      {post.section === "shirim" && <div className="flex-1 mb-5 md:mb-6" />}
      <span className="self-start text-primary text-sm font-medium group-hover:text-[hsl(var(--primary-glow))] transition-colors">
        להמשיך לקרוא ←
      </span>
    </div>
  </Link>
);

const SectionRow = ({ section, dbPosts }: { section: BlogSection; dbPosts: BlogPostData[] }) => {
  const meta = SECTION_META[section];
  const posts = [...dbPostsForSection(dbPosts, section), ...getPostsBySection(section)].slice(0, 3);
  if (posts.length === 0) return null;


  return (
    <section className="w-full pb-12 md:pb-20 px-[30px] md:px-6">
      <div className="w-full md:w-[min(1100px,82%)] mx-auto">
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
          <span className="block w-1 h-7 md:h-9 bg-primary rounded-full" />
          <h2 className="text-foreground text-xl md:text-3xl font-light tracking-tight">
            {meta.label}
          </h2>
        </div>
        <p className="text-foreground/60 text-sm md:text-base font-light mb-2 md:mb-3 pr-4 md:pr-6">
          {meta.description}
        </p>
        <div className="flex justify-start mb-6 md:mb-8 pr-4 md:pr-6">
          <Link
            to={`/blog/section/${section}`}
            className="text-primary text-xs md:text-sm font-medium hover:text-[hsl(var(--primary-glow))] transition-colors whitespace-nowrap"
          >
            לכל הפוסטים ←
          </Link>
        </div>
        {section === "shirim" && (
          <Link
            to="/yotzot-laor-year"
            className="block mb-6 md:mb-8 rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-l from-[hsl(340_50%_95%)] to-[hsl(0_0%_100%)] border border-primary/10 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.12)] hover:shadow-[0_16px_40px_-12px_hsl(var(--primary)/0.2)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="md:w-1/3 aspect-[4/3] md:aspect-auto">
                <img
                  src={yotzotYearImg}
                  alt="יוצאות לאור - שנה"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-6 md:p-8 text-right flex flex-col justify-center">
                <span className="inline-block self-start px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-light mb-3">
                  אוסף מיוחד
                </span>
                <h3 className="text-foreground text-lg md:text-2xl font-light tracking-tight mb-2">
                  יוצאות לאור - שנה
                </h3>
                <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed mb-4">
                  91 משפטים נבחרים משיריהן של נשים מהקהילה, לרגל שנה ל"יוצאות לאור". מילים שנכתבו בקול אמיתי.
                </p>
                <span className="self-start text-primary text-sm font-medium hover:text-[hsl(var(--primary-glow))] transition-colors">
                  לצפייה באוסף ←
                </span>
              </div>
            </div>
          </Link>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Blog = () => {
  const dbPosts = useDbPosts();
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0" dir="rtl">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-center px-5 py-3">
          <Link to="/" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <div className="h-12 md:h-20" />

      <section className="w-full pt-6 pb-8 md:pt-20 md:pb-12 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto text-right">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <span className="block w-1 h-8 md:h-12 bg-primary rounded-full" />
            <h1 className="text-foreground text-[1.75rem] md:text-6xl font-light tracking-tight leading-tight">
              מילים שפוגשות חיים | בלוג
            </h1>
          </div>
          <p className="text-foreground/70 text-sm md:text-xl font-light max-w-2xl pr-3 md:pr-5 leading-relaxed">
            פוסטים אישיים, טורים מהמגזין, שירה מקבוצת הכתיבה ותכנים מאחותי כלה - מילים שנולדות מהחיים עצמם.
          </p>
        </div>
      </section>

      {sectionsOrder.map((s) => (
        <SectionRow key={s} section={s} dbPosts={dbPosts} />
      ))}

      <section className="w-full pb-16 md:pb-24 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto">
          <div
            className="rounded-2xl md:rounded-[40px] px-7 md:px-20 py-10 md:py-20 text-right"
            style={{
              background: "linear-gradient(90deg, hsl(20 85% 74%) 0%, hsl(340 72% 68%) 100%)",
            }}
          >
            <div className="w-full md:w-[min(680px,90%)] mr-0">
              <h2 className="text-white text-[1.5rem] md:text-4xl font-light leading-tight mb-4 md:mb-5">
                רוצה לקבל פוסטים חדשים ישר למייל?
              </h2>
              <p className="text-white/95 text-sm md:text-lg font-light leading-relaxed mb-6 md:mb-8">
                הצטרפי למרחב שקט של נשימה וציפורים שנאספות בקפידה אל תיבת המייל שלך.
              </p>
              <Link
                to="/"
                className="inline-block px-8 md:px-10 py-3 rounded-lg bg-white text-foreground text-sm md:text-base font-light shadow-md hover:bg-primary hover:text-primary-foreground transition-all"
              >
                להצטרפות לתפוצה
              </Link>
            </div>
          </div>
        </div>
      </section>

      <DonationCTA
        id="donate"
        title="יש דברים שמשתנים ברגע שמתחילים לדבר עליהם."
        paragraphs={[
          "אנחנו כותבות על החיים ברווקות מתמשכת. על הדברים הגדולים, ועל הרגעים הקטנים שאף אחד כמעט לא מדבר עליהם. נותנות מילים לחוויות שנשים רבות מכירות, אבל לא תמיד יודעות איך להסביר.",
          "כל פוסט כזה יכול להגיע לאישה שפתאום מרגישה שמישהו רואה אותה. אבל הוא יכול להגיע גם למשפחה, לאנשי מקצוע ולמקבלי החלטות, ולעזור להם לראות מציאות שלא הכירו קודם.",
          "אנחנו רוצות להמשיך לכתוב, ליצור ולהכניס עוד קולות לשיח.",
          "**התרומה שלכם מאפשרת לנו להמשיך לתת מילים למה שעד היום נשאר בשקט.**",
        ]}
        buttonLabel="אני רוצה לתת למילים האלה מקום"
      />

      <MobileBottomNav />
    </div>
  );
};

export default Blog;

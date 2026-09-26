import { Link } from "react-router-dom";
import { Play, ExternalLink } from "lucide-react";
import PodcastEpisodePlayer from "@/components/PodcastEpisodePlayer";
import podcastCover from "@/assets/podcast-cover.png";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import logo from "@/assets/logo-achoti-kala.png";
import DonationCTA from "@/components/DonationCTA";

const SPOTIFY_SHOW =
  "https://open.spotify.com/show/2FIal7yOO7htlBkKUwCbxW?si=dtVPb1AQQomBBOTazo3hWA";

const episodes = [
  {
    num: "01",
    title: "על חיבור לגוף עם נעם ארז",
    description:
      "על חיבור לגוף, למה שימור פוריות ואיך את יכולה לעשות את התהליך מתוך חיבור ובחירה.",
    duration: "47 דק׳",
    date: "מרץ 2026",
    spotifyUrl: SPOTIFY_SHOW,
    driveUrl:
      "https://drive.google.com/file/d/1kEgTm8iRMiUmhaZ6Si4HXalrsmF2HKR5/view?usp=drive_link",
  },
  {
    num: "02",
    title: 'על הקשבה לגוף עם ד"ר מיכל פרנסט',
    description:
      "על הקשבה לגוף בתהליך שימור פוריות, ואיך זו יכולת שיכולה לעזור לך בתהליך.",
    duration: "52 דק׳",
    date: "פברואר 2026",
    spotifyUrl: SPOTIFY_SHOW,
    driveUrl:
      "https://drive.google.com/file/d/1w628JudX26Cx5_1szSSlCpO4mOGlolo7/view?usp=sharing",
  },
  {
    num: "03",
    title: "על חרדה והימנעות עם דורית בנגד אלבד",
    description:
      "על חרדה והימנעות בתהליך שימור פוריות, ואיך את יכולה לעזור לעצמך עם זה.",
    duration: "58 דק׳",
    date: "ינואר 2026",
    spotifyUrl: SPOTIFY_SHOW,
    driveUrl:
      "https://drive.google.com/file/d/1sobWuQQdj3UCgq0z40kI2zZxSchr1pyQ/view?usp=drive_link",
  },
  {
    num: "04",
    title: 'על התהליך עצמו עם ד"ר ירדנה היימן',
    description:
      'כל מה שאת רוצה לדעת על ההליך עצמו. ד"ר היימן עם הסבר בהיר ומענה לכל השאלות.',
    duration: "44 דק׳",
    date: "דצמבר 2025",
    spotifyUrl: SPOTIFY_SHOW,
    driveUrl:
      "https://drive.google.com/file/d/1E6uK-c1ABAzDFdKcBvgJRcXMAIPskOxk/view?usp=drive_link",
  },
  {
    num: "05",
    title: 'מערכת, חברה וחדשנות עם ד"ר אביה רוזנטל',
    description:
      'שיחה עם ד"ר אביה רוזנטל, רופאת נשים בכירה ביחידת IVF בלניאדו ומנהלת המרפאה הגניקולוגית ההלכתית, על מערכת הפריון בישראל, התאמות למגזר החרדי והדתי, ושינויים נדרשים לחוויה טובה יותר.',
    duration: "-",
    date: "נובמבר 2026",
    spotifyUrl: "https://spotifycreators-web.app.link/e/fvMVNkUoL2b",
    driveUrl:
      "https://drive.google.com/file/d/1bszskgaChQgQ5iQRr8eYFwzTNvo5a8Cj/view?usp=sharing",
  },

];

const Podcast = () => {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0" dir="rtl">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      {/* Mobile-only header logo strip */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-center px-5 py-3">
          <Link to="/" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <div className="h-12 md:h-20" />

      {/* Page header */}
      <section className="w-full pt-6 pb-8 md:pt-20 md:pb-12 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto text-right">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 justify-start">
            <span className="block w-1 h-8 md:h-12 bg-primary rounded-full" />
            <h1 className="text-foreground text-[1.75rem] md:text-6xl font-light tracking-tight leading-tight">
              יודעת | פודקאסט
            </h1>
          </div>
          <p className="text-foreground/70 text-sm md:text-xl font-light max-w-2xl pr-3 md:pr-5 leading-relaxed">
            פודקאסט שנולד כדי לעשות סדר בתוך תהליך שימור הפוריות - להסביר, להרגיע, ולתת לך תחושה שאת לא לבד בתוך זה. כאן תמצאי שיחות שמחברות בין מידע ברור לבין החוויה הרגשית, ויעזרו לך להבין את הדרך, צעד אחרי צעד, בקצב שלך. 
          </p>

          {/* Platform links */}
          <div className="flex flex-wrap gap-2 md:gap-3 mt-6 md:mt-8 justify-start">
            <a
              href={SPOTIFY_SHOW}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-card border border-border text-foreground text-xs md:text-sm font-light hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              האזנה ב-Spotify
            </a>
          </div>
        </div>
      </section>

      {/* Episodes list - one full-width card per episode */}
      <section className="w-full pb-16 md:pb-24 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto space-y-5 md:space-y-6">
          {episodes.map((ep) => (
            <article
              key={ep.num}
              className="group bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_10px_30px_-15px_hsl(0_0%_0%_/_0.1)] hover:shadow-[0_20px_45px_-15px_hsl(var(--primary)/0.22)] transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0">
                {/* Cover */}
                <div className="relative h-52 md:h-auto md:min-h-[360px] overflow-hidden bg-accent">
                  <img
                    src={podcastCover}
                    alt={ep.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                    <span className="w-14 h-14 rounded-full bg-white/95 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-primary fill-primary mr-0.5" />
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-10 text-right flex flex-col">
                  <div className="flex items-center gap-3 justify-start mb-3">
                    <span className="inline-block px-3 py-1 rounded-md bg-accent text-primary text-xs font-light">
                      פרק {ep.num}
                    </span>
                    <span className="text-foreground/50 text-xs font-light">{ep.date}</span>
                    <span className="text-foreground/30">·</span>
                    <span className="text-foreground/50 text-xs font-light">{ep.duration}</span>
                  </div>

                  <h2 className="text-foreground text-xl md:text-3xl font-light leading-tight mb-3 md:mb-4 group-hover:text-primary transition-colors">
                    {ep.title}
                  </h2>
                  <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed mb-5 md:mb-6 flex-1">
                    {ep.description}
                  </p>

                  <PodcastEpisodePlayer num={ep.num} title={ep.title} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="w-full pb-16 md:pb-24 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto">
          <div
            className="rounded-2xl md:rounded-[40px] px-7 md:px-20 py-10 md:py-16 text-right"
            style={{
              background: "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
            }}
          >
            <div className="w-full md:w-[min(680px,90%)] mr-0">
              <h2 className="text-white text-[1.5rem] md:text-4xl font-light leading-tight mb-4 md:mb-5">
                רוצות לדעת מתי עולה פרק חדש?
              </h2>
              <p className="text-white/95 text-sm md:text-lg font-light leading-relaxed mb-6 md:mb-8">
                הצטרפו למרחב שקט של נשימה ותוכן שנאסף בקפידה אל תיבת המייל שלכן.
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
        title="יש מילים שעוד לא נאמרו. ואישה שמחכה לשמוע אותן."
        paragraphs={[
          "הפודקאסט שלנו מנגיש לנשים ידע על שימור פוריות בגיל שבו עוד אפשר לקבל החלטות מתוך בחירה. הוא פותח שיחות שכמעט לא התקיימו קודם, נותן מילים לחוויות שנשים נשארו איתן לבד, ולאט לאט יוצר שינוי אמיתי.",
          "אנחנו שומעות מנשים שמחכות לפרק הבא. שכל פרק מלמד אותן משהו, פותח אפשרות חדשה, ולפעמים פשוט נותן כוח.",
          "אבל כל פרק כזה עולה לנו הרבה כסף להפיק.",
          "אנחנו עדיין לא יודעות אילו מילים ייאמרו בפרק הבא, ומי תהיה האישה שתצטרך לשמוע דווקא אותן.",
          "**לכם יש אפשרות לעזור לנו להביא את המילים האלה לעולם.**",
        ]}
        buttonLabel="אני רוצה לעזור לפרק הבא לצאת"
      />

      <MobileBottomNav />
    </div>
  );
};

export default Podcast;

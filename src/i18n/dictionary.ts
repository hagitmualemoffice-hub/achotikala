/**
 * Hebrew → English dictionary used by the runtime translation overlay.
 * Keys are exact Hebrew strings (trimmed). When the user switches language
 * to "en", the overlay walks the DOM and replaces matching text nodes.
 *
 * Poem & literary article bodies are intentionally NOT included so the
 * artistic Hebrew remains intact in EN mode (a banner notes this on
 * blog post pages).
 */
export const heToEn: Record<string, string> = {
  "מגזינים לחגים": "Holiday magazines",
  "קריאה לקראת המועד · לצפייה והורדה": "Holiday reading · view and download",
  "מגזין פסח": "Passover magazine",
  "מגזין שבועות": "Shavuot magazine",
  "קריאה אישית, רוחנית ויומיומית לקראת חג החירות.": "A personal, spiritual and everyday read for the festival of freedom.",
  "תוכן מיוחד לקראת חג מתן תורה, מתוך עולמן של נשות הקהילה.": "Special content for Shavuot, from the world of our community's women.",
  "לצפייה במגזין ←": "Read the magazine →",
  "שער מגזין פסח": "Passover magazine cover",
  "שער מגזין שבועות": "Shavuot magazine cover",
  // ---------------- Header / Nav ----------------
  "אחותי כלה": "Achoti Kallah",
  "אחותי כלה - דף הבית": "Achoti Kallah - Home",
  "אודות": "About",
  "פעילות": "Activities",
  "פרויקטים": "Projects",
  "הקהילה": "Community",
  "שנדבר חששות?": "Let's talk concerns",
  "בלוג": "Blog",
  "פודקאסט": "Podcast",
  "היזמת": "Founder",
  "דברי איתנו": "Talk to us",
  "להצטרפות לתפוצה": "Join the mailing list",
  "דברי איתנו בווצאפ": "Talk to us on WhatsApp",
  "תפריט": "Menu",
  "סגירה": "Close",
  "בית": "Home",
  "קהילה": "Community",
  "תוכן": "Content",

  // ---------------- Hero ----------------
  "כלה": "Kallah",
  "מקום להיות בו כמו שאת, קהילת איכות,": "A place to be exactly as you are - a quality community,",
  "תוכן מוקפד וחוויה מיוחדת": "thoughtful content and a one-of-a-kind experience",
  "מקום חדשני לרווקות חרדיות": "An innovative space for haredi single women",
  "הצטרפי אלינו": "Join us",
  "פוסט אחרון": "Latest post",
  "פרק חדש בפודקאסט": "New podcast episode",
  "אירוע קרוב": "Upcoming event",
  "מפגש לימוד לקראת שבועות": "Shavuot study meeting",
  "יום שלישי 19.5": "Tuesday, May 19",

  // ---------------- About ----------------
  "אחותי כלה - חיבוק עצמי": "Achoti Kallah - a self-embrace",
  "אחותי כלה- מענה חדשני": "Achoti Kallah - innovative support",
  "מותאם וקשוב אליך": "tailored and attentive to you",
  "איך אפשר לחיות במלאות גם ברווקות?": "How can we live fully even while single?",
  "הצטרפי ליופי הזה": "Join this beauty",
  "אחותי כלה- עוצמה שנוצרת": "Achoti Kallah - strength born",
  "מהכוח של הביחד": "from the power of togetherness",
  "עוצמה שנוצרת מהכוח של הביחד": "Strength born from the power of togetherness",
  "הצטרפי לכוח הזה": "Join this strength",

  // ---------------- Activity areas ----------------
  "תחומי פעילות מרכזיים": "Core activity areas",
  "קהילת איכות": "Quality community",
  "מפגשים מגוונים, יצירת קשרים איכותיים קידום שידוכים הדדי":
    "Varied gatherings, building meaningful connections, mutual matchmaking",
  "התפתחות אישית": "Personal growth",
  "מפגשים מקצועיים, נשיות ברווקות, הרצאות, מפגשי שיח":
    "Professional sessions, femininity in singlehood, lectures, dialogue gatherings",
  "שימור פוריות": "Fertility preservation",
  "מידע, תמיכה רגשית פודקאסט, פרויקט תרופות, שינוי מדיניות":
    "Information, emotional support, podcast, medication project, policy change",
  "העצמה רוחנית": "Spiritual empowerment",
  "מפגשי לימוד, קבוצות לימוד וירטואליות, חיבור לשבתות וחגים":
    "Study sessions, virtual learning groups, connecting to Shabbat and holidays",
  "צמיחה מקצועית": "Professional growth",
  "פיתוח עסקי ויזמות, קהילת עצמאיות, כלכלה נכונה":
    "Business development and entrepreneurship, freelancers' community, sound finances",

  // ---------------- Projects strip ----------------
  "פרויקטים מובילים": "Featured projects",
  "מרחב מחוללות": "A space of creators",
  "להיות, להתפתח להתחבר. מרחב חדשני וייחודי לרווקות חרדיות מעל גיל 28. פעילות אחת לשבועיים":
    "To be, grow and connect. An innovative, unique space for haredi single women over 28. Meets every two weeks.",
  "מפגשים קרובים": "Upcoming meetings",
  "מפגשי לימוד ושיח": "Study & dialogue meetings",
  'קבוצות לימוד אינטימיות המאפשרות חיבור לעצמינו, אחת לשניה ולהקב"ה בתוך הרווקות. שיח פתוח ומחבר':
    "Intimate study groups that enable connection to ourselves, to each other and to Hashem within singlehood. Open, connecting dialogue.",
  "לעדכון על מפגשים": "Get meeting updates",
  "יודעת- שימור פוריות": "Yoda'at - Fertility preservation",
  "כל מה שאת רוצה לדעת על שימור פוריות. מידע יחודי טכני ורגשי ופודקאסט שיתנו לך כוח להמשיך קדימה":
    "Everything you want to know about fertility preservation. Unique technical and emotional information plus a podcast to give you strength to keep going.",
  "לקובץ המידע": "Info booklet",
  "יוצאות לאור": "Coming into the Light",
  "קבוצת כתיבה יצירתית. אתגרי כתיבה דו שבועיים, סדנאות מקצועיות תערוכות ומרחב וירטואלי":
    "A creative writing group. Bi-weekly writing prompts, professional workshops, exhibitions and a virtual space.",
  "הצטרפות לקבוצה": "Join the group",
  "רווקה עצמאית": "Independent single woman",
  "להיות רווקה זה מאתגר, להיות רווקה עצמאית זה עוד משהו. קהילה, סדנאות, הרצאות מקצועיות בועות עבודה ועוד":
    "Being single is challenging - being a self-employed single woman is something else. Community, workshops, professional lectures, work bubbles and more.",
  "פסטיבל יחפות": "Yechefut Festival",
  "ימי חוויה, הרצאות, יצירה ופעילות צפופה ואטרקטיבית. בזמנים מדויקים: חגים, חופשים ובין הזמנים":
    "Experience days, lectures, creation and rich, attractive programming - at just the right times: holidays, breaks and bein hazmanim.",
  "אירועים קודמים": "Past events",
  "באות שבת": "Shabbat is coming",
  "קבוצת חיבור לעצמינו ולשבת דרך פרשת שבוע. מייל עדכון שבועי, קבוצת שיתופים וקליגרפיה יצירתית":
    "A group connecting us to ourselves and to Shabbat through the parsha. Weekly email, sharing group and creative calligraphy.",
  "לוח חיפוש דירות": "Apartment search board",
  "פרסום שבועי של חיפושי דירות שותפות ופתיחת דירות חדשות. ככה תמצאי שותפות איכותיות מהקהילה":
    "Weekly posting of roommate searches and new apartment openings - find quality roommates from the community.",
  "פרסום חיפוש": "Post a search",
  "נותנות דרייב": "Drive Forward",
  "מעטפת לך ולרכב שלך. קבוצות דחיפה להוצאת רשיון וקניית רכב, פרויקט ליווי נהיגה ומוסכית נשית":
    "A wrap-around for you and your car. Push groups for getting a license and buying a car, a driving-companion project and a women-run garage.",
  "תאום ליווי נהיגה": "Schedule a driving companion",

  // ---------------- Scope ----------------
  "היקף פעילות": "Scope of activity",
  "משתתפות בפרויקט": "participants in the project",
  "משתתפות באירועים בשנה": "event participants per year",
  "אירועים בשנה": "events per year",
  "שנות פעילות": "years of activity",

  // ---------------- Testimonials ----------------
  "משתפות אותך": "Sharing with you",
  "תמר": "Tamar",
  "מירושלים": "from Jerusalem",
  "שרה": "Sarah",
  "מפתח תקוה": "from Petah Tikva",
  "נעה": "Noa",
  "נעמה": "Naama",
  "מבני ברק": "from Bnei Brak",
  "אחותי כלה הוא מיזם מדהים! וממלא לי כמעט כל מה שיכולתי לבקש! יש עוד ארגונים לרווקות אבל אין ארגון כזה! זה בדיוק הצורך שלנו, עם נושאים חשובים שיש לדבר עליהם, ומענה על כל מה שאפשר לחלום עליו ברווקות":
    "Achoti Kallah is an amazing initiative! It fills almost everything I could ask for. There are other organizations for single women, but nothing like this - exactly what we need, with important topics that must be discussed, and an answer to everything you could dream of in singlehood.",
  'רוצה לכתוב לכן שכיף לי במקום הזה! מרגישה פשוט שיש לי מקום שאני יכולה להיות אני, במצב שלי ובמה שאני. אני פותחת הרבה דברים שאין לי מקום אחר לפתוח. אני לא לבד! המפגשים של הלימוד יש בהם גם הוויי וגם תוכן. במפגשי ההצעות יש דגש על שיח מכבד, מדברים באופן חיובי על כל אחד וזה כ"כ חשוב בעיני. אני מודה כל כך על היוזמות השונות, הרעיונות המגוונים, ועל השקעה רבה':
    "I want to tell you how much I enjoy this place! I simply feel I have a space where I can be me, with my situation and with who I am. I open up about a lot of things I don't have anywhere else to open up about. I'm not alone! The learning meetings have both atmosphere and content. The matchmaking gatherings emphasize respectful conversation, speaking positively about everyone - that's so important to me. Thank you so much for the different initiatives, the diverse ideas and the great investment.",
  'מהרגע שהכרתי את "אחותי כלה" השתנו לי החיים. ואני תמיד אומרת את זה. האיכות של הבנות בקבוצה, הרמה הגבוהה של האירועים, הערבי לימוד והפסטיבלים המיוחדים פשוט נותנים לי כוחות אדירים לכל השבוע! אני מחכה בכיליון עיניים למיילים על קבוצות לימוד משותפות והכל באווירה הכי כיפית, מפנקת ומקבלת שאפשר':
    'Since I met "Achoti Kallah" my life has changed - I always say so. The quality of the women in the group, the high level of the events, the learning evenings and the special festivals simply give me enormous strength for the whole week! I look forward to the emails about shared learning groups - all in the most fun, indulgent and welcoming atmosphere imaginable.',
  "רציתי לומר תודה רבה על אתמול, אתן עושות דבר מדהים קיבלתי המון ערך. ובעיקר יצאתי עם תחושה טובה ותחושת שייכות דבר שהיה כל כך חסר במגזר שלנו.. יצאתי עם הרגשה שאני לא לבד בהתמודדות הזו יש עוד הרבה רווקות בנות גילי ובאופן מפתיע כולן באיכות וברמה גבוהה. היה לי מה לקבל ולתרום מכל אחת. מודה לכן על הכל!! אין לי מילים":
    "I wanted to say a huge thank you for yesterday - you do something amazing, I gained so much value. Most of all I left with a good feeling and a sense of belonging that has been so missing in our sector. I left feeling I'm not alone in this struggle - there are many other single women my age, and surprisingly, all of them at quality and level. I had something to receive and give to each one. Thank you for everything! I have no words.",

  // ---------------- Communities ----------------
  "תפוצות וקבוצות": "Mailing lists & groups",
  "גילאי 28+": "Ages 28+",
  "ליבת הפעילות": "Core programming",
  "של אחותי כלה": "of Achoti Kallah",
  "גילאי 23-28": "Ages 23-28",
  "פעילות מפעם לפעם": "Occasional gatherings",
  "על אש נמוכה": "on a low flame",
  "קהילת ליבי": "Libi Community",
  "קהילה לנשים שהתחתנו": "A community for women who married",
  "אחרי גיל 30": "after age 30",
  "תוכך אהבה": "Tochech Ahava",
  "קהילה לאמהות של רווקות": "A community for mothers of single women",
  "מעל גיל 28": "over 28",
  "הצטרפי לתפוצה": "Join the mailing list",

  // ---------------- Concerns ----------------
  "אני לא רוצה להיות שייכת לקבוצת רווקות, מתחתנת מחר":
    "I don't want to belong to a singles' group - I'll be married tomorrow",
  "מפגש רווקות? אולי זה מדכא...":
    "A singles' meet-up? Maybe it's depressing…",
  "אף פעם לא השתתפתי באירוע רווקות, וגם... אין לי עם מי לבוא. מה אם לא אמצא את עצמי?":
    "I've never attended a singles' event, and… I have no one to come with. What if I don't find my place?",
  "אני בסגנון שמרני / פתוח, מה הסגנון של המשתתפות?":
    "I'm more conservative / more open - what's the style of the participants?",

  // ---------------- Blog section on home ----------------
  "מילים שפוגשות חיים": "Words that meet life",
  "פוסטים אישיים, טורים מהמגזין וכתיבה מתוך קבוצת הכתיבה של אחותי כלה - מילים שנולדות מהחיים עצמם.":
    "Personal posts, magazine columns and writing from Achoti Kallah's writing group - words born from life itself.",
  "פוסטים אישיים, טורים מהמגזין, שירה מקבוצת הכתיבה ותכנים מאחותי כלה - מילים שנולדות מהחיים עצמם.":
    "Personal posts, magazine columns, poetry from the writing group and content from Achoti Kallah - words born from life itself.",
  "להמשיך לקרוא ←": "Keep reading →",
  "לכל הפוסטים": "All posts",
  "לכל הפוסטים ←": "All posts →",
  "פוסטים נוספים": "More posts",

  // ---------------- Podcast ----------------
  "יודעת": "Yoda'at",
  "יודעת | פודקאסט": "Yoda'at | Podcast",
  "פודקאסט שנולד כדי לעשות סדר בתוך תהליך שימור הפוריות - להסביר, להרגיע, ולתת לך תחושה שאת לא לבד בתוך זה. כאן תמצאי שיחות שמחברות בין מידע ברור לבין החוויה הרגשית, ויעזרו לך להבין את הדרך, צעד אחרי צעד, בקצב שלך.":
    "A podcast born to bring order to the fertility-preservation process - to explain, to calm and to give you the sense that you're not alone in it. Here you'll find conversations that bridge clear information and emotional experience, helping you understand the path step by step, at your own pace.",
  "האזנה ב-Spotify": "Listen on Spotify",
  "צפייה ב-Drive": "View on Drive",
  "לכל הפרקים": "All episodes",
  "רוצות לדעת מתי עולה פרק חדש?": "Want to know when a new episode drops?",
  "הצטרפו למרחב שקט של נשימה ותוכן שנאסף בקפידה אל תיבת המייל שלכן.":
    "Join a quiet space of breath and content carefully gathered to your inbox.",
  "47 דק׳": "47 min",
  "52 דק׳": "52 min",
  "58 דק׳": "58 min",
  "44 דק׳": "44 min",
  "מרץ 2026": "March 2026",
  "פברואר 2026": "February 2026",
  "ינואר 2026": "January 2026",
  "דצמבר 2025": "December 2025",
  "על חיבור לגוף עם נעם ארז": "On body connection with Noam Erez",
  'על הקשבה לגוף עם ד"ר מיכל פרנסט': "On listening to the body with Dr. Michal Frenst",
  "על חרדה והימנעות עם דורית בנגד אלבד": "On anxiety and avoidance with Dorit Banged-Albad",
  'על התהליך עצמו עם ד"ר ירדנה היימן': "On the process itself with Dr. Yardena Heimann",
  "על חיבור לגוף, למה שימור פוריות ואיך את יכולה לעשות את התהליך מתוך חיבור ובחירה.":
    "On body connection - why fertility preservation, and how you can go through the process from a place of connection and choice.",
  "על הקשבה לגוף בתהליך שימור פוריות, ואיך זו יכולת שיכולה לעזור לך בתהליך.":
    "On listening to the body during fertility preservation, and how this ability can help you in the process.",
  "על חרדה והימנעות בתהליך שימור פוריות, ואיך את יכולה לעזור לעצמך עם זה.":
    "On anxiety and avoidance during fertility preservation, and how you can help yourself with it.",
  'כל מה שאת רוצה לדעת על ההליך עצמו. ד"ר היימן עם הסבר בהיר ומענה לכל השאלות.':
    "Everything you want to know about the procedure itself. Dr. Heimann gives a clear explanation and answers every question.",
  "פרק": "Episode",

  // ---------------- About me ----------------
  "קצת עלי": "About me",
  "יזמת אחותי כלה": "Founder of Achoti Kallah",
  "לקרוא עוד ←": "Read more →",
  "רוצה להכיר גם את העבודה המקצועית שלי?": "Want to know my professional work too?",
  "אם מעניין אותך להעמיק, לקרוא או לעבוד יחד - אפשר להכיר אותי גם מהצד המקצועי:":
    "If you'd like to go deeper, read or work together - get to know me from the professional side as well:",
  "לאתר המקצועי שלי": "To my professional site",

  // ---------------- Contact section ----------------
  "כאן לכל שאלה, תהיה, מחשבה או רעיון ליוזמה חדשה. נשמח לשמוע ממך, נשמח עוד יותר להכיר אותך מקרוב באירועים שלנו":
    "Here for any question, wonder, thought or idea for a new initiative. We'd love to hear from you - and even more, to meet you in person at our events.",
  "השם שלך": "Your name",
  "כתובת מייל": "Email address",
  "טלפון": "Phone",
  "מה תרצי לכתוב לנו": "What would you like to write us",
  "שולחת...": "Sending…",
  "שליחה": "Send",

  // ---------------- Mailing list popup ----------------
  "כמה מתרגשות שאת מצטרפת אלינו": "We're so excited you're joining us",
  "נשלח לך את כל העדכונים על אירועים, מפגשים, פרויקטים חדשים ותוכן שיזמין אותך":
    "We'll send you all updates on events, meetings, new projects and content that will invite you",
  "להתחבר לעצמך": "to connect with yourself",
  "שם מלא": "Full name",
  "בחרי תפוצה": "Choose a list",
  "אחותי כלה 28+": "Achoti Kallah 28+",
  "אחותי כלה 23-28": "Achoti Kallah 23-28",
  "התחתנו אחרי 30": "Married after 30",
  "אמהות לרווקות 28+": "Mothers of singles 28+",
  "פרטיות מובטחת • ניתן להסיר בכל עת": "Privacy guaranteed • unsubscribe anytime",
  "הצטרפות": "Join",
  "שגיאה": "Error",
  "תודה!": "Thank you!",
  "נרשמת בהצלחה לתפוצה.": "You've been added to the list successfully.",
  "נרשמתם בהצלחה לתפוצה.": "You've been added to the list successfully.",
  "אירעה שגיאה, נסי שוב": "Something went wrong, please try again",
  "אירעה שגיאה, נסו שוב": "Something went wrong, please try again",

  // ---------------- Community join popup ----------------
  "מתרגשות שאת מצטרפת אלינו": "Excited you're joining us",
  "לתפוצת אחותי כלה לגילאי 28+": "to the Achoti Kallah 28+ mailing list",
  "מחכות להכיר אותך מקרוב כדי להתעדכן באירועים מוזמנת למלא את הטופס":
    "We can't wait to get to know you. To stay updated on events please fill out the form.",
  "האם את מעל גיל 28?": "Are you over 28?",
  "שמחה להצטרף": "Happy to join",
  "התפוצה מיועדת לגילאי 28+": "This list is for ages 28+",

  // ---------------- Contact popup ----------------
  "דברו איתי": "Talk to me",
  "כאן לכל שאלה או פנייה. אחזור אליכם בהקדם.":
    "Here for any question or request. I'll get back to you soon.",
  "להזמנת הרצאה": "Book a lecture",
  "ספרו לי על הקהל והאירוע, ואחזור אליכם להתאמת ההרצאה.":
    "Tell me about the audience and event, and I'll get back to tailor the lecture.",
  "בואו נתפור לכם חוויה במיוחד לצורך שלכם": "Let's tailor an experience for your needs",
  "ספרו לי על הקבוצה והנושא, ואבנה איתכם סדנה מותאמת.":
    "Tell me about the group and the topic, and we'll build a custom workshop together.",
  "בואו נתכנן סדנה": "Let's plan a workshop",
  "השם שלכם": "Your name",
  "שם הארגון / הגוף": "Organization / body name",
  "שם הארגון": "Organization name",
  "איש קשר": "Contact person",
  "מספר משתתפים": "Number of participants",
  "נושא הסדנה": "Workshop topic",
  "תאריך רצוי": "Preferred date",
  "מה תרצו לכתוב לי": "What would you like to write me",
  "הודעה נוספת (אופציונלי)": "Additional message (optional)",
  "ההודעה נשלחה, אחזור אליכם בהקדם.": "Your message has been sent. I'll get back to you soon.",

  // ---------------- Hosting popup ----------------
  "אשמח להתארח אצלכם במחלקה": "I'd love to come host with your department",
  "אשמח להתארח אצלכם": "I'd love to come host with you",
  "ספרו לי קצת על הצוות והקבוצה, ואחזור אליכם להתאמה אישית.":
    "Tell me a bit about the team and the group, and I'll get back to you with a personalized fit.",
  "לאיזה צוות זה מיועד? (לדוגמה: צוות IVF, טכנאיות, פסיכולוגים)":
    "Which team is this for? (e.g. IVF team, technicians, psychologists)",
  "כמות משתתפים": "Number of participants",
  "שם המוסד": "Institution name",
  "תוכן (אם תרצו להוסיף)": "Notes (if you'd like to add)",
  "פנייתכם התקבלה, אחזור אליכם בהקדם.": "Your request has been received. I'll get back to you soon.",

  // ---------------- Blog index ----------------
  "מילים שפוגשות חיים | בלוג": "Words that meet life | Blog",
  "טורים אישיים": "Personal columns",
  "פרשה ופסיכולוגיה, במחשבה פסיכולוגית - טורים אישיים מאת חגית.":
    "Parsha & psychology, psychological reflections - personal columns by Hagit.",
  "שירים של יוצאות לאור": "Poems from \"Coming into the Light\"",
  "שירה שנולדת מתוך קבוצת הכתיבה של אחותי כלה.":
    "Poetry born from Achoti Kallah's writing group.",
  "מאמרים, ראיונות וכתבות מהמגזין.": "Articles, interviews and magazine pieces.",
  "רוצה לקבל פוסטים חדשים ישר למייל?": "Want new posts straight to your inbox?",
  "הצטרפי למרחב שקט של נשימה וציפורים שנאספות בקפידה אל תיבת המייל שלך.":
    "Join a quiet space of breath and care, gathered carefully to your inbox.",

  // Blog post chrome
  "חזרה לבלוג": "Back to blog",
  "→ חזרה לבלוג": "→ Back to blog",
  "שיתוף": "Share",
  "אהבת? יש עוד הרבה במרחב הפנימי": "Loved it? There's much more in our inner space",
  "עוד לא פורסמו פוסטים בקטגוריה הזו. בקרוב!":
    "No posts in this category yet. Coming soon!",

  // Topic chips
  "הכל": "All",
  "רווקות": "Singlehood",
  "אתגרי חיים": "Life challenges",
  "אופטימי": "Uplifting",

  // ---------------- Comments / reactions ----------------
  "במילה אחת:": "In one word:",
  "אהבתי": "Loved it",
  "דיבר אלי": "Spoke to me",
  "רוצה לדייק": "Want to refine",
  "פחות": "Less",
  "שתפי אותנו במחשבות שלך": "Share your thoughts with us",
  "השם שלך (לא חובה)": "Your name (optional)",
  "כתבי כאן...": "Write here…",
  "שולח...": "Sending…",
  "פרסום תגובה": "Post comment",
  "טוען תגובות...": "Loading comments…",
  "עדיין אין כאן תגובות - בואי נפתח את השיחה 💛":
    "No comments yet - let's open the conversation 💛",
  "אנונימית": "Anonymous",
  "תודה ששיתפת ❤️": "Thanks for sharing ❤️",
  "לא הצלחנו לשמור את התגובה": "We couldn't save your reaction",
  "לא הצלחנו לפרסם את התגובה": "We couldn't post your comment",

  // ---------------- Validation messages ----------------
  "נא להזין שם": "Please enter your name",
  "שם ארוך מדי": "Name is too long",
  "כתובת מייל לא תקינה": "Invalid email address",
  "מייל ארוך מדי": "Email is too long",
  "מספר טלפון לא תקין": "Invalid phone number",
  "מספר טלפון ארוך מדי": "Phone number is too long",
  "נא לכתוב הודעה": "Please write a message",
  "ההודעה ארוכה מדי": "Message is too long",
  "הודעה ארוכה מדי": "Message is too long",
  "נא להזין טלפון": "Please enter a phone number",
  "טלפון ארוך מדי": "Phone is too long",
  "נא להזין צוות": "Please enter a team",
  "נא להזין כמות": "Please enter a quantity",
  "נא להזין שם מוסד": "Please enter an institution name",
  "נא להזין איש קשר": "Please enter a contact person",
  "ערך ארוך מדי": "Value is too long",
  "ארוך מדי": "Too long",
  "ההודעה נשלחה בהצלחה.": "Your message was sent successfully.",

  // ---------------- Misc ----------------
  "ABOUT": "ABOUT",
  "פרשת השבוע": "Weekly parsha",

  // Blog category labels (cards)
  "פרשה ופסיכולוגיה": "Parsha & psychology",
  "במחשבה פסיכולוגית": "Psychological reflection",
  "שירה": "Poetry",
  "ראיון": "Interview",
  "כתבה": "Article",

  // Blog post banner (added by us)
  "הפוסט מופיע בעברית. תרגום לאנגלית בקרוב.":
    "This piece is published in Hebrew. English translation coming soon.",
};

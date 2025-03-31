const apiBaseUrl = "https://api-3piee3qgbq-uc.a.run.app";
const googleApiKey = 'AIzaSyBpiGRjYvgayUj1sOg7XGj010vZanq6ZO8';
const mapApiKey = 'AIzaSyBinntha3tmVQi5BeQOHp5b7N8ErP_NMLA';

const israeli_universities = [
  { name: 'האוניברסיטה העברית בירושלים', score: 10},
  { name: 'אוניברסיטת תל אביב', score: 10},
  { name: 'אוניברסיטת בר - אילן ברמת גן', score: 10},
  { name: 'האוניברסיטה על שם בן גוריון בבאר שבע', score: 10},
  { name: 'הטכניון בחיפה', score: 10},
  { name: 'אוניברסיטת חיפה', score: 10},
  { name: 'מכון ויצמן למדע ברחובות', score: 10},
  { name: 'האוניברסיטה הפתוחה', score: 10},
  { name: 'אוניברסיטת אריאל שבשומרון', score: 10},
  { name: 'אוניברסיטת רייכמן', score: 10},
  { name: 'אפקה - המכללה האקדמית להנדסה תל אביב', score: 8.5},
  { name: 'ביה"ס הגבוה לטכנולוגיה (מכון לב לגברים, מכון טל לנשים)', score: 8.5}, //confirm this name to Liat
  { name: 'בצלאל - אקדמיה לאמנות ועיצוב', score: 8.5},
  { name: 'האקדמיה למוסיקה ולמחול בירושלים', score: 8.5},
  { name: 'המכללה האקדמית-עמק יזרעאל', score: 8.5},
  { name: 'המכללה האקדמית אחווה', score: 8.5},
  { name: 'המכללה האקדמית אשקלון', score: 8.5},
  { name: 'המכללה האקדמית גליל מערבי', score: 8.5},
  { name: 'המכללה האקדמית כנרת - עמק הירדן', score: 8.5},
  { name: 'המכללה האקדמית להנדסה - ירושלים', score: 8.5},
  { name: 'המכללה האקדמית להנדסה אורט בראודה - כרמיאל', score: 8.5},
  { name: 'המכללה האקדמית להנדסה סמי שמעון - באר שבע', score: 8.5},
  { name: 'המכללה האקדמית ספיר', score: 8.5},
  { name: 'המכללה האקדמית צפת', score: 8.5},
  { name: 'המכללה האקדמית של תל אביב יפו', score: 8.5},
  { name: 'המכללה האקדמית תל-חי', score: 8.5},
  { name: 'המרכז האקדמי הרב תחומי ירושלים', score: 8.5},
  { name: 'המרכז האקדמי רופין', score: 10},
  { name: 'מכון טכנולוגי חולון', score: 10},
  { name: 'שנקר - בי"ס גבוה להנדסה ולעיצוב', score: 10},
  { name: 'המכללה האקדמית-נתניה', score: 10}, //confirm the score to Liat
  { name: 'המכללה האקדמית לישראל ברמת גן', score: 10}, //confirm the score to Liat
  { name: 'המסלול האקדמי של המכללה למנהל', score: 10}, //confirm the score to Liat
  { name: 'המרכז האקדמי למשפט ועסקים רמת גן', score: 10}, //confirm the score to Liat
  { name: 'המרכז האקדמי פרס - רחובות', score: 10}, //confirm the score to Liat
  { name: 'המרכז האקדמי שלם', score: 10}, //confirm the score to Liat
  { name: 'המרכז האקדמי שערי מדע ומשפט', score: 10}, //confirm the score to Liat
  { name: 'הקריה האקדמית אונו', score: 10},
  { name: 'מכון שכטר למדעי היהדות', score: 10}, //confirm the score to Liat
];

const israeli_security_institutions = [
  {
    name_he: "צבא ההגנה לישראל",
    name_en: "Israel Defense Forces",
    acronym_he: "צה\"ל",
    acronym_en: "IDF",
    score: 10
  },
  {
    name_he: "שירות הביטחון הכללי",
    name_en: "Israel Security Agency",
    acronym_he: "שב\"כ",
    acronym_en: "ISA",
    score: 10
  },
  {
    name_he: "המוסד למודיעין ולתפקידים מיוחדים",
    name_en: "Mossad",
    acronym_he: "",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "משטרת ישראל",
    name_en: "Israel Police",
    acronym_he: "",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "משמר הגבול",
    name_en: "Border Police",
    acronym_he: "מג\"ב",
    acronym_en: "MAGAV",
    score: 10
  },
  {
    name_he: "פיקוד העורף",
    name_en: "Home Front Command",
    acronym_he: "",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "הרשות הלאומית להגנת הסייבר",
    name_en: "National Cyber Directorate",
    acronym_he: "",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "הממונה על הביטחון במערכת הביטחון",
    name_en: "Director of Security of the Defense Establishment",
    acronym_he: "מלמ\"ב",
    acronym_en: "DSDE",
    score: 10
  },
  {
    name_he: "המנהל למחקר, פיתוח אמצעי לחימה ותשתית טכנולוגית",
    name_en: "Directorate of Defense Research and Development",
    acronym_he: "מפא\"ת",
    acronym_en: "DDR&D",
    score: 10
  },
  {
    name_he: "הרשות לפיתוח אמצעי לחימה",
    name_en: "Rafael Advanced Defense Systems",
    acronym_he: "רפא\"ל",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "המכון למחקר ביולוגי בישראל",
    name_en: "Israel Institute for Biological Research",
    acronym_he: "",
    acronym_en: "IIBR",
    score: 10
  },
  {
    name_he: "יחידת יהלום (בחיל ההנדסה הקרבית)",
    name_en: "Yahalom Unit",
    acronym_he: "",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "היחידה הממשלתית לאבטחת מידע",
    name_en: "Governmental Information Security Unit",
    acronym_he: "יחמ\"ב",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "רשות התקשוב הממשלתי – יחידת הסייבר",
    name_en: "Government ICT Authority – Cyber Unit",
    acronym_he: "",
    acronym_en: "",
    score: 10
  },
  {
    name_he: "המרכז לחקר מדיניות ואסטרטגיה",
    name_en: "Institute for National Security Studies",
    acronym_he: "",
    acronym_en: "INSS",
    score: 10
  }
];

const israeli_health_institutions = [
  {
    name_he: "שירותי בריאות כללית",
    name_en: "Clalit Health Services",
    activity_area_he: "קופת חולים, בתי חולים ומרפאות",
    activity_area_en: "Health fund, hospitals, and clinics",
    score: 10
  },
  {
    name_he: "מכבי שירותי בריאות",
    name_en: "Maccabi Healthcare Services",
    activity_area_he: "קופת חולים, מרפאות ושירותי רפואה משלימה",
    activity_area_en: "Health fund, clinics, and complementary medicine",
    score: 10
  },
  {
    name_he: "מאוחדת",
    name_en: "Meuhedet Health Services",
    activity_area_he: "קופת חולים, מרפאות ושירותים רפואיים",
    activity_area_en: "Health fund, clinics, and medical services",
    score: 10
  },
  {
    name_he: "לאומית שירותי בריאות",
    name_en: "Leumit Health Services",
    activity_area_he: "קופת חולים, מרפאות ושירותי רפואה",
    activity_area_en: "Health fund, clinics, and medical services",
    score: 10
  },
  {
    name_he: "המרכז הרפואי תל אביב (איכילוב)",
    name_en: "Tel Aviv Sourasky Medical Center (Ichilov)",
    activity_area_he: "בית חולים ציבורי, מרכז רפואי אוניברסיטאי",
    activity_area_en: "Public hospital, university medical center",
    score: 10
  },
  {
    name_he: "המרכז הרפואי הדסה",
    name_en: "Hadassah Medical Center",
    activity_area_he: "בית חולים ציבורי, מחקר רפואי",
    activity_area_en: "Public hospital, medical research",
    score: 10
  },
  {
    name_he: "המרכז הרפואי שיבא (תל השומר)",
    name_en: "Sheba Medical Center (Tel HaShomer)",
    activity_area_he: "בית חולים ממשלתי, מרכז רפואי מתקדם",
    activity_area_en: "Government hospital, advanced medical center",
    score: 10
  },
  {
    name_he: "המרכז הרפואי רמב\"ם",
    name_en: "Rambam Health Care Campus",
    activity_area_he: "בית חולים ציבורי, מרכז טראומה",
    activity_area_en: "Public hospital, trauma center",
    score: 10
  },
  {
    name_he: "המרכז הרפואי סורוקה",
    name_en: "Soroka Medical Center",
    activity_area_he: "בית חולים ממשלתי, המרכז הרפואי הגדול בדרום",
    activity_area_en: "Government hospital, largest medical center in the south",
    score: 10
  },
  {
    name_he: "המרכז הרפואי ברזילי",
    name_en: "Barzilai Medical Center",
    activity_area_he: "בית חולים ממשלתי, מרכז רפואי אזורי",
    activity_area_en: "Government hospital, regional medical center",
    score: 10
  },
  {
    name_he: "המרכז הרפואי זיו",
    name_en: "Ziv Medical Center",
    activity_area_he: "בית חולים ממשלתי, מרכז רפואי אזורי",
    activity_area_en: "Government hospital, regional medical center",
    score: 10
  },
  {
    name_he: "בית החולים הלל יפה",
    name_en: "Hillel Yaffe Medical Center",
    activity_area_he: "בית חולים ממשלתי, מרכז רפואי אזורי",
    activity_area_en: "Government hospital, regional medical center",
    score: 10
  },
  {
    name_he: "המרכז הרפואי פוריה",
    name_en: "Poriya Medical Center",
    activity_area_he: "בית חולים ממשלתי, מרכז רפואי אזורי",
    activity_area_en: "Government hospital, regional medical center",
    score: 10
  },
  {
    name_he: "בית החולים וולפסון",
    name_en: "Wolfson Medical Center",
    activity_area_he: "בית חולים ממשלתי, מרכז רפואי אזורי",
    activity_area_en: "Government hospital, regional medical center",
    score: 10
  },
  {
    name_he: "אסותא מרכזים רפואיים",
    name_en: "Assuta Medical Centers",
    activity_area_he: "רשת בתי חולים פרטיים",
    activity_area_en: "Private hospital network",
    score: 10
  },
  {
    name_he: "מדיקה מרכזים רפואיים",
    name_en: "Medica Medical Centers",
    activity_area_he: "מרכזים רפואיים פרטיים",
    activity_area_en: "Private medical centers",
    score: 10
  },
  {
    name_he: "הרצליה מדיקל סנטר",
    name_en: "Herzliya Medical Center",
    activity_area_he: "בית חולים פרטי",
    activity_area_en: "Private hospital",
    score: 10
  },
  {
    name_he: "מכון ויצמן למדע - המחלקה לרפואה",
    name_en: "Weizmann Institute of Science - Department of Medicine",
    activity_area_he: "מחקר רפואי וביוטכנולוגי",
    activity_area_en: "Medical and biotechnological research",
    score: 10
  },
  {
    name_he: "הטכניון - הפקולטה לרפואה ע\"ש רפפורט",
    name_en: "Technion - Rappaport Faculty of Medicine",
    activity_area_he: "מחקר רפואי והכשרת רופאים",
    activity_area_en: "Medical research and physician training",
    score: 10
  },
  {
    name_he: "האוניברסיטה העברית - בית הספר לרפואה",
    name_en: "Hebrew University - Faculty of Medicine",
    activity_area_he: "מחקר רפואי והכשרת רופאים",
    activity_area_en: "Medical research and physician training",
    score: 10
  },
  {
    name_he: "מכון גולן לרפואה מתקדמת",
    name_en: "Golan Institute for Advanced Medicine",
    activity_area_he: "רפואה מתקדמת, טיפול ומחקר",
    activity_area_en: "Advanced medicine, treatment, and research",
    score: 10
  },
  {
    name_he: "מכון רפפורט לרפואה מדויקת",
    name_en: "Rappaport Institute for Personalized Medicine",
    activity_area_he: "רפואה מדויקת, מחקר גנטי",
    activity_area_en: "Personalized medicine, genetic research",
    score: 10
  },
  {
    name_he: "מכון דוידסון למחלות לב",
    name_en: "Davidson Institute for Heart Diseases",
    activity_area_he: "מחקר וטיפול במחלות לב",
    activity_area_en: "Heart disease research and treatment",
    score: 10
  },
  {
    name_he: "מכון וולקני למחקר חקלאי",
    name_en: "Volcani Institute of Agricultural Research",
    activity_area_he: "מחקר חקלאי ובריאות סביבתית",
    activity_area_en: "Agricultural research and environmental health",
    score: 10
  },
  {
    name_he: "מכון סוראסקי לרפואת נשים",
    name_en: "Sourasky Institute for Women's Health",
    activity_area_he: "טיפול ומחקר בתחום בריאות האישה",
    activity_area_en: "Women's health treatment and research",
    score: 10
  },
];


const israeli_insurance_institutions = [
  {
    name_he: "AIG ישראל חברה לביטוח בע\"מ",
    name_en: "AIG Israel Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, חיים, בריאות, נסיעות, משכנתא ועוד citeturn0search9",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "איילון חברה לביטוח בע\"מ",
    name_en: "Ayalon Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה וגמל",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "ביטוח חקלאי אגודה שיתופית מרכזית בע\"מ",
    name_en: "Agricultural Insurance Cooperative Society Ltd.",
    activity_area_he: "ביטוח חקלאי, רכוש, רכב, תאונות אישיות",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "ביטוח ישיר (IDI חברה לביטוח בע\"מ)",
    name_en: "Direct Insurance - IDI Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, חיים, בריאות, נסיעות",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "הכשרה חברה לביטוח בע\"מ",
    name_en: "Hachshara Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "הפניקס חברה לביטוח בע\"מ",
    name_en: "The Phoenix Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה וגמל",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "הראל חברה לביטוח בע\"מ",
    name_en: "Harel Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה וגמל",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "כלל חברה לביטוח בע\"מ",
    name_en: "Clal Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה וגמל",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "מגדל חברה לביטוח בע\"מ",
    name_en: "Migdal Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה וגמל",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "מנורה מבטחים ביטוח בע\"מ",
    name_en: "Menora Mivtachim Insurance Company Ltd.",
    activity_area_he: "ביטוח כללי, חיים, בריאות, פנסיה וגמל",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "ש. שלמה חברה לביטוח בע\"מ",
    name_en: "Shlomo Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, עסק, תאונות אישיות",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "שירביט חברה לביטוח בע\"מ",
    name_en: "Shirbit Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, נסיעות לחו\"ל, בריאות",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "שומרה חברה לביטוח בע\"מ",
    name_en: "Shomera Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, עסק, תאונות אישיות",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "ליברה חברה לביטוח בע\"מ",
    name_en: "Libra Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, עסק",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "ווישור חברה לביטוח בע\"מ",
    name_en: "WeSure Insurance Company Ltd.",
    activity_area_he: "ביטוח רכב, דירה, חיים, בריאות",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "אבנר - איגוד לביטוח נפגעי רכב בע\"מ",
    name_en: "Avner - Motor Vehicle Accident Victims Insurance Association Ltd.",
    activity_area_he: "ביטוח נפגעי רכב",
    activity_area_en: "",
    score: 10,
  },
  {
    name_he: "קרנית - קרן לפיצוי נפגעי תאונות דרכים",
    name_en: "Karnit - Road Accident Victims Compensation Fund",
    activity_area_he: "פיצוי נפגעי תאונות דרכים",
    activity_area_en: "",
    score: 10,
  },
];

const industries = [
  { type: 'it', list: [] },
  { type: 'bank', list: [] },
  { type: 'insurance', list: israeli_insurance_institutions },
  { type: 'health', list: israeli_health_institutions },
  { type: 'security', list: israeli_security_institutions },
];

export { 
  apiBaseUrl,
  googleApiKey,
  israeli_universities,
  israeli_security_institutions,
  israeli_health_institutions,
  israeli_insurance_institutions,
  mapApiKey,
  industries,
};
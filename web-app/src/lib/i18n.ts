// UI-only translation dictionary. Never used for note body content -
// concept/session prose always stays Turkish regardless of this toggle.
export const dict = {
  site_title: { tr: "Second Sight", en: "Second Sight" },
  nav_home: { tr: "Ana Sayfa", en: "Home" },
  nav_weekly_reports: { tr: "Haftalık Raporlar", en: "Weekly Reports" },
  daily_reminders_title: { tr: "Bu Haftanın Hatırlatmaları", en: "This Week's Reminders" },
  weekly_retro_title: { tr: "Haftalık Geriye Dönük Özet", en: "Weekly Retrospective" },
  monthly_retro_title: { tr: "Aylık Geriye Dönük Özet", en: "Monthly Retrospective" },
  categories_title: { tr: "Kategoriler", en: "Categories" },
  not_reminded_group: { tr: "Henüz hatırlanmadı", en: "Not yet reviewed" },
  reminded_group: { tr: "Hatırlandı", en: "Reviewed" },
  reminded_badge: { tr: "hatırlandı", en: "reviewed" },
  no_reminder: { tr: "—", en: "—" },
  learned_days_ago: { tr: "{n} gün önce öğrenmiştin, hatırla", en: "learned {n} days ago — review it" },
  learned_yesterday: { tr: "dün öğrenmiştin, hatırla", en: "learned yesterday — review it" },
  overdue_fallback: {
    tr: "en son bunu öğrenmiştin, hâlâ tekrar etmedin",
    en: "this was the last thing you learned, you still haven't reviewed it",
  },
  empty_no_concepts: { tr: "Bu dönemde kavram yok.", en: "No concepts in this period." },
  more_items: { tr: "tane daha (toplam {total})", en: "more (total {total})" },
  last_week: { tr: "Geçen Hafta", en: "Last Week" },
  weeks_ago_2: { tr: "2 Hafta Önce", en: "2 Weeks Ago" },
  weeks_ago_3: { tr: "3 Hafta Önce", en: "3 Weeks Ago" },
  weeks_ago_4: { tr: "4 Hafta Önce", en: "4 Weeks Ago" },
  last_month: { tr: "Geçen Ay", en: "Last Month" },
  month_before: { tr: "Önceki Ay", en: "Month Before" },
  month_before_that: { tr: "Ondan Önceki Ay", en: "Month Before That" },
  difficulty_label: { tr: "Zorluk", en: "Difficulty" },
  learned_on_label: { tr: "Öğrenilme Tarihi", en: "Date Learned" },
  status_label: { tr: "Durum", en: "Status" },
  concept_label: { tr: "Kavram", en: "Concept" },
  what_is_it: { tr: "Kavram Nedir", en: "What Is It" },
  what_i_asked: { tr: "Ne Sordum", en: "What I Asked" },
  where_i_struggled: { tr: "Nerede Zorlandım", en: "Where I Struggled" },
  what_became_clear: { tr: "Netleşen Sonuç", en: "What Became Clear" },
  related_concepts: { tr: "Bağlantılı Kavramlar", en: "Related Concepts" },
  source_session: { tr: "Kaynak oturum", en: "Source session" },
  session_summary: { tr: "Oturum Özeti", en: "Session Summary" },
  session_concepts: { tr: "Bu Oturumda Doğan Kavramlar", en: "Concepts From This Session" },
  weekly_reports_empty: {
    tr: "Henüz rapor yok. Bu sayfa, Weekly-Summaries/ klasörüne yeni notlar eklendikçe otomatik dolacak.",
    en: "No reports yet. This page will fill in automatically as notes are added to Weekly-Summaries/.",
  },
  weekly_reports_intro: {
    tr: "Haftalık gözden geçirme raporları, kategoriye göre gruplanmış, en yeni hafta en üstte.",
    en: "Weekly review reports, grouped by category, most recent week first.",
  },
  back_to_home: { tr: "Ana sayfaya dön", en: "Back to home" },
  lang_toggle_label: { tr: "EN", en: "TR" },
  day_mon: { tr: "Pazartesi", en: "Monday" },
  day_tue: { tr: "Salı", en: "Tuesday" },
  day_wed: { tr: "Çarşamba", en: "Wednesday" },
  day_thu: { tr: "Perşembe", en: "Thursday" },
  day_fri: { tr: "Cuma", en: "Friday" },
  day_sat: { tr: "Cumartesi", en: "Saturday" },
  day_sun: { tr: "Pazar", en: "Sunday" },
} as const;

export type I18nKey = keyof typeof dict;
export type Lang = "tr" | "en";

export function t(key: I18nKey, lang: Lang = "tr"): string {
  return dict[key][lang];
}

// UI-only translation dictionary. Never used for note body content - a
// note's Turkish/English body split is handled separately (see
// notes-loader.mjs and pages/notes/[slug].astro).
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
  empty_no_concepts: { tr: "Bu dönemde girdi yok.", en: "No entries in this period." },
  more_items: { tr: "tane daha (toplam {total})", en: "more (total {total})" },
  last_week: { tr: "Geçen Hafta", en: "Last Week" },
  weeks_ago_2: { tr: "2 Hafta Önce", en: "2 Weeks Ago" },
  weeks_ago_3: { tr: "3 Hafta Önce", en: "3 Weeks Ago" },
  weeks_ago_4: { tr: "4 Hafta Önce", en: "4 Weeks Ago" },
  last_month: { tr: "Geçen Ay", en: "Last Month" },
  month_before: { tr: "Önceki Ay", en: "Month Before" },
  month_before_that: { tr: "Ondan Önceki Ay", en: "Month Before That" },
  note_label: { tr: "Not", en: "Note" },
  tags_label: { tr: "Etiketler", en: "Tags" },
  entries_count_label: { tr: "Girdi Sayısı", en: "Entries" },
  last_updated_label: { tr: "Son Güncelleme", en: "Last Updated" },
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

const TR_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
};

/** Turkish-aware slugify (categories/subcategories are Turkish names). */
export function slugify(input: string): string {
  let s = input
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("");
  s = s.toLowerCase();
  // TR_MAP above already handles every Turkish special character our
  // category/subcategory names use, so no further diacritic-stripping
  // pass is needed here - anything left over just gets dropped below.
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
  return s;
}

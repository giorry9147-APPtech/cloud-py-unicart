// constants/language.ts
export type Lang = "nl" | "en";

let currentLanguage: Lang = "nl";

export function getLanguage(): Lang {
  return currentLanguage;
}

export function setLanguage(lang: Lang) {
  currentLanguage = lang;
}

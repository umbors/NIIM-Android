import { derived, writable } from "svelte/store";
import type { TranslationKey, SupportedLanguage } from "$/locale";
import { languageNames, langPack } from "$/locale";

export const locale = writable<SupportedLanguage>(
  (localStorage.getItem("locale") as SupportedLanguage) ?? "zh_cn",
);

locale.subscribe((value: SupportedLanguage) => localStorage.setItem("locale", value));

export const tr = derived(locale, ($locale) => (key: TranslationKey) => {
  const result = langPack[$locale] ? langPack[$locale][key] : undefined;
  if (result === undefined || result === "") {
    if ($locale !== "en") {
      console.warn(`${key} of ${$locale} locale is not translated`);
    }
    return langPack.en[key];
  }
  return result;
});

export const locales = languageNames;
export type { TranslationKey, SupportedLanguage } from "$/locale";

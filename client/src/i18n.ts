import { createContext, useContext, useCallback } from 'react';
export const UI_LOCALES = {
  "pt": "Português",
  "pt-PT": "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
  "pt-AO": "Português (Angola)",
  "pt-MZ": "Português (Moçambique)",
  "pt-CV": "Português (Cabo Verde)",
  "pt-GW": "Português (Guiné-Bissau)",
  "pt-ST": "Português (São Tomé e Príncipe)",
  "pt-TL": "Português (Timor-Leste)",
  "pt-GQ": "Português (Guiné Equatorial)",
  "en": "English",
  "en-GB": "English (UK)",
  "en-US": "English (US)",
  "en-CA": "English (Canada)",
  "en-AU": "English (Australia)",
  "en-NZ": "English (New Zealand)",
  "en-IE": "English (Ireland)",
  "en-ZA": "English (South Africa)",
  "en-IN": "English (India)",
  "fr": "Français",
  "fr-FR": "Français (France)",
  "fr-CA": "Français (Canada)",
  "fr-BE": "Français (Belgique)",
  "fr-CH": "Français (Suisse)",
  "fr-LU": "Français (Luxembourg)",
  "fr-SN": "Français (Sénégal)",
  "fr-CI": "Français (Côte d’Ivoire)",
  "fr-CD": "Français (RDC)",
  "fr-CM": "Français (Cameroun)",
  "fr-HT": "Français (Haïti)"
} as const;
export type UiLanguage = keyof typeof UI_LOCALES;
export type BaseLanguage = 'fr' | 'en' | 'pt';
export const baseLanguage = (locale: UiLanguage): BaseLanguage => locale.split('-')[0] as BaseLanguage;
export function isUiLanguage(value: string | null): value is UiLanguage {
  return value !== null && Object.prototype.hasOwnProperty.call(UI_LOCALES, value);
}
export const UiLanguageContext = createContext<UiLanguage>('fr');
export function useTranslation() {
  const locale = useContext(UiLanguageContext);
  return useCallback((fr: string, en: string, pt: string, variants?: Partial<Record<UiLanguage, string>>) => variants?.[locale] ?? ({fr,en,pt})[baseLanguage(locale)], [locale]);
}

import { createContext, useContext, useCallback } from 'react';
export const UI_LOCALES = { pt: 'Português', en: 'English', fr: 'Français' } as const;
export type UiLanguage = keyof typeof UI_LOCALES;
export const baseLanguage = (locale: UiLanguage): UiLanguage => locale;
export function isUiLanguage(value: string | null): value is UiLanguage {
  return value === 'pt' || value === 'en' || value === 'fr';
}
export const UiLanguageContext = createContext<UiLanguage>('fr');
export const useGameLanguage = () => useContext(UiLanguageContext);
export function useTranslation() {
  const language = useGameLanguage();
  return useCallback((fr: string, en: string, pt: string) => ({fr,en,pt})[language], [language]);
}

import { createContext, useContext } from 'react';
export type UiLanguage = 'fr' | 'en' | 'pt';
export const UiLanguageContext = createContext<UiLanguage>('fr');
export function useTranslation() {
  const language = useContext(UiLanguageContext);
  return (fr: string, en: string, pt: string) => ({fr,en,pt})[language];
}

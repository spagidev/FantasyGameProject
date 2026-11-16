import { createContext, createElement, useContext, type ReactNode } from 'react';
import { en, type Dict } from './en';
import { sk } from './sk';
import { plural } from './plural';

export type Lang = 'en' | 'sk';
export const LANGS: readonly Lang[] = ['en', 'sk'];
export const DICTS: Record<Lang, Dict> = { en, sk };
export { plural };
export type { Dict };

type Value = { lang: Lang; t: Dict };
const Context = createContext<Value>({ lang: 'en', t: en });

/** Supplies the dictionary for one language to everything below it. */
export function LanguageProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return createElement(Context.Provider, { value: { lang, t: DICTS[lang] } }, children);
}

/** The dictionary for the current interface language. */
export const useT = (): Dict => useContext(Context).t;
export const useLang = (): Lang => useContext(Context).lang;

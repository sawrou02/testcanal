import { useSyncExternalStore } from 'react'
import { setCurrency } from './utils'
import { EN } from './i18n-en'

export type Lang = 'fr' | 'en'

export interface RegionConfig {
  pays: string
  devise: string
  symbole: string
  symboleAvant: boolean
  decimales: number
  langue: string
  locale: string
}

let lang: Lang = 'fr'
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((f) => f())
}

/** Traduit une chaîne française. Repli sur le français si non traduite. */
export const t = (fr: string): string => (lang === 'en' ? EN[fr] ?? fr : fr)

export const getLang = (): Lang => lang

export const setLang = (l: Lang): void => {
  if (l !== lang) {
    lang = l
    emit()
  }
}

/** Applique les réglages régionaux (devise + langue) et notifie l'UI. */
export const applyRegion = (r: Partial<RegionConfig>): void => {
  setCurrency({
    symbole: r.symbole,
    symboleAvant: r.symboleAvant,
    decimales: r.decimales,
    locale: r.locale,
  })
  if (r.langue === 'en' || r.langue === 'fr') lang = r.langue
  emit()
}

const subscribe = (f: () => void): (() => void) => {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}

/** Hook : re-rend le composant quand la langue/devise change. */
export const useLocale = () => {
  useSyncExternalStore(subscribe, () => version, () => version)
  return { t, lang, setLang }
}

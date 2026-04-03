import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import en from '~/messages/en.json'

/** Union of supported locale codes. */
type Locale = 'en'

/** Shape of a flat message dictionary. */
type Messages = Record<string, string>

/** Available locale metadata for the switcher. */
interface LocaleOption {
  readonly code: Locale
  readonly label: string
}

/** Arguments for the translate function. */
interface TranslateArgs {
  readonly key: string
  readonly params?: Record<string, string>
}

/** All locales available in the application. */
const AVAILABLE_LOCALES: readonly LocaleOption[] = [{ code: 'en', label: 'English' }] as const

/** Map of locale code to message dictionary. */
const MESSAGE_MAP: Record<Locale, Messages> = {
  en: en satisfies Messages,
}

/** Default locale used at application start. */
const DEFAULT_LOCALE: Locale = 'en'

/** Context value shape for the i18n provider. */
interface I18nContextValue {
  readonly locale: Locale
  readonly setLocale: (locale: Locale) => void
  readonly t: (args: TranslateArgs) => string
  readonly availableLocales: readonly LocaleOption[]
}

const I18nContext: React.Context<I18nContextValue | null> = createContext<I18nContextValue | null>(
  null,
)

/** Props for the I18nProvider component. */
interface I18nProviderProps {
  readonly children: ReactNode
}

/** Interpolates all {placeholders} in a template. */
const interpolate = (args: {
  readonly template: string
  readonly params: Record<string, string>
}): string => {
  const { template, params } = args
  const entries: [string, string][] = Object.entries(params)

  return entries.reduce(
    // eslint-disable-next-line max-params
    (acc: string, entry: [string, string]) => acc.replace(`{${entry[0]}}`, entry[1]),
    template,
  )
}

/**
 * Provider that supplies i18n context to the
 * component tree. Wraps the app to enable the
 * useTranslation hook.
 */
const I18nProvider = ({ children }: I18nProviderProps) => {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  const t: (args: TranslateArgs) => string = useCallback(
    (args: TranslateArgs): string => {
      const { key, params } = args
      const messages: Messages = MESSAGE_MAP[locale]
      const template: string | undefined = messages[key]

      if (template === undefined) {
        return key
      }

      if (params === undefined) {
        return template
      }

      return interpolate({ template, params })
    },
    [locale],
  )

  const value: I18nContextValue = useMemo(
    (): I18nContextValue => ({
      locale,
      setLocale,
      t,
      availableLocales: AVAILABLE_LOCALES,
    }),
    [locale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Hook to access i18n translation function and
 * locale state. Must be used within an I18nProvider.
 */
const useTranslation = (): I18nContextValue => {
  const context: I18nContextValue | null = useContext(I18nContext)

  if (context === null) {
    throw new Error('useTranslation must be used within' + ' I18nProvider')
  }

  return context
}

export { I18nProvider, useTranslation }
export type { Locale, LocaleOption, TranslateArgs }

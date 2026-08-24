import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

const savedLang = (typeof window !== 'undefined' && localStorage.getItem('wan_lang')) || 'zh';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export const changeLanguage = (lang: 'zh' | 'en') => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wan_lang', lang);
  }
  return i18n.changeLanguage(lang);
};

export default i18n;

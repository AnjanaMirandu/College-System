import { useTranslation } from 'react-i18next';
import '../styles/language-switcher.css';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
      >
        EN
      </button>
      <button
        className={`lang-btn ${i18n.language === 'lt' ? 'active' : ''}`}
        onClick={() => changeLanguage('lt')}
      >
        LT
      </button>
    </div>
  );
};

export default LanguageSwitcher;

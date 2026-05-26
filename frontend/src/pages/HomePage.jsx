import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import heroImage from '../assets/didzdvario-school.jpg';

const HomePage = () => {
  const { t } = useTranslation();
  const userType = localStorage.getItem('userType');
  const canBrowseTeachers = !userType || userType === 'parent';

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <section className="hero">
          <div className="hero-image-large" style={{ backgroundImage: `url(${heroImage})` }}>
            <div className="hero-overlay">
              <div className="hero-copy-overlay">
                <h1>{t('home.title')}</h1>
                <p>{t('home.subtitle')}</p>
                <div className="hero-main-copy">
                  <h2>{t('home.heroTitle')}</h2>
                  <p>
                    {t('home.heroDescription')}
                  </p>
                  <div className="hero-actions">
                    {canBrowseTeachers && (
                      <a className="button-primary" href="/teachers">{t('home.browseTeachers')}</a>
                    )}
                    <div className="hero-login-actions">
                      <a className="button-secondary" href="/teacher/login">{t('common.teacherLogin')}</a>
                      <a className="button-secondary" href="/parent/login">{t('common.parentLogin')}</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="cards-grid">
          <div className="card">
            <h3>{t('home.card1Title')}</h3>
            <p>{t('home.card1Text')}</p>
          </div>
          <div className="card">
            <h3>{t('home.card2Title')}</h3>
            <p>{t('home.card2Text')}</p>
          </div>
          <div className="card">
            <h3>{t('home.card3Title')}</h3>
            <p>{t('home.card3Text')}</p>
          </div>
        </div>
        <p className="creator-credit">Created by: Suraj Anjana Mirandu</p>
      </main>
    </div>
  );
};

export default HomePage;

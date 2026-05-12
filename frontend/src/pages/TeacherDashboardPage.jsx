import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

const TeacherDashboardPage = () => {
  const { t } = useTranslation();

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('teacherDashboard.title')}</h1>
          <p className="page-subtitle">{t('teacherDashboard.subtitle')}</p>
        </header>
        <div className="cards-grid">
          <div className="card">
            <h3>{t('teacherDashboard.manageSlots')}</h3>
            <p>{t('teacherDashboard.manageSlotsText')}</p>
            <Link className="button-primary" to="/teacher/my-times">{t('teacherDashboard.myTimes')}</Link>
          </div>
          <div className="card">
            <h3>{t('teacherDashboard.viewRegistrations')}</h3>
            <p>{t('teacherDashboard.viewRegistrationsText')}</p>
            <Link className="button-primary" to="/teacher/registrations">{t('teacherDashboard.registrations')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboardPage;
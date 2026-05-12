import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = {
    token: localStorage.getItem('token'),
    userType: localStorage.getItem('userType'),
    userName: localStorage.getItem('userName'),
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('childName');
    localStorage.removeItem('childClass');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/" className="brand-link">Didždvario</Link>
      </div>
      <div className="nav-group">
        <Link to="/">{t('common.home')}</Link>
        <Link to="/teachers">{t('common.teachers')}</Link>
        {auth.token ? (
          auth.userType === 'teacher' ? (
            <Link to="/teacher/dashboard">{t('common.dashboard')}</Link>
          ) : auth.userType === 'admin' ? (
            <Link to="/admin/dashboard">{t('common.adminDashboard')}</Link>
          ) : (
            <Link to="/parent/dashboard">{t('common.myBookings')}</Link>
          )
        ) : (
          <>
            <Link to="/login">{t('common.teacherLogin')}</Link>
            <Link to="/parent/login">{t('common.parentLogin')}</Link>
            <Link to="/admin/login">{t('common.adminLogin')}</Link>
          </>
        )}
      </div>
      <div className="nav-right">
        <LanguageSwitcher />
        {auth.token && (
          <button className="button-secondary nav-logout" onClick={handleLogout}>{t('common.logout')}</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

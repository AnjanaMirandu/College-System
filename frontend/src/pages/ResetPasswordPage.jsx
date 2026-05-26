import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginPath, setLoginPath] = useState('/teacher/login');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordReset.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/password/reset', {
        token,
        password,
      });
      const nextLoginPath = res.data?.accountType === 'parent' ? '/parent/login' : '/teacher/login';
      setLoginPath(nextLoginPath);
      setMessage(res.data?.message || t('passwordReset.resetSuccess'));
      window.setTimeout(() => navigate(nextLoginPath), 1600);
    } catch (err) {
      setError(err?.response?.data?.message || t('passwordReset.resetError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('passwordReset.resetTitle')}</h1>
          <p className="page-subtitle">{t('passwordReset.resetSubtitle')}</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}
            {!token && <div className="error-message">{t('passwordReset.missingToken')}</div>}
            <div className="form-group">
              <label>{t('passwordReset.newPassword')}</label>
              <input
                type="password"
                value={password}
                placeholder={t('passwordReset.newPassword')}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                disabled={!token}
              />
            </div>
            <div className="form-group">
              <label>{t('passwordReset.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                placeholder={t('passwordReset.confirmPassword')}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                disabled={!token}
              />
            </div>
            <button className="button-primary" type="submit" disabled={submitting || !token}>
              {submitting ? t('passwordReset.resetting') : t('passwordReset.resetPassword')}
            </button>
            <p className="form-note">
              <Link className="link-button-inline" to={loginPath}>
                {t('passwordReset.backToLogin')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;

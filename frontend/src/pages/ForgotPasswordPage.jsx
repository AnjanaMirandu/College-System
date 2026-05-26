import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const ForgotPasswordPage = ({ accountType = 'teacher' }) => {
  const { t, i18n } = useTranslation();
  const normalizedType = accountType === 'parent' ? 'parent' : 'teacher';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/password/forgot', {
        accountType: normalizedType,
        email: email.trim(),
        language: i18n.language,
      });
      setMessage(res.data?.message || t('passwordReset.emailSent'));
    } catch (err) {
      setError(err?.response?.data?.message || t('passwordReset.emailError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('passwordReset.forgotTitle')}</h1>
          <p className="page-subtitle">{t('passwordReset.forgotSubtitle')}</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label>{t('login.email')}</label>
              <input
                type="email"
                placeholder={t('passwordReset.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <button className="button-primary" type="submit" disabled={submitting}>
              {submitting ? t('passwordReset.sending') : t('passwordReset.sendResetLink')}
            </button>
            <p className="form-note">
              <Link className="link-button-inline" to={`/${normalizedType}/login`}>
                {t('passwordReset.backToLogin')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;

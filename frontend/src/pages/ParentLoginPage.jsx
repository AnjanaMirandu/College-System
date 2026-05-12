import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const ParentLoginPage = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [childClass, setChildClass] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (mode === 'login') {
        const res = await api.post('/auth/parent/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userType', 'parent');
        localStorage.setItem('userName', res.data.parent.name);
        localStorage.setItem('userEmail', res.data.parent.email);
        localStorage.setItem('childName', res.data.parent.child_name || '');
        localStorage.setItem('childClass', res.data.parent.child_class || '');
        navigate('/parent/dashboard');
      } else {
        const res = await api.post('/auth/parent/register', { name, email, password, childName, childClass });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userType', 'parent');
        localStorage.setItem('userName', res.data.parent.name);
        localStorage.setItem('userEmail', res.data.parent.email);
        localStorage.setItem('childName', res.data.parent.child_name || '');
        localStorage.setItem('childClass', res.data.parent.child_class || '');
        navigate('/parent/dashboard');
      }
    } catch (error) {
      alert(error?.response?.data?.message || t('errors.unableCompleteRequest'));
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{mode === 'login' ? t('parentLogin.parentLoginTitle') : t('parentLogin.parentRegisterTitle')}</h1>
          <p className="page-subtitle">
            {mode === 'login'
              ? t('parentLogin.loginSubtitle')
              : t('parentLogin.registerSubtitle')}
          </p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label>{t('parentLogin.parentName')}</label>
                  <input type="text" placeholder={t('parentLogin.parentName')} value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('parentLogin.childName')}</label>
                  <input type="text" placeholder={t('parentLogin.childName')} value={childName} onChange={e => setChildName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('parentLogin.childClass')}</label>
                  <input type="text" placeholder={t('parentLogin.childClass')} value={childClass} onChange={e => setChildClass(e.target.value)} required />
                </div>
              </>
            )}
            <div className="form-group">
              <label>{t('parentLogin.email')}</label>
              <input type="email" placeholder={t('parentLogin.email')} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('parentLogin.password')}</label>
              <input type="password" placeholder={t('parentLogin.password')} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="button-primary" type="submit">
              {mode === 'login' ? t('parentLogin.login') : t('parentLogin.register')}
            </button>
            <p className="form-note">
              <button type="button" className="link-button-inline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? t('parentLogin.switchToRegister') : t('parentLogin.switchToLogin')}
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ParentLoginPage;

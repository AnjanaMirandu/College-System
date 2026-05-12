import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const LoginPage = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (mode === 'login') {
        const res = await api.post('/auth/teacher/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userType', 'teacher');
        localStorage.setItem('userName', res.data.teacher.name);
        localStorage.setItem('userEmail', res.data.teacher.email);
        navigate('/teacher/dashboard');
      } else {
        const res = await api.post('/auth/teacher/register', { name, email, password, subject, room });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userType', 'teacher');
        localStorage.setItem('userName', res.data.teacher.name);
        localStorage.setItem('userEmail', res.data.teacher.email);
        navigate('/teacher/dashboard');
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
          <h1 className="page-title">{mode === 'login' ? t('login.teacherLoginTitle') : t('login.teacherRegisterTitle')}</h1>
          <p className="page-subtitle">
            {mode === 'login'
              ? t('login.loginSubtitle')
              : t('login.registerSubtitle')}
          </p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label>{t('login.name')}</label>
                <input type="text" placeholder={t('login.fullName')} value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label>{t('login.email')}</label>
              <input type="email" placeholder={t('login.email')} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('login.password')}</label>
              <input type="password" placeholder={t('login.password')} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label>{t('login.subject')}</label>
                  <input type="text" placeholder={t('login.subject')} value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('login.room')}</label>
                  <input type="text" placeholder={t('login.room')} value={room} onChange={e => setRoom(e.target.value)} required />
                </div>
              </>
            )}
            <button className="button-primary" type="submit">
              {mode === 'login' ? t('login.login') : t('login.register')}
            </button>
            <p className="form-note">
              <button type="button" className="link-button-inline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? t('login.switchToRegister') : t('login.switchToLogin')}
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;

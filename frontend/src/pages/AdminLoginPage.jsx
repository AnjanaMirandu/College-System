import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const AdminLoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/admin/login', {
        email: email.trim(),
        password: password.trim(),
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userType', 'admin');
      localStorage.setItem('userName', res.data.admin.name);
      localStorage.setItem('userEmail', res.data.admin.email);
      navigate('/admin/dashboard');
    } catch (error) {
      alert(error?.response?.data?.message || t('admin.loginError'));
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('admin.loginTitle')}</h1>
          <p className="page-subtitle">{t('admin.loginSubtitle')}</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('login.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('login.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="button-primary" type="submit">{t('admin.loginButton')}</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;

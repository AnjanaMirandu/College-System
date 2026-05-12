import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const ParentRegisterPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    childName: '',
    childClass: '',
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/parent/register', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userType', 'parent');
      localStorage.setItem('userName', res.data.parent.name);
      localStorage.setItem('userEmail', res.data.parent.email);
      localStorage.setItem('childName', res.data.parent.child_name || '');
      localStorage.setItem('childClass', res.data.parent.child_class || '');
      navigate('/parent/dashboard');
    } catch (error) {
      alert(error?.response?.data?.message || t('errors.unableRegisterParent'));
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('parentLogin.parentRegisterTitle')}</h1>
          <p className="page-subtitle">{t('parentLogin.registerSubtitle')}</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('parentLogin.parentName')}</label>
              <input name="name" value={form.name} placeholder={t('parentLogin.parentName')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('parentLogin.email')}</label>
              <input name="email" type="email" value={form.email} placeholder={t('parentLogin.email')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('parentLogin.password')}</label>
              <input name="password" type="password" value={form.password} placeholder={t('parentLogin.password')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('parentLogin.childName')}</label>
              <input name="childName" value={form.childName} placeholder={t('parentLogin.childName')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('parentLogin.childClass')}</label>
              <input name="childClass" value={form.childClass} placeholder={t('parentLogin.childClass')} onChange={handleChange} required />
            </div>
            <button className="button-primary" type="submit">{t('parentLogin.register')}</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ParentRegisterPage;

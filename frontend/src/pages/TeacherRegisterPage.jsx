import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const TeacherRegisterPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    subject: '',
    room: '',
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/teacher/register', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userType', 'teacher');
      localStorage.setItem('userName', res.data.teacher.name);
      localStorage.setItem('userEmail', res.data.teacher.email);
      navigate('/teacher/dashboard');
    } catch (error) {
      alert(error?.response?.data?.message || t('errors.unableRegisterTeacher'));
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('login.teacherRegisterTitle')}</h1>
          <p className="page-subtitle">{t('login.registerSubtitle')}</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('login.name')}</label>
              <input name="name" value={form.name} placeholder={t('login.fullName')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('login.email')}</label>
              <input name="email" type="email" value={form.email} placeholder={t('login.email')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('login.password')}</label>
              <input name="password" type="password" value={form.password} placeholder={t('login.password')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('login.subject')}</label>
              <input name="subject" value={form.subject} placeholder={t('login.subject')} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('login.room')}</label>
              <input name="room" value={form.room} placeholder={t('login.room')} onChange={handleChange} />
            </div>
            <button className="button-primary" type="submit">{t('login.register')}</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default TeacherRegisterPage;

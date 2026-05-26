import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import TeacherCard from '../components/TeacherCard';

const TeachersPage = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teachers')
      .then((res) => {
        setTeachers(res.data);
        setError('');
      })
      .catch((err) => {
        setTeachers([]);
        setError(err?.response?.data?.message || 'Unable to load teachers.');
      });
  }, []);

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('teachers.title')}</h1>
          <p className="page-subtitle">{t('teachers.subtitle')}</p>
        </header>
        {error && <div className="error-message">{error}</div>}
        <div className="cards-grid">
          {teachers.map(teacher => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default TeachersPage;

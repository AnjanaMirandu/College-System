import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { formatSlotDateTime } from '../utils/timeUtils';

const getSlotTime = (registration, key) => {
  const value = registration?.slots?.[key];
  const timestamp = value ? new Date(String(value).replace(' ', 'T')).getTime() : Number.POSITIVE_INFINITY;

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

const sortRegistrationsBySlotTime = (items = []) => (
  [...items].sort((left, right) => (
    getSlotTime(left, 'start_time') - getSlotTime(right, 'start_time')
    || getSlotTime(left, 'end_time') - getSlotTime(right, 'end_time')
    || Number(left?.id || 0) - Number(right?.id || 0)
  ))
);

const ParentDashboardPage = () => {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/parent/registrations')
      .then((res) => setRegistrations(sortRegistrationsBySlotTime(res.data)))
      .catch((err) => setError(err?.response?.data?.message || 'Unable to load bookings'));
  }, []);

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('dashboard.parentDashboard')}</h1>
          <p className="page-subtitle">{t('parentDashboard.subtitle')}</p>
        </header>

        {error && <div className="notification-card error">{error}</div>}

        {!error && registrations.length === 0 && (
          <div className="card">
            <p>{t('parentDashboard.noBookings')}</p>
          </div>
        )}

        <div className="cards-grid">
          {registrations.map((reg) => {
            const teacherName = reg.teacher_name || reg.teachers?.name || `Teacher #${reg.teacher_id}`;

            return (
              <div key={reg.id} className="card">
                <h3>{t('parentDashboard.meetingWithTeacher', { teacherName })}</h3>
                <p><strong>{t('parentDashboard.child')}:</strong> {reg.child_name}</p>
                <p><strong>{t('parentDashboard.class')}:</strong> {reg.child_class}</p>
                <p><strong>{t('parentDashboard.slot')}:</strong> {formatSlotDateTime(reg.slots?.start_time)} - {formatSlotDateTime(reg.slots?.end_time)}</p>
                <p><strong>{t('parentDashboard.status')}:</strong> {reg.status || t('parentDashboard.confirmed')}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ParentDashboardPage;

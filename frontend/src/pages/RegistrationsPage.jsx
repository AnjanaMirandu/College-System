import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { formatSlotDateTime } from '../utils/timeUtils';

const RegistrationsPage = () => {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState([]);

  useEffect(() => {
    api.get('/teacher/registrations', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setRegistrations(res.data));
  }, []);

  const cancelRegistration = async (id) => {
    try {
      await api.patch(`/teacher/registrations/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRegistrations((prev) => prev.filter(r => r.id !== id));
    } catch (error) {
      alert(error?.response?.data?.message || t('errors.errorCancellingRegistration'));
    }
  };

  return (
    <div className="App">
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('registrations.title')}</h1>
          <p className="page-subtitle">{t('registrations.subtitle')}</p>
        </header>
        <div className="registration-list">
          {registrations.map(reg => (
            <div key={reg.id} className="registration-card">
              <div className="registration-row">
                <strong>{t('registrations.slotTime')}</strong>
                <span>{formatSlotDateTime(reg.slots.start_time)} - {formatSlotDateTime(reg.slots.end_time)}</span>
              </div>
              <div className="registration-row">
                <strong>{t('registrations.parentName')}</strong>
                <span>{reg.parent_name}</span>
              </div>
              <div className="registration-row">
                <strong>{t('registrations.contact')}</strong>
                <span>{reg.parent_email || reg.parent_phone}</span>
              </div>
              <div className="registration-row">
                <strong>{t('registrations.childName')}</strong>
                <span>{reg.child_name} ({reg.child_class})</span>
              </div>
              {reg.note && (
                <div className="registration-row">
                  <strong>{t('registrations.notes')}</strong>
                  <span>{reg.note}</span>
                </div>
              )}
              <div className="registration-actions">
                <button className="button-secondary" type="button" onClick={() => cancelRegistration(reg.id)}>
                  {t('registrations.cancelRegistration')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RegistrationsPage;
import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { formatSlotTime } from '../utils/timeUtils';

const BookingFormPage = () => {
  const { slotId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const parentSignedIn = localStorage.getItem('userType') === 'parent';
  const parentName = localStorage.getItem('userName') || '';
  const parentEmail = localStorage.getItem('userEmail') || '';
  const savedChildName = localStorage.getItem('childName') || '';
  const savedChildClass = localStorage.getItem('childClass') || '';
  const selectedSlotIds = location.state?.slotIds || (slotId ? [slotId] : []);
  const selectedSlotDetails = location.state?.selectedSlotDetails || [];

  const [form, setForm] = useState({
    parentName,
    parentEmail,
    parentPhone: '',
    childName: savedChildName,
    childClass: savedChildClass,
    note: ''
  });

  const { t } = useTranslation();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlotIds.length) {
      return alert(t('booking.selectSlotAlert'));
    }

    try {
      await api.post('/registrations', { slotIds: selectedSlotIds, ...form });
      alert(t('booking.bookingSuccess'));
      navigate('/');
    } catch (error) {
      alert(error?.response?.data?.message || t('booking.bookingError'));
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('booking.title')}</h1>
          <p className="page-subtitle">{t('booking.subtitle')}</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-note">
              {t('booking.slotsSummary', { count: selectedSlotIds.length, minutes: selectedSlotIds.length * 10 })}
            </div>
            {selectedSlotDetails.length > 0 && (
              <div className="notification-card">
                <strong>{t('booking.selectedTimes')}:</strong>
                <ul>
                  {selectedSlotDetails.map((slot) => (
                    <li key={slot.id}>
                      {formatSlotTime(slot.start_time)}
                      {' - '}
                      {formatSlotTime(slot.end_time)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parentSignedIn && (
              <div className="notification-card">
                {t('booking.signedInAs', { name: parentName })}
              </div>
            )}
            <div className="form-group">
              <label>{t('booking.parentFullName')}</label>
              <input name="parentName" value={form.parentName} placeholder={t('booking.parentNamePlaceholder')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('booking.parentEmail')}</label>
              <input name="parentEmail" type="email" value={form.parentEmail} placeholder={t('booking.parentEmailPlaceholder')} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('booking.parentPhone')}</label>
              <input name="parentPhone" value={form.parentPhone} placeholder={t('booking.parentPhonePlaceholder')} onChange={handleChange} />
              <small>{t('booking.parentContactNote')}</small>
            </div>
            <div className="form-group">
              <label>{t('booking.childName')}</label>
              <input name="childName" value={form.childName} placeholder={t('booking.childNamePlaceholder')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('booking.childClass')}</label>
              <input name="childClass" value={form.childClass} placeholder={t('booking.childClassPlaceholder')} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('booking.note')}</label>
              <textarea name="note" placeholder={t('booking.notePlaceholder')} onChange={handleChange} />
            </div>
            <button className="button-primary" type="submit">{t('booking.confirmBooking')}</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BookingFormPage;

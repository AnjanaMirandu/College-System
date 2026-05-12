import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { formatSlotTime } from '../utils/timeUtils';

const TeacherSlotsPage = () => {
  const { t } = useTranslation();
  const { teacherId } = useParams();
  const [slots, setSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/teachers/${teacherId}/slots`)
      .then((res) => {
        setSlots(res.data);
        setError('');
      })
      .catch((err) => {
        setSlots([]);
        setError(err?.response?.data?.message || 'Unable to load available slots.');
      });
  }, [teacherId]);

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('teacherSlots.title')}</h1>
          <p className="page-subtitle">{t('teacherSlots.subtitle')}</p>
        </header>
        {error && <div className="error-message">{error}</div>}
        <div className="cards-grid">
          {slots.map((slot) => {
            const isSelected = selectedSlots.includes(slot.id);
            
            return (
              <div key={slot.id} className={`slot-card${isSelected ? ' slot-selected' : ''}`}>
                <label className="slot-select">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedSlots((prev) => {
                        if (prev.includes(slot.id)) {
                          return prev.filter(id => id !== slot.id);
                        }
                        if (prev.length >= 2) {
                          alert(t('teacherSlots.selectMaxTwoAlert'));
                          return prev;
                        }
                        return [...prev, slot.id];
                      });
                    }}
                  />
                  <span>
                    {formatSlotTime(slot.start_time)}
                    {' - '}
                    {formatSlotTime(slot.end_time)}
                  </span>
                </label>
                <div className={`slot-status ${slot.is_booked ? 'booked' : 'available'}`}>
                  {slot.is_booked ? t('teacherSlots.booked') : t('teacherSlots.available')}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button className="button-primary" type="button" onClick={() => {
            if (!selectedSlots.length) {
              alert(t('teacherSlots.selectSlotAlert'));
              return;
            }
            const selectedSlotDetails = slots.filter((slot) => selectedSlots.includes(slot.id));
            navigate('/book', { state: { slotIds: selectedSlots, selectedSlotDetails } });
          }} disabled={selectedSlots.length === 0}>
            {t('teacherSlots.bookSelected')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default TeacherSlotsPage;

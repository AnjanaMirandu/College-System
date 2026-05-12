import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Calendar from 'react-calendar';
import api from '../api/axios';
import { formatSlotDateOnly, formatSlotTime } from '../utils/timeUtils';
import 'react-calendar/dist/Calendar.css';
import '../styles/calendar.css';

const meetingWindow = {
  start: '12:00',
  end: '19:00',
  maxSlots: 42,
};

const MyTimesPage = () => {
  const [form, setForm] = useState({
    startTime: meetingWindow.start,
    numSlots: meetingWindow.maxSlots,
    endTime: meetingWindow.end
  });
  const [calculatedEndTime, setCalculatedEndTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateSlots, setSelectedDateSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchTeacherSlots();
  }, []);

  useEffect(() => {
    const dateStr = selectedDate.toDateString();
    const filteredSlots = slots.filter(slot => formatSlotDateOnly(slot.start_time) === dateStr);
    setSelectedDateSlots(filteredSlots);
  }, [slots, selectedDate]);

  const fetchTeacherSlots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teacher/slots', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSlots(response.data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const formatSelectedDate = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const computeEndTime = (startTime, numSlots) => {
    if (!startTime || !numSlots) return '';
    const date = formatSelectedDate();
    const start = new Date(`${date}T${startTime}`);
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + Number(numSlots) * 10 * 60000);
    if (Number.isNaN(end.getTime())) return '';
    const windowEnd = new Date(`${date}T${meetingWindow.end}`);
    return (end > windowEnd ? windowEnd : end).toTimeString().slice(0, 5);
  };

  const computeSlotCount = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const date = formatSelectedDate();
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    const diffMinutes = (end.getTime() - start.getTime()) / 60000;
    return Math.floor(diffMinutes / 10);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'numSlots') {
      const numSlots = Number(value) || 0;
      const endTime = computeEndTime(form.startTime, numSlots);
      setForm({ ...form, numSlots: endTime ? computeSlotCount(form.startTime, endTime) : numSlots, endTime });
      setCalculatedEndTime(endTime);
      return;
    }

    if (name === 'endTime') {
      const numSlots = computeSlotCount(form.startTime, value);
      setForm({ ...form, endTime: value, numSlots });
      setCalculatedEndTime(value);
      return;
    }

    const nextForm = { ...form, [name]: value };
    if (name === 'startTime') {
      const endTime = computeEndTime(value, form.numSlots);
      setForm({ ...nextForm, endTime, numSlots: endTime ? computeSlotCount(value, endTime) : form.numSlots });
      setCalculatedEndTime(endTime);
      return;
    }

    setForm(nextForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { startTime, endTime } = form;
    if (!startTime || !endTime) {
      return alert(t('myTimes.errors.selectStartAndEnd'));
    }

    const date = formatSelectedDate();
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return alert(t('myTimes.errors.invalidStartOrEnd'));
    }
    if (startTime < meetingWindow.start || endTime > meetingWindow.end) {
      return alert(t('myTimes.errors.outsideMeetingWindow'));
    }

    const diffMinutes = (end.getTime() - start.getTime()) / 60000;
    const slotCount = Math.floor(diffMinutes / 10);

    if (slotCount <= 0) {
      return alert(t('myTimes.errors.endMustBeAfterStart'));
    }
    if (slotCount > meetingWindow.maxSlots) {
      return alert(t('myTimes.errors.maxSlots'));
    }

    try {
      await api.post('/teacher/slots/generate', { date, startTime, endTime }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(t('myTimes.success.generated'));
      setForm({ startTime: meetingWindow.start, numSlots: meetingWindow.maxSlots, endTime: meetingWindow.end });
      setCalculatedEndTime('');
      fetchTeacherSlots();
    } catch (error) {
      alert(error?.response?.data?.message || t('myTimes.errors.generationFailed'));
    }
  };

  const getSlotStatusKey = (slot) => {
    if (slot.availability_status) {
      return slot.availability_status;
    }
    return slot.is_booked ? 'booked' : 'available';
  };

  const toggleSlotAvailability = async (slot) => {
    const status = getSlotStatusKey(slot);
    const unavailable = status === 'available';

    try {
      await api.patch(`/teacher/slots/${slot.id}/availability`, { unavailable });
      alert(unavailable ? t('myTimes.success.markedBusy') : t('myTimes.success.markedAvailable'));
      fetchTeacherSlots();
    } catch (error) {
      alert(error?.response?.data?.message || t('myTimes.errors.availabilityUpdateFailed'));
    }
  };

  const getDatesWithSlots = () => {
    return slots.map(slot => formatSlotDateOnly(slot.start_time));
  };

  const tileContent = ({ date }) => {
    const dateStr = date.toDateString();
    const hasSlots = getDatesWithSlots().includes(dateStr);
    if (hasSlots) {
      const count = slots.filter(s => formatSlotDateOnly(s.start_time) === dateStr).length;
      return <div className="calendar-badge">{count}</div>;
    }
    return null;
  };

  const tileClassName = ({ date }) => {
    const dateStr = date.toDateString();
    const hasSlots = getDatesWithSlots().includes(dateStr);
    return hasSlots ? 'has-slots' : '';
  };

  return (
    <div className="App">
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('myTimes.title')}</h1>
          <p className="page-subtitle">{t('myTimes.subtitle')}</p>
        </header>

        <div className="times-layout">
          {/* Left: Calendar */}
          <div className="calendar-section">
            <h2>{t('myTimes.availableDates')}</h2>
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
            />
            <p className="calendar-info">
              {selectedDateSlots.length > 0
                ? t('myTimes.slotsOnDate', { count: selectedDateSlots.length, date: selectedDate.toLocaleDateString() })
                : t('myTimes.noSlotsOnDate', { date: selectedDate.toLocaleDateString() })}
            </p>
          </div>

          {/* Middle: Slots for Selected Date */}
          <div className="slots-section">
            <h2>{t('myTimes.slotsForDate', { date: selectedDate.toLocaleDateString() })}</h2>
            {loading ? (
              <p>{t('myTimes.loading')}</p>
            ) : selectedDateSlots.length > 0 ? (
              <div className="slots-list">
                {selectedDateSlots.map((slot) => {
                  const status = getSlotStatusKey(slot);
                  const canToggleAvailability = status !== 'booked';

                  return (
                    <div key={slot.id} className="slot-item">
                      <div className="slot-time">
                        {formatSlotTime(slot.start_time)}
                        {' - '}
                        {formatSlotTime(slot.end_time)}
                      </div>
                      <div className={`slot-status ${status}`}>
                        {t(`myTimes.${status}`)}
                      </div>
                      {canToggleAvailability && (
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={() => toggleSlotAvailability(slot)}
                        >
                          {status === 'available' ? t('myTimes.markBusyBreak') : t('myTimes.markAvailable')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-slots">{t('myTimes.noSlotsCreated')}</p>
            )}
          </div>

          {/* Right: Create Slots Form */}
          <div className="form-card create-slots">
            <h2>{t('myTimes.createNewSlots')}</h2>
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="form-note">
                {t('myTimes.selectedDateFromCalendar', { date: selectedDate.toLocaleDateString() })}
              </div>
              <div className="form-group">
                <label>{t('myTimes.startTime')}</label>
                <input
                  name="startTime"
                  type="time"
                  min={meetingWindow.start}
                  max="18:50"
                  step="600"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('myTimes.numberOfSlots')}</label>
                <input
                  name="numSlots"
                  type="number"
                  min="1"
                  max={meetingWindow.maxSlots}
                  value={form.numSlots}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('myTimes.endTime')}</label>
                <input
                  name="endTime"
                  type="time"
                  min="12:10"
                  max={meetingWindow.end}
                  step="600"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-note">
                {t('myTimes.estimatedEndTime')} {calculatedEndTime || t('myTimes.pleaseSelectValidTime')}
              </div>
              <div className="form-note">
                {t('myTimes.slotInstructions')}
              </div>
              <button className="button-primary" type="submit">{t('myTimes.generateSlots')}</button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyTimesPage;

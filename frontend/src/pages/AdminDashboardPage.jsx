import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Calendar from 'react-calendar';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { formatSlotDateOnly, formatSlotDateTime, formatSlotTime } from '../utils/timeUtils';
import 'react-calendar/dist/Calendar.css';
import '../styles/calendar.css';

const emptyTeacherForm = {
  name: '',
  email: '',
  subject: '',
  room: '',
  password: '',
};

const emptySlotForm = {
  teacherId: '',
  startTime: '12:00',
  endTime: '19:00',
  numSlots: 42,
};

const meetingWindow = {
  start: '12:00',
  end: '19:00',
  maxSlots: 42,
};

const emptyRegistrationSettings = {
  is_open: false,
  opens_at: '',
  closes_at: '',
  is_active_now: false,
};

const formatTeacherOption = (teacher, t) => (
  `${teacher.name} - ${teacher.subject || t('admin.subjectNotSet')} - ${t('admin.room')} ${teacher.room || t('admin.notSet')}`
);

const toDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const parseDelimitedTeachers = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const firstRow = lines[0].split(delimiter).map((value) => value.trim().toLowerCase());
  const requiredHeaders = ['name', 'email', 'subject', 'room', 'password'];
  const hasHeaderRow = requiredHeaders.every((header) => firstRow.includes(header));
  const headers = hasHeaderRow ? firstRow : requiredHeaders;
  const dataLines = hasHeaderRow ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const values = line.split(delimiter).map((value) => value.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return {
      name: row.name || '',
      email: row.email || '',
      subject: row.subject || '',
      room: row.room || '',
      password: row.password || '',
    };
  });
};

const looksStructured = (text) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('[')) {
    return true;
  }

  return /name\s*[,;]\s*email\s*[,;]\s*subject\s*[,;]\s*room\s*[,;]\s*password/i.test(trimmed);
};

const TeacherSearchPicker = ({
  label,
  teachers,
  selectedTeacherId,
  searchValue,
  isOpen,
  onSearchChange,
  onFocus,
  onSelect,
  onClose,
  t,
}) => {
  const pickerRef = useRef(null);
  const query = searchValue.trim().toLowerCase();
  const selectedTeacher = teachers.find((teacher) => String(teacher.id) === String(selectedTeacherId));
  const filteredTeachers = teachers
    .filter((teacher) => {
      if (!query) {
        return true;
      }

      return [
        teacher.name,
        teacher.email,
        teacher.subject,
        teacher.room,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    })
    .slice(0, 8);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (pickerRef.current?.contains(event.target)) {
        return;
      }

      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="form-group teacher-search-picker" ref={pickerRef}>
      <label>{label}</label>
      <input
        type="search"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={onFocus}
        placeholder={t('admin.searchTeacherPlaceholder')}
        autoComplete="off"
        required
      />
      {selectedTeacher && (
        <small>{t('admin.selected')}: {formatTeacherOption(selectedTeacher, t)}</small>
      )}
      {isOpen && (
        <div className="teacher-search-results">
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((teacher) => (
              <button
                key={teacher.id}
                type="button"
                className={String(teacher.id) === String(selectedTeacherId) ? 'selected' : ''}
                onClick={() => onSelect(teacher)}
              >
                <strong>{teacher.name}</strong>
                <span>{teacher.subject || t('admin.subjectNotSet')} · {t('admin.room')} {teacher.room || t('admin.notSet')}</span>
              </button>
            ))
          ) : (
            <span className="teacher-search-empty">{t('admin.noTeacherFound')}</span>
          )}
        </div>
      )}
    </div>
  );
};

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState({
    summary: { teachers: 0, parents: 0, slots: 0, registrations: 0 },
    teachers: [],
    parents: [],
    slots: [],
    registrations: [],
    registrationSettings: emptyRegistrationSettings,
  });
  const [error, setError] = useState('');
  const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [selectedParentIds, setSelectedParentIds] = useState([]);
  const [registrationForm, setRegistrationForm] = useState({
    isOpen: false,
    opensAt: '',
    closesAt: '',
  });
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [slotTeacherSearch, setSlotTeacherSearch] = useState('');
  const [activeTeacherPicker, setActiveTeacherPicker] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
      setSelectedSlotIds((prev) => {
        const availableIds = new Set((res.data.slots || []).map((slot) => slot.id));
        return prev.filter((id) => availableIds.has(id));
      });
      setSelectedTeacherIds((prev) => {
        const availableIds = new Set((res.data.teachers || []).map((teacher) => teacher.id));
        return prev.filter((id) => availableIds.has(id));
      });
      setSelectedParentIds((prev) => {
        const availableIds = new Set((res.data.parents || []).map((parent) => parent.id));
        return prev.filter((id) => availableIds.has(id));
      });
      setRegistrationForm({
        isOpen: Boolean(res.data.registrationSettings?.is_open),
        opensAt: toDateTimeLocal(res.data.registrationSettings?.opens_at),
        closesAt: toDateTimeLocal(res.data.registrationSettings?.closes_at),
      });
      setLastUpdated(new Date().toLocaleTimeString());
      setError('');
    } catch (err) {
      const message = err?.response?.data?.message || t('admin.unableLoadDashboard');
      setError(message);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate('/admin/login');
      }
    }
  }, [navigate, t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!slotForm.teacherId) {
      return;
    }

    const selectedTeacher = data.teachers.find((teacher) => String(teacher.id) === String(slotForm.teacherId));
    if (selectedTeacher) {
      setSlotTeacherSearch(formatTeacherOption(selectedTeacher, t));
      return;
    }

    setSlotForm((prev) => ({ ...prev, teacherId: '' }));
    setSlotTeacherSearch('');
  }, [data.teachers, slotForm.teacherId, t]);

  useEffect(() => {
    const handleFocus = () => {
      loadDashboard();
    };

    const intervalId = window.setInterval(loadDashboard, 30000);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDashboard]);

  const closeTeacherPicker = useCallback(() => {
    setActiveTeacherPicker('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeTeacherPicker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeTeacherPicker]);

  const importPreview = useMemo(() => {
    try {
      const trimmed = importText.trim();
      if (!trimmed) {
        return [];
      }

      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      }

      return parseDelimitedTeachers(trimmed);
    } catch {
      return [];
    }
  }, [importText]);

  const selectedTeacherSlots = useMemo(() => (
    data.slots.filter((slot) => (
      !slotForm.teacherId || String(slot.teacher_id) === String(slotForm.teacherId)
    ))
  ), [data.slots, slotForm.teacherId]);

  const selectedDateSlots = useMemo(() => {
    const selectedDateString = selectedDate.toDateString();
    return selectedTeacherSlots
      .filter((slot) => formatSlotDateOnly(slot.start_time) === selectedDateString)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [selectedDate, selectedTeacherSlots]);

  const formatSelectedDate = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const computeEndTime = (startTime, numSlots) => {
    if (!startTime || !numSlots) {
      return '';
    }

    const start = new Date(`${formatSelectedDate()}T${startTime}`);
    if (Number.isNaN(start.getTime())) {
      return '';
    }

    const end = new Date(start.getTime() + Number(numSlots) * 10 * 60000);
    const windowEnd = new Date(`${formatSelectedDate()}T${meetingWindow.end}`);
    return (end > windowEnd ? windowEnd : end).toTimeString().slice(0, 5);
  };

  const computeSlotCount = (startTime, endTime) => {
    if (!startTime || !endTime) {
      return 0;
    }

    const start = new Date(`${formatSelectedDate()}T${startTime}`);
    const end = new Date(`${formatSelectedDate()}T${endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return 0;
    }

    return Math.floor((end.getTime() - start.getTime()) / 600000);
  };

  const getDatesWithSlots = () => selectedTeacherSlots.map((slot) => formatSlotDateOnly(slot.start_time));

  const tileContent = ({ date }) => {
    const dateString = date.toDateString();
    const count = selectedTeacherSlots.filter((slot) => formatSlotDateOnly(slot.start_time) === dateString).length;
    return count > 0 ? <div className="calendar-badge">{count}</div> : null;
  };

  const tileClassName = ({ date }) => (
    getDatesWithSlots().includes(date.toDateString()) ? 'has-slots' : ''
  );

  const runAction = async (request, successMessage) => {
    try {
      const result = await request();
      await loadDashboard();
      if (successMessage) {
        window.alert(successMessage);
      }
      return result;
    } catch (err) {
      window.alert(err?.response?.data?.message || t('admin.unableCompleteAction'));
      return null;
    }
  };

  const handleTeacherFormChange = (e) => {
    setTeacherForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSlotFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'numSlots') {
      const numSlots = Number(value) || 0;
      setSlotForm((prev) => {
        const endTime = computeEndTime(prev.startTime, numSlots);
        return {
          ...prev,
          numSlots: endTime ? computeSlotCount(prev.startTime, endTime) : numSlots,
          endTime,
        };
      });
      return;
    }

    if (name === 'endTime') {
      setSlotForm((prev) => ({
        ...prev,
        endTime: value,
        numSlots: computeSlotCount(prev.startTime, value),
      }));
      return;
    }

    if (name === 'startTime') {
      setSlotForm((prev) => {
        const endTime = computeEndTime(value, prev.numSlots);
        return {
          ...prev,
          startTime: value,
          endTime,
          numSlots: endTime ? computeSlotCount(value, endTime) : prev.numSlots,
        };
      });
      return;
    }

    setSlotForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSlotTeacherSearchChange = (value) => {
    setSlotTeacherSearch(value);
    const selectedTeacher = data.teachers.find((teacher) => String(teacher.id) === String(slotForm.teacherId));
    const selectedTeacherLabel = selectedTeacher ? formatTeacherOption(selectedTeacher, t) : '';

    if (!value.trim() || value !== selectedTeacherLabel) {
      setSlotForm((prev) => ({ ...prev, teacherId: '' }));
    }
  };

  const handleSlotTeacherSelect = (teacher) => {
    setSlotForm((prev) => ({ ...prev, teacherId: String(teacher.id) }));
    setSlotTeacherSearch(formatTeacherOption(teacher, t));
    setActiveTeacherPicker('');
  };

  const handleRegistrationFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRegistrationForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    const result = await runAction(
      () => api.post('/admin/teachers', teacherForm),
      t('admin.teacherCreated')
    );

    if (result) {
      setTeacherForm(emptyTeacherForm);
    }
  };

  const handleUpdateRegistrationSettings = async (e) => {
    e.preventDefault();
    await runAction(
      () => api.patch('/admin/registration-settings', registrationForm),
      t('admin.registrationSettingsUpdated')
    );
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();

    if (!slotForm.teacherId) {
      window.alert(t('admin.selectTeacherForSlots'));
      return;
    }

    if (slotForm.startTime < meetingWindow.start || slotForm.endTime > meetingWindow.end) {
      window.alert(t('admin.outsideMeetingWindow'));
      return;
    }

    if (slotForm.numSlots <= 0 || slotForm.numSlots > meetingWindow.maxSlots) {
      window.alert(t('admin.createBetweenSlots', { max: meetingWindow.maxSlots }));
      return;
    }

    const result = await runAction(
      () => api.post('/admin/slots/generate', {
        teacherId: slotForm.teacherId,
        date: formatSelectedDate(),
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
      }),
      t('admin.slotsGenerated')
    );

    if (result) {
      setSlotForm((prev) => ({
        ...emptySlotForm,
        teacherId: prev.teacherId,
      }));
    }
  };

  const handleSelectSlot = (slotId) => {
    setSelectedSlotIds((prev) => (
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    ));
  };

  const handleSelectTeacher = (teacherId) => {
    setSelectedTeacherIds((prev) => (
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    ));
  };

  const handleSelectParent = (parentId) => {
    setSelectedParentIds((prev) => (
      prev.includes(parentId)
        ? prev.filter((id) => id !== parentId)
        : [...prev, parentId]
    ));
  };

  const handleSelectAllTeachers = () => {
    if (selectedTeacherIds.length === data.teachers.length) {
      setSelectedTeacherIds([]);
      return;
    }

    setSelectedTeacherIds(data.teachers.map((teacher) => teacher.id));
  };

  const handleSelectAllParents = () => {
    if (selectedParentIds.length === data.parents.length) {
      setSelectedParentIds([]);
      return;
    }

    setSelectedParentIds(data.parents.map((parent) => parent.id));
  };

  const handleSelectAllSlots = () => {
    if (selectedSlotIds.length === data.slots.length) {
      setSelectedSlotIds([]);
      return;
    }

    setSelectedSlotIds(data.slots.map((slot) => slot.id));
  };

  const handleDeleteSelectedSlots = async () => {
    if (!selectedSlotIds.length) {
      window.alert(t('admin.selectSlotToDelete'));
      return;
    }

    const confirmed = window.confirm(t('admin.confirmDeleteSlots', { count: selectedSlotIds.length }));
    if (!confirmed) {
      return;
    }

    const result = await runAction(
      () => api.post('/admin/slots/delete', { slotIds: selectedSlotIds }),
      t('admin.selectedSlotsDeleted')
    );

    if (result) {
      setSelectedSlotIds([]);
    }
  };

  const handleDeleteSelectedTeachers = async () => {
    if (!selectedTeacherIds.length) {
      window.alert(t('admin.selectTeacherToDelete'));
      return;
    }

    const confirmed = window.confirm(t('admin.confirmDeleteTeachers', { count: selectedTeacherIds.length }));
    if (!confirmed) {
      return;
    }

    const result = await runAction(
      () => api.post('/admin/teachers/delete', { teacherIds: selectedTeacherIds }),
      t('admin.selectedTeachersDeleted')
    );

    if (result) {
      setSelectedTeacherIds([]);
    }
  };

  const handleDeleteSelectedParents = async () => {
    if (!selectedParentIds.length) {
      window.alert(t('admin.selectParentToDelete'));
      return;
    }

    const confirmed = window.confirm(t('admin.confirmDeleteParents', { count: selectedParentIds.length }));
    if (!confirmed) {
      return;
    }

    const result = await runAction(
      () => api.post('/admin/parents/delete', { parentIds: selectedParentIds }),
      t('admin.selectedParentsDeleted')
    );

    if (result) {
      setSelectedParentIds([]);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setImportFileName(file.name);
    const text = await file.text();
    setImportText(text);

    if (!looksStructured(text)) {
      window.alert(t('admin.fileLoadedWarning'));
    }
  };

  const handleImportTeachers = async () => {
    const trimmed = importText.trim();
    if (!trimmed) {
      window.alert(t('admin.pasteRowsFirst'));
      return;
    }

    let teachers = [];
    try {
      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        teachers = Array.isArray(parsed) ? parsed : [];
      } else {
        teachers = parseDelimitedTeachers(trimmed);
      }
    } catch {
      window.alert(t('admin.unableParseImport'));
      return;
    }

    if (!teachers.length) {
      window.alert(t('admin.noTeacherRecords'));
      return;
    }

    const result = await runAction(
      () => api.post('/admin/teachers/import', { teachers }),
      t('admin.importedTeachers', { count: teachers.length })
    );

    if (result) {
      setImportText('');
      setImportFileName('');
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">{t('admin.dashboardTitle')}</h1>
          <p className="page-subtitle">{t('admin.dashboardSubtitle')}</p>
          <div className="admin-refresh-row">
            <button className="button-secondary" type="button" onClick={loadDashboard}>{t('admin.refreshData')}</button>
            {lastUpdated && <span>{t('admin.lastUpdated', { time: lastUpdated })}</span>}
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        <section className="cards-grid admin-summary-grid">
          <div className="card"><h3>{t('admin.teachers')}</h3><p className="admin-metric">{data.summary.teachers}</p></div>
          <div className="card"><h3>{t('admin.parents')}</h3><p className="admin-metric">{data.summary.parents}</p></div>
          <div className="card"><h3>{t('admin.slots')}</h3><p className="admin-metric">{data.summary.slots}</p></div>
          <div className="card"><h3>{t('admin.registrations')}</h3><p className="admin-metric">{data.summary.registrations}</p></div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.registrationPeriod')}</h2>
            <p>{t('admin.registrationPeriodSubtitle')}</p>
          </div>
          <div className="admin-tools-grid">
            <div className="form-card admin-tool-panel">
              <h3>{t('admin.openCloseRegistration')}</h3>
              <form className="form-grid" onSubmit={handleUpdateRegistrationSettings}>
                <label className="admin-toggle">
                  <input
                    name="isOpen"
                    type="checkbox"
                    checked={registrationForm.isOpen}
                    onChange={handleRegistrationFormChange}
                  />
                  <span>{t('admin.registrationIsOpen')}</span>
                </label>
                <div className="form-group">
                  <label>{t('admin.opensAt')}</label>
                  <input
                    name="opensAt"
                    type="datetime-local"
                    value={registrationForm.opensAt}
                    onChange={handleRegistrationFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>{t('admin.closesAt')}</label>
                  <input
                    name="closesAt"
                    type="datetime-local"
                    value={registrationForm.closesAt}
                    onChange={handleRegistrationFormChange}
                  />
                </div>
                <button className="button-primary" type="submit">{t('admin.saveRegistrationPeriod')}</button>
              </form>
            </div>
            <div className="notification-card admin-status-card">
              <strong>{t('admin.currentStatus')}</strong>
              {data.registrationSettings?.schema_missing && (
                <div className="error-message">
                  {t('admin.databaseSetupRequired')}
                </div>
              )}
              <span className={`admin-status-pill ${data.registrationSettings?.is_active_now ? 'open' : 'closed'}`}>
                {data.registrationSettings?.is_active_now ? t('admin.openToParents') : t('admin.closedToParents')}
              </span>
              <p>
                {t('admin.registrationPeriodHelp')}
              </p>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.createConsultationSlots')}</h2>
            <p>{t('admin.createConsultationSlotsSubtitle')}</p>
          </div>
          <div className="admin-scheduler-layout">
            <div className="calendar-section">
              <TeacherSearchPicker
                label={t('admin.teacher')}
                teachers={data.teachers}
                selectedTeacherId={slotForm.teacherId}
                searchValue={slotTeacherSearch}
                isOpen={activeTeacherPicker === 'calendar'}
                onSearchChange={(value) => {
                  setActiveTeacherPicker('calendar');
                  handleSlotTeacherSearchChange(value);
                }}
                onFocus={() => setActiveTeacherPicker('calendar')}
                onSelect={handleSlotTeacherSelect}
                onClose={closeTeacherPicker}
                t={t}
              />
              <Calendar
                value={selectedDate}
                onChange={setSelectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
              />
              <p className="calendar-info">
                {selectedDateSlots.length > 0
                  ? t('admin.slotsOnDate', { count: selectedDateSlots.length, date: selectedDate.toLocaleDateString() })
                  : t('admin.noSlotsOnDate', { date: selectedDate.toLocaleDateString() })}
              </p>
            </div>

            <div className="slots-section">
              <h3>{t('admin.slotsForDate', { date: selectedDate.toLocaleDateString() })}</h3>
              {selectedDateSlots.length > 0 ? (
                <div className="slots-list admin-slots-list">
                  {selectedDateSlots.map((slot) => (
                    <div className="slot-item" key={slot.id}>
                      <div className="slot-time">
                        {formatSlotTime(slot.start_time)}
                        {' - '}
                        {formatSlotTime(slot.end_time)}
                      </div>
                      <div className={`slot-status ${slot.is_booked ? 'booked' : 'available'}`}>
                        {slot.is_booked ? t('admin.booked') : t('admin.available')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-slots">{t('admin.noSlotsForTeacherDate')}</p>
              )}
            </div>

            <div className="form-card create-slots admin-create-slots">
              <h3>{t('admin.createSlots')}</h3>
              <form className="form-grid" onSubmit={handleGenerateSlots}>
                <TeacherSearchPicker
                  label={t('admin.teacherForTheseSlots')}
                  teachers={data.teachers}
                  selectedTeacherId={slotForm.teacherId}
                  searchValue={slotTeacherSearch}
                  isOpen={activeTeacherPicker === 'form'}
                  onSearchChange={(value) => {
                    setActiveTeacherPicker('form');
                    handleSlotTeacherSearchChange(value);
                  }}
                  onFocus={() => setActiveTeacherPicker('form')}
                  onSelect={handleSlotTeacherSelect}
                  onClose={closeTeacherPicker}
                  t={t}
                />
                <div className="form-note">
                  {t('admin.selectedDate', { date: selectedDate.toLocaleDateString() })}
                </div>
                <div className="form-group">
                  <label>{t('myTimes.startTime')}</label>
                  <input name="startTime" type="time" min={meetingWindow.start} max="18:50" step="600" value={slotForm.startTime} onChange={handleSlotFormChange} required />
                </div>
                <div className="form-group">
                  <label>{t('myTimes.numberOfSlots')}</label>
                  <input
                    name="numSlots"
                    type="number"
                    min="1"
                    max={meetingWindow.maxSlots}
                    value={slotForm.numSlots}
                    onChange={handleSlotFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('myTimes.endTime')}</label>
                  <input name="endTime" type="time" min="12:10" max={meetingWindow.end} step="600" value={slotForm.endTime} onChange={handleSlotFormChange} required />
                </div>
                <div className="form-note">{t('myTimes.slotInstructions')}</div>
                <button className="button-primary" type="submit">{t('admin.createSlots')}</button>
              </form>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.addTeachers')}</h2>
            <p>{t('admin.addTeachersSubtitle')}</p>
          </div>
          <div className="admin-tools-grid">
            <div className="form-card admin-tool-panel">
              <h3>{t('admin.addOneTeacher')}</h3>
              <form className="form-grid" onSubmit={handleCreateTeacher}>
                <div className="form-group">
                  <label>{t('admin.teacherFullName')}</label>
                  <input
                    name="name"
                    value={teacherForm.name}
                    onChange={handleTeacherFormChange}
                    required
                  />
                  <small>{t('admin.teacherFullNameHelp')}</small>
                </div>
                <div className="form-group">
                  <label>{t('admin.teacherEmailAddress')}</label>
                  <input
                    name="email"
                    type="email"
                    value={teacherForm.email}
                    onChange={handleTeacherFormChange}
                    required
                  />
                  <small>{t('admin.teacherEmailHelp')}</small>
                </div>
                <div className="form-group">
                  <label>{t('admin.mainSubject')}</label>
                  <input
                    name="subject"
                    value={teacherForm.subject}
                    onChange={handleTeacherFormChange}
                    required
                  />
                  <small>{t('admin.mainSubjectHelp')}</small>
                </div>
                <div className="form-group">
                  <label>{t('admin.room')}</label>
                  <input
                    name="room"
                    value={teacherForm.room}
                    onChange={handleTeacherFormChange}
                    required
                  />
                  <small>{t('admin.roomHelp')}</small>
                </div>
                <div className="form-group">
                  <label>{t('admin.temporaryPassword')}</label>
                  <input
                    name="password"
                    type="text"
                    value={teacherForm.password}
                    onChange={handleTeacherFormChange}
                    required
                  />
                  <small>{t('admin.temporaryPasswordHelp')}</small>
                </div>
                <button className="button-primary" type="submit">{t('admin.createTeacher')}</button>
              </form>
            </div>

            <div className="form-card admin-tool-panel">
              <h3>{t('admin.importTeachers')}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('admin.uploadAnyFile')}</label>
                  <input type="file" accept="*/*" onChange={handleImportFile} />
                  {importFileName && <small>{t('admin.loadedFile', { file: importFileName })}</small>}
                  <small>{t('admin.uploadHelp')}</small>
                </div>
                <div className="form-group">
                  <label>{t('admin.pasteTeacherRows')}</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <small>{t('admin.requiredColumns')}</small>
                </div>
                {importPreview.length > 0 && (
                  <div className="notification-card">
                    {t('admin.readyToImport', { count: importPreview.length })}
                  </div>
                )}
                <button className="button-primary" type="button" onClick={handleImportTeachers}>{t('admin.importTeachers')}</button>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.teachers')}</h2>
            <p>{t('admin.teachersSubtitle')}</p>
          </div>
          <div className="admin-bulk-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={handleSelectAllTeachers}
              disabled={data.teachers.length === 0}
            >
              {selectedTeacherIds.length === data.teachers.length && data.teachers.length > 0 ? t('admin.clearSelection') : t('admin.selectAllTeachers')}
            </button>
            <button
              className="button-primary"
              type="button"
              onClick={handleDeleteSelectedTeachers}
              disabled={selectedTeacherIds.length === 0}
            >
              {t('admin.deleteSelected', { count: selectedTeacherIds.length })}
            </button>
          </div>
          <div className="admin-table">
            <div className="admin-table-head admin-table-head-selectable">
              <span>{t('admin.no')}</span>
              <span>{t('admin.select')}</span>
              <span>{t('login.name')}</span>
              <span>{t('login.subject')}</span>
              <span>{t('admin.room')}</span>
              <span>{t('login.email')}</span>
              <span>{t('admin.action')}</span>
            </div>
            {data.teachers.map((teacher, index) => (
              <div className="admin-table-row admin-table-row-selectable" key={teacher.id}>
                <span className="admin-row-number">{index + 1}</span>
                <label className="admin-slot-checkbox" aria-label={`Select teacher ${teacher.name}`}>
                  <input
                    type="checkbox"
                    checked={selectedTeacherIds.includes(teacher.id)}
                    onChange={() => handleSelectTeacher(teacher.id)}
                  />
                </label>
                <span>{teacher.name}</span>
                <span>{teacher.subject || t('admin.notSet')}</span>
                <span>{teacher.room || t('admin.notSet')}</span>
                <span>{teacher.email}</span>
                <button className="button-secondary" onClick={() => runAction(() => api.delete(`/admin/teachers/${teacher.id}`), t('admin.teacherDeleted'))}>{t('admin.delete')}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.parents')}</h2>
            <p>{t('admin.parentsSubtitle')}</p>
          </div>
          <div className="admin-bulk-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={handleSelectAllParents}
              disabled={data.parents.length === 0}
            >
              {selectedParentIds.length === data.parents.length && data.parents.length > 0 ? t('admin.clearSelection') : t('admin.selectAllParents')}
            </button>
            <button
              className="button-primary"
              type="button"
              onClick={handleDeleteSelectedParents}
              disabled={selectedParentIds.length === 0}
            >
              {t('admin.deleteSelected', { count: selectedParentIds.length })}
            </button>
          </div>
          <div className="admin-table">
            <div className="admin-table-head admin-table-head-parents">
              <span>{t('admin.no')}</span>
              <span>{t('admin.select')}</span>
              <span>{t('login.name')}</span>
              <span>{t('login.email')}</span>
              <span>{t('admin.created')}</span>
              <span>{t('admin.action')}</span>
            </div>
            {data.parents.map((parent, index) => (
              <div className="admin-table-row admin-table-row-parents" key={parent.id}>
                <span className="admin-row-number">{index + 1}</span>
                <label className="admin-slot-checkbox" aria-label={`Select parent ${parent.name}`}>
                  <input
                    type="checkbox"
                    checked={selectedParentIds.includes(parent.id)}
                    onChange={() => handleSelectParent(parent.id)}
                  />
                </label>
                <span>{parent.name}</span>
                <span>{parent.email}</span>
                <span>{parent.created_at ? new Date(parent.created_at).toLocaleString() : t('admin.unknown')}</span>
                <button className="button-secondary" onClick={() => runAction(() => api.delete(`/admin/parents/${parent.id}`), t('admin.parentDeleted'))}>{t('admin.delete')}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.registrations')}</h2>
            <p>{t('admin.registrationsSubtitle')}</p>
          </div>
          <div className="registration-list">
            {data.registrations.map((registration) => (
              <div className="registration-card" key={registration.id}>
                <div className="registration-row">
                  <strong>{t('admin.teacher')}</strong>
                  <span>{registration.teachers?.name || t('admin.teacherNumber', { id: registration.teacher_id })}</span>
                </div>
                <div className="registration-row">
                  <strong>{t('admin.parent')}</strong>
                  <span>{registration.parent_name} ({registration.parent_email || registration.parent_phone || t('admin.noContact')})</span>
                </div>
                <div className="registration-row">
                  <strong>{t('parentDashboard.child')}</strong>
                  <span>{registration.child_name} - {registration.child_class}</span>
                </div>
                <div className="registration-row">
                  <strong>{t('parentDashboard.slot')}</strong>
                  <span>{formatSlotDateTime(registration.slots?.start_time)} - {formatSlotDateTime(registration.slots?.end_time)}</span>
                </div>
                <div className="registration-row">
                  <strong>{t('parentDashboard.status')}</strong>
                  <span>{registration.status || t('admin.active')}</span>
                </div>
                <div className="registration-actions">
                  <button className="button-secondary" onClick={() => runAction(() => api.patch(`/admin/registrations/${registration.id}/cancel`), t('admin.registrationCancelled'))}>{t('registrations.cancelRegistration')}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <h2>{t('admin.slots')}</h2>
            <p>{t('admin.slotsSubtitle')}</p>
          </div>
          <div className="admin-bulk-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={handleSelectAllSlots}
              disabled={data.slots.length === 0}
            >
              {selectedSlotIds.length === data.slots.length && data.slots.length > 0 ? t('admin.clearSelection') : t('admin.selectAllSlots')}
            </button>
            <button
              className="button-primary"
              type="button"
              onClick={handleDeleteSelectedSlots}
              disabled={selectedSlotIds.length === 0}
            >
              {t('admin.deleteSelected', { count: selectedSlotIds.length })}
            </button>
          </div>
          <div className="admin-table">
            <div className="admin-table-head admin-table-head-slots">
              <span>{t('admin.no')}</span>
              <span>{t('admin.select')}</span>
              <span>{t('admin.teacher')}</span>
              <span>{t('admin.start')}</span>
              <span>{t('admin.end')}</span>
              <span>{t('parentDashboard.status')}</span>
              <span>{t('admin.action')}</span>
            </div>
            {data.slots.map((slot, index) => (
              <div className="admin-table-row admin-table-row-slots" key={slot.id}>
                <span className="admin-row-number">{index + 1}</span>
                <label className="admin-slot-checkbox" aria-label={`Select slot ${slot.id}`}>
                  <input
                    type="checkbox"
                    checked={selectedSlotIds.includes(slot.id)}
                    onChange={() => handleSelectSlot(slot.id)}
                  />
                </label>
                <span>{slot.teachers?.name || t('admin.teacherNumber', { id: slot.teacher_id })}</span>
                <span>{formatSlotDateTime(slot.start_time)}</span>
                <span>{formatSlotDateTime(slot.end_time)}</span>
                <span>{slot.is_booked ? t('admin.booked') : t('admin.available')}</span>
                <button className="button-secondary" onClick={() => runAction(() => api.delete(`/admin/slots/${slot.id}`), t('admin.slotDeleted'))}>{t('admin.delete')}</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboardPage;

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TeacherCard = ({ teacher }) => {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h3>{teacher.name}</h3>
      <p>{t('teachers.subject')}: {teacher.subject}</p>
      <p>{t('teachers.room')}: {teacher.room}</p>
      <Link className="button-secondary" to={`/teachers/${teacher.id}`}>
        {t('teachers.viewSlots')}
      </Link>
    </div>
  );
};

export default TeacherCard;
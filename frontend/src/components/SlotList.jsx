import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatSlotDateTime } from '../utils/timeUtils';

const SlotList = ({ slots }) => {
  const { t } = useTranslation();

  return (
    <div className="cards-grid">
      {slots.map(slot => (
        <div key={slot.id} className="slot-card">
          <p>{formatSlotDateTime(slot.start_time)} - {formatSlotDateTime(slot.end_time)}</p>
          <Link className="button-primary" to={`/book/${slot.id}`}>
            {t('slots.bookSlot')}
          </Link>
        </div>
      ))}
    </div>
  );
};

export default SlotList;
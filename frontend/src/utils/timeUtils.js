const parseSlotDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const timeString = String(value).trim();
  const localPattern = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?$/;
  const isoPattern = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

  if (isoPattern.test(timeString)) {
    return new Date(timeString);
  }

  const localMatch = timeString.match(localPattern);
  if (localMatch) {
    const [, datePart, timePart] = localMatch;
    return new Date(`${datePart}T${timePart}`);
  }

  const parsed = new Date(timeString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatSlotTime = (timeString, options = { hour12: false }) => {
  const date = parseSlotDate(timeString);
  if (!date) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
};

export const formatSlotDateTime = (timeString, options = {}) => {
  const date = parseSlotDate(timeString);
  if (!date) return '';
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  });
};

export const formatSlotDateOnly = (timeString) => {
  const date = parseSlotDate(timeString);
  if (!date) return '';
  return date.toDateString();
};

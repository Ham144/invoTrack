// Alternatif dengan Intl.DateTimeFormat
export const formatDateTime = (date) => {
  const d = new Date(date);

  // Gunakan Intl.DateTimeFormat dengan timezone Asia/Jakarta (UTC+7)
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type) => parts.find((p) => p.type === type)?.value || '';

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hours = getPart('hour');
  const minutes = getPart('minute');
  const seconds = getPart('second');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

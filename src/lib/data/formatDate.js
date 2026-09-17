export function formatPartialDate(dateInfo) {
  if (!dateInfo) return '';
  if (dateInfo.date) return dateInfo.date;
  if (dateInfo.year) return dateInfo.year;
  return '';
}

export function formatBirthYear(birth) {
  if (!birth) return 'unknown';
  if (birth.date) return birth.date.slice(0, 4);
  if (birth.year) return String(birth.year);
  return 'unknown';
}

export function primaryName(person) {
  const birthName = person.names.find((n) => n.type === 'birth');
  return (birthName || person.names[0])?.value || 'Unknown';
}

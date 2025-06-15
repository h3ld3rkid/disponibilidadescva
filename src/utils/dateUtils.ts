
// Feriados fixos em Portugal (formato MM-DD)
const FIXED_HOLIDAYS = [
  '01-01', // Ano Novo
  '04-25', // Dia da Liberdade
  '05-01', // Dia do Trabalhador
  '06-10', // Dia de Portugal
  '08-15', // Assunção de Nossa Senhora
  '10-05', // Implantação da República
  '11-01', // Todos os Santos
  '12-01', // Restauração da Independência
  '12-08', // Imaculada Conceição
  '12-25', // Natal
];

export const isWeekend = (date: string): boolean => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Domingo = 0, Sábado = 6
};

export const isHoliday = (date: string): boolean => {
  const dateObj = new Date(date);
  const monthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  return FIXED_HOLIDAYS.includes(monthDay);
};

export const isWeekendOrHoliday = (date: string): boolean => {
  return isWeekend(date) || isHoliday(date);
};

export const getDayType = (date: string): 'weekday' | 'weekend' | 'holiday' => {
  if (isHoliday(date)) return 'holiday';
  if (isWeekend(date)) return 'weekend';
  return 'weekday';
};

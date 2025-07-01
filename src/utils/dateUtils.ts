
// Feriados fixos em Portugal (formato MM-DD)
const FIXED_HOLIDAYS = [
  '01-01', // Ano Novo
  '04-25', // Dia da Liberdade
  '05-01', // Dia do Trabalhador
  '06-10', // Dia de Portugal
  '06-13', // Santo António (Lisboa)
  '06-24', // São João (Porto)
  '06-29', // São Pedro
  '08-15', // Assunção de Nossa Senhora
  '10-05', // Implantação da República
  '11-01', // Todos os Santos
  '12-01', // Restauração da Independência
  '12-08', // Imaculada Conceição
  '12-25', // Natal
];

// Função para calcular a Páscoa (algoritmo de Anonymous Gregorian)
const calculateEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Função para obter feriados móveis para um ano específico
const getMobileHolidays = (year: number): string[] => {
  const easter = calculateEaster(year);
  const holidays = [];
  
  // Carnaval (47 dias antes da Páscoa)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  holidays.push(`${String(carnival.getMonth() + 1).padStart(2, '0')}-${String(carnival.getDate()).padStart(2, '0')}`);
  
  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push(`${String(goodFriday.getMonth() + 1).padStart(2, '0')}-${String(goodFriday.getDate()).padStart(2, '0')}`);
  
  // Domingo de Páscoa
  holidays.push(`${String(easter.getMonth() + 1).padStart(2, '0')}-${String(easter.getDate()).padStart(2, '0')}`);
  
  // Corpo de Deus (60 dias depois da Páscoa)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push(`${String(corpusChristi.getMonth() + 1).padStart(2, '0')}-${String(corpusChristi.getDate()).padStart(2, '0')}`);
  
  return holidays;
};

export const isWeekend = (date: string): boolean => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Domingo = 0, Sábado = 6
};

export const isHoliday = (date: string): boolean => {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const monthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  
  // Verificar feriados fixos
  if (FIXED_HOLIDAYS.includes(monthDay)) {
    return true;
  }
  
  // Verificar feriados móveis
  const mobileHolidays = getMobileHolidays(year);
  return mobileHolidays.includes(monthDay);
};

export const isWeekendOrHoliday = (date: string): boolean => {
  return isWeekend(date) || isHoliday(date);
};

export const getDayType = (date: string): 'weekday' | 'weekend' | 'holiday' => {
  if (isHoliday(date)) return 'holiday';
  if (isWeekend(date)) return 'weekend';
  return 'weekday';
};

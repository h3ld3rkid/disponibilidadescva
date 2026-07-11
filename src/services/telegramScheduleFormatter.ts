// Format a submitted schedule into a Telegram HTML message.

export interface ScheduleSubmissionData {
  shifts?: string[];
  overnights?: string[];
  shiftNotes?: Record<string, string>;
  overnightNotes?: Record<string, string>;
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseDate(iso: string): Date | null {
  // Accept yyyy-mm-dd or yyyy-mm-ddTHH:MM
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDay(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm} (${WEEKDAYS[d.getDay()]})`;
}

function monthLabelFromKey(monthKey?: string): string {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatScheduleTelegramMessage(
  userName: string,
  monthKey: string | undefined,
  data: ScheduleSubmissionData,
  attemptNumber?: number,
): string {
  const shifts = [...(data.shifts || [])].sort();
  const overnights = [...(data.overnights || [])].sort();
  const shiftNotes = data.shiftNotes || {};
  const overnightNotes = data.overnightNotes || {};

  const lines: string[] = [];
  lines.push(`✅ <b>Escala Submetida com Sucesso!</b>`);
  lines.push('');
  lines.push(`👤 <b>Utilizador:</b> ${userName}`);
  if (monthKey) lines.push(`📅 <b>Mês:</b> ${monthLabelFromKey(monthKey)}`);
  if (attemptNumber) lines.push(`🔄 <b>Tentativa:</b> ${attemptNumber}ª`);
  lines.push('');

  if (shifts.length === 0 && overnights.length === 0) {
    lines.push('<i>Submissão vazia — nenhum dia selecionado.</i>');
    return lines.join('\n');
  }

  if (shifts.length > 0) {
    lines.push(`☀️ <b>Turnos (${shifts.length})</b>`);
    for (const iso of shifts) {
      const note = shiftNotes[iso];
      lines.push(`• ${formatDay(iso)}${note ? ` — <i>${note}</i>` : ''}`);
    }
    lines.push('');
  }

  if (overnights.length > 0) {
    lines.push(`🌙 <b>Pernoites (${overnights.length})</b>`);
    for (const iso of overnights) {
      const note = overnightNotes[iso];
      lines.push(`• ${formatDay(iso)}${note ? ` — <i>${note}</i>` : ''}`);
    }
    lines.push('');
  }

  lines.push(`📊 <b>Total:</b> ${shifts.length + overnights.length} dia(s)`);
  return lines.join('\n').trimEnd();
}

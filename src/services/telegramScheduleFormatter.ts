// Format a submitted schedule into a Telegram HTML message.

export interface ScheduleSubmissionData {
  shifts?: string[];
  overnights?: string[];
  // Notes can be either a single free-text string (SimpleScheduleForm)
  // or a per-item map keyed by shift/overnight identifier (ScheduleCalendar).
  shiftNotes?: string | Record<string, string>;
  overnightNotes?: string | Record<string, string>;
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function capitalizeWord(w: string): string {
  if (!w) return w;
  return w.charAt(0).toLocaleUpperCase('pt-PT') + w.slice(1).toLocaleLowerCase('pt-PT');
}

// Turn keys like "Sábado_manhã" / "sabado_noite" / "Dom/Seg" into a
// friendly label: "Sábado Manhã", "Sábado Noite", "Dom/Seg".
function prettifyLabel(raw: string): string {
  if (!raw) return raw;
  if (raw.includes('/')) return raw; // overnight pair labels stay as-is
  return raw
    .split('_')
    .map(part => part.split(/\s+/).map(capitalizeWord).join(' '))
    .join(' ')
    .trim();
}

function formatItem(item: string): string {
  const d = parseDate(item);
  if (d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm} (${WEEKDAYS[d.getDay()]})`;
  }
  return prettifyLabel(item);
}

function monthLabelFromKey(monthKey?: string): string {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return `${MONTHS[m - 1]} ${y}`;
}

function noteFor(
  key: string,
  notes: string | Record<string, string> | undefined,
): string | undefined {
  if (!notes) return undefined;
  if (typeof notes === 'string') return undefined; // handled globally
  const v = notes[key];
  return v && v.trim() ? v.trim() : undefined;
}

export function formatScheduleTelegramMessage(
  userName: string,
  monthKey: string | undefined,
  data: ScheduleSubmissionData,
  attemptNumber?: number,
): string {
  const shifts = [...(data.shifts || [])].sort();
  const overnights = [...(data.overnights || [])].sort();

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
    for (const item of shifts) {
      const note = noteFor(item, data.shiftNotes);
      lines.push(`• ${formatItem(item)}${note ? ` — <i>${note}</i>` : ''}`);
    }
    lines.push('');
  }

  if (overnights.length > 0) {
    lines.push(`🌙 <b>Pernoites (${overnights.length})</b>`);
    for (const item of overnights) {
      const note = noteFor(item, data.overnightNotes);
      lines.push(`• ${formatItem(item)}${note ? ` — <i>${note}</i>` : ''}`);
    }
    lines.push('');
  }

  // Global observations (SimpleScheduleForm uses a single string field).
  const globalShiftNote =
    typeof data.shiftNotes === 'string' && data.shiftNotes.trim()
      ? data.shiftNotes.trim()
      : undefined;
  const globalOvernightNote =
    typeof data.overnightNotes === 'string' && data.overnightNotes.trim()
      ? data.overnightNotes.trim()
      : undefined;

  if (globalShiftNote || globalOvernightNote) {
    lines.push(`📝 <b>Observações</b>`);
    if (globalShiftNote) lines.push(globalShiftNote);
    if (globalOvernightNote) lines.push(globalOvernightNote);
    lines.push('');
  }

  lines.push(`📊 <b>Total:</b> ${shifts.length + overnights.length} dia(s)`);
  return lines.join('\n').trimEnd();
}

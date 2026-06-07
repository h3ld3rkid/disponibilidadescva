import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface CachedService {
  date: string; // DD/MM/YYYY
  startTime?: string;
  mechanographicNumber: string;
  isGray?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

function getShiftTimes(entry: CachedService) {
  const start = entry.startTime || (entry.isGray ? '20:00' : '08:00');
  const [shStr, smStr] = start.split(':');
  const sh = parseInt(shStr, 10);
  const sm = parseInt(smStr, 10);

  if (sh === 8 && sm === 0) return { startH: 8, startM: 0, endH: 13, endM: 0, crossDay: false, label: 'Serviço CVA' };
  if (sh === 13 && sm === 0) return { startH: 13, startM: 0, endH: 19, endM: 30, crossDay: false, label: 'Serviço CVA' };
  if (sh === 19 && sm === 30) return { startH: 19, startM: 30, endH: 23, endM: 59, crossDay: false, label: 'Serviço CVA' };
  if (sh === 0 && sm === 0) return { startH: 0, startM: 0, endH: 8, endM: 0, crossDay: false, label: 'Serviço CVA' };

  if (entry.isGray) {
    return { startH: sh || 20, startM: sm || 0, endH: 8, endM: 0, crossDay: true, label: 'Serviço Noturno CVA' };
  }
  return { startH: sh || 8, startM: sm || 0, endH: 20, endM: 0, crossDay: false, label: 'Serviço CVA' };
}

function formatIcsDate(dateStr: string, hour: number, min: number, addDay = 0): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]) + addDay);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(min)}00`;
}

function buildIcs(entries: CachedService[], userName: string): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cruz Vermelha Amares//Escalas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Serviços CVA - ${userName}`,
    'X-WR-TIMEZONE:Europe/Lisbon',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const entry of entries) {
    const t = getShiftTimes(entry);
    const dtStart = formatIcsDate(entry.date, t.startH, t.startM);
    const dtEnd = formatIcsDate(entry.date, t.endH, t.endM, t.crossDay ? 1 : 0);
    if (!dtStart || !dtEnd) continue;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.date.replace(/\//g, '')}-${t.startH}${t.startM}-${entry.mechanographicNumber}@cva`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Lisbon:${dtStart}`,
      `DTEND;TZID=Europe/Lisbon:${dtEnd}`,
      `SUMMARY:${t.label}`,
      `DESCRIPTION:Nº Mecanográfico: ${entry.mechanographicNumber}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Missing token', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('email, name, mechanographic_number')
      .eq('calendar_token', token)
      .maybeSingle();

    if (userErr || !user) {
      return new Response('Invalid token', { status: 404, headers: corsHeaders });
    }

    const { data: cache } = await supabase
      .from('user_service_cache')
      .select('services')
      .eq('user_email', user.email)
      .maybeSingle();

    const services: CachedService[] = (cache?.services as CachedService[]) || [];
    const ics = buildIcs(services, user.name || user.email);

    return new Response(ics, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="servicos-cva.ics"',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('calendar-feed error:', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});

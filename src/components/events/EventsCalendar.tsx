import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Pencil, Trash2, CalendarPlus } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, format,
  isSameMonth, isSameDay, differenceInCalendarDays, startOfDay,
} from 'date-fns';
import { pt } from 'date-fns/locale';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  created_by: string;
}

export const EVENT_CATEGORIES: Record<string, { label: string; dot: string; pill: string }> = {
  formacao: { label: 'Formação', dot: 'bg-blue-500', pill: 'bg-blue-100 text-blue-800 border-blue-200' },
  prevencao: { label: 'Prevenção', dot: 'bg-red-500', pill: 'bg-red-100 text-red-800 border-red-200' },
  simulacro: { label: 'Simulacro', dot: 'bg-orange-500', pill: 'bg-orange-100 text-orange-800 border-orange-200' },
  reuniao: { label: 'Reunião', dot: 'bg-yellow-500', pill: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  social: { label: 'Evento Social', dot: 'bg-green-500', pill: 'bg-green-100 text-green-800 border-green-200' },
  outro: { label: 'Outro', dot: 'bg-slate-500', pill: 'bg-slate-100 text-slate-800 border-slate-200' },
};
const cat = (c: string) => EVENT_CATEGORIES[c] || EVENT_CATEGORIES.outro;

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const parseDate = (s: string): Date | null => {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
};
const parseTime = (s: string): [number, number] | null => {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return [+m[1], +m[2]];
};

const emptyForm = { title: '', description: '', category: 'formacao', location: '', startDate: '', startTime: '', endDate: '', endTime: '', allDay: false };

const googleLink = (e: EventRow) => {
  const fmt = (d: Date, allDay: boolean) =>
    allDay ? format(d, 'yyyyMMdd') : d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const start = new Date(e.start_at);
  const end = e.all_day ? addDays(new Date(e.end_at), 1) : new Date(e.end_at);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: e.title,
    dates: `${fmt(start, e.all_day)}/${fmt(end, e.all_day)}`,
    details: e.description || '', location: e.location || '',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};

const eventCoversDay = (e: EventRow, day: Date) => {
  const s = startOfDay(new Date(e.start_at));
  const en = startOfDay(new Date(e.end_at));
  const d = startOfDay(day);
  return d >= s && d <= en;
};

const EventsCalendar: React.FC<{ isAdmin: boolean; userEmail: string }> = ({ isAdmin, userEmail }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [detail, setDetail] = useState<EventRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).from('events').select('*').order('start_at');
    if (error) { console.error(error); return; }
    setEvents((data || []) as EventRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const arr: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) arr.push(d);
    return arr;
  }, [month]);

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return events.filter(e => startOfDay(new Date(e.end_at)) >= today).slice(0, 6);
  }, [events]);

  const dayEvents = events.filter(e => eventCoversDay(e, selectedDay));

  const countdown = (e: EventRow) => {
    const n = differenceInCalendarDays(new Date(e.start_at), new Date());
    if (n <= 0) return 'A decorrer / Hoje';
    if (n === 1) return 'Amanhã';
    return `Daqui a ${n} dias`;
  };

  const timeLabel = (e: EventRow) => {
    const s = new Date(e.start_at), en = new Date(e.end_at);
    const sameDay = isSameDay(s, en);
    if (e.all_day) return sameDay ? 'Dia inteiro' : `${format(s, 'dd/MM')} – ${format(en, 'dd/MM')}`;
    return sameDay ? `${format(s, 'HH:mm')} – ${format(en, 'HH:mm')}` : `${format(s, 'dd/MM HH:mm')} – ${format(en, 'dd/MM HH:mm')}`;
  };

  const openNew = (day?: Date) => {
    const d = format(day || selectedDay, 'dd/MM/yyyy');
    setEditingId(null);
    setForm({ ...emptyForm, startDate: d, endDate: d });
    setFormOpen(true);
  };
  const openEdit = (e: EventRow) => {
    const s = new Date(e.start_at), en = new Date(e.end_at);
    setEditingId(e.id);
    setForm({
      title: e.title, description: e.description || '', category: e.category, location: e.location || '',
      startDate: format(s, 'dd/MM/yyyy'), endDate: format(en, 'dd/MM/yyyy'),
      startTime: e.all_day ? '' : format(s, 'HH:mm'), endTime: e.all_day ? '' : format(en, 'HH:mm'),
      allDay: e.all_day,
    });
    setDetail(null);
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast({ title: 'Indique o título', variant: 'destructive' });
    const sd = parseDate(form.startDate), ed = parseDate(form.endDate || form.startDate);
    if (!sd || !ed) return toast({ title: 'Datas inválidas', description: 'Use o formato dd/mm/aaaa', variant: 'destructive' });
    let start = sd, end = ed;
    if (!form.allDay) {
      const st = parseTime(form.startTime), et = parseTime(form.endTime || form.startTime);
      if (!st || !et) return toast({ title: 'Horas inválidas', description: 'Use o formato hh:mm', variant: 'destructive' });
      start = new Date(sd); start.setHours(st[0], st[1]);
      end = new Date(ed); end.setHours(et[0], et[1]);
    }
    if (end < start) return toast({ title: 'A data de fim é anterior ao início', variant: 'destructive' });
    setSaving(true);
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null, category: form.category,
      location: form.location.trim() || null, start_at: start.toISOString(), end_at: end.toISOString(), all_day: form.allDay,
    };
    const q = (supabase as any).from('events');
    const { error } = editingId
      ? await q.update(payload).eq('id', editingId)
      : await q.insert({ ...payload, created_by: userEmail });
    setSaving(false);
    if (error) return toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
    toast({ title: editingId ? 'Evento atualizado' : 'Evento criado' });
    setFormOpen(false);
    load();
  };

  const remove = async (e: EventRow) => {
    if (!confirm(`Apagar o evento "${e.title}"?`)) return;
    const { error } = await (supabase as any).from('events').delete().eq('id', e.id);
    if (error) return toast({ title: 'Erro ao apagar', variant: 'destructive' });
    toast({ title: 'Evento apagado' });
    setDetail(null);
    load();
  };

  return (
    <div className="container mx-auto px-0 sm:px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-semibold">Eventos</h2>
        {isAdmin && <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" />Novo Evento</Button>}
      </div>

      {/* Próximos eventos */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Próximos Eventos</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Não há eventos agendados.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(e => {
                const s = new Date(e.start_at);
                return (
                  <button key={e.id} onClick={() => setDetail(e)}
                    className="flex gap-3 text-left rounded-xl border bg-card p-3 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 text-primary px-3 py-2 min-w-[60px]">
                      <span className="text-2xl font-bold leading-none">{format(s, 'dd')}</span>
                      <span className="text-xs uppercase">{format(s, 'MMM', { locale: pt })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{timeLabel(e)}</div>
                      {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{e.location}</div>}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat(e.category).pill}`}>{cat(e.category).label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{countdown(e)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendário */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg capitalize">{format(month, 'MMMM yyyy', { locale: pt })}</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelectedDay(new Date()); }}>Hoje</Button>
              <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
            {WEEKDAYS.map(w => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t">
            {days.map(day => {
              const evs = events.filter(e => eventCoversDay(e, day));
              const isToday = isSameDay(day, new Date());
              const isSel = isSameDay(day, selectedDay);
              return (
                <div key={day.toISOString()} onClick={() => setSelectedDay(day)}
                  className={`border-r border-b min-h-[56px] sm:min-h-[100px] p-1 cursor-pointer transition-colors ${isSameMonth(day, month) ? '' : 'bg-muted/40 text-muted-foreground'} ${isSel ? 'bg-primary/5' : 'hover:bg-muted/60'}`}>
                  <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}`}>{format(day, 'd')}</div>
                  {/* Telemóvel: pontos */}
                  <div className="flex gap-0.5 flex-wrap mt-1 sm:hidden">
                    {evs.slice(0, 4).map(e => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${cat(e.category).dot}`} />)}
                  </div>
                  {/* Ecrãs maiores: etiquetas */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-1">
                    {evs.slice(0, 3).map(e => (
                      <button key={e.id} onClick={(ev) => { ev.stopPropagation(); setDetail(e); }}
                        className={`text-[11px] truncate text-left px-1.5 py-0.5 rounded border ${cat(e.category).pill}`}>
                        {!e.all_day && isSameDay(new Date(e.start_at), day) && <span className="font-semibold mr-1">{format(new Date(e.start_at), 'HH:mm')}</span>}
                        {e.title}
                      </button>
                    ))}
                    {evs.length > 3 && <span className="text-[10px] text-muted-foreground">+{evs.length - 3} mais</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(EVENT_CATEGORIES).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${v.dot}`} />{v.label}</span>
            ))}
          </div>

          {/* Eventos do dia selecionado */}
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium capitalize">{format(selectedDay, "EEEE, d 'de' MMMM", { locale: pt })}</h3>
              {isAdmin && <Button size="sm" variant="ghost" onClick={() => openNew(selectedDay)}><Plus className="h-4 w-4" /></Button>}
            </div>
            {dayEvents.length === 0 ? <p className="text-sm text-muted-foreground">Sem eventos neste dia.</p> : (
              <div className="space-y-2">
                {dayEvents.map(e => (
                  <button key={e.id} onClick={() => setDetail(e)} className="w-full flex items-center gap-2 text-left rounded-lg border p-2 hover:bg-muted/50">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cat(e.category).dot}`} />
                    <span className="font-medium truncate flex-1">{e.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeLabel(e)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detalhe */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          {detail && (<>
            <DialogHeader>
              <DialogTitle>{detail.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${cat(detail.category).pill}`}>{cat(detail.category).label}</span>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{format(new Date(detail.start_at), 'dd/MM/yyyy')} · {timeLabel(detail)}</div>
              {detail.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{detail.location}</div>}
              {detail.description && <p className="whitespace-pre-wrap text-muted-foreground">{detail.description}</p>}
            </div>
            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              <Button variant="outline" asChild>
                <a href={googleLink(detail)} target="_blank" rel="noreferrer"><CalendarPlus className="h-4 w-4 mr-1" />Google Calendar</a>
              </Button>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(detail)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="icon" onClick={() => remove(detail)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Formulário admin */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(EVENT_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="allday" checked={form.allDay} onCheckedChange={c => setForm({ ...form, allDay: !!c })} />
              <Label htmlFor="allday">Dia inteiro</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data início</Label><Input placeholder="dd/mm/aaaa" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
              {!form.allDay && <div><Label>Hora início</Label><Input placeholder="hh:mm" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>}
              <div><Label>Data fim</Label><Input placeholder="dd/mm/aaaa" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              {!form.allDay && <div><Label>Hora fim</Label><Input placeholder="hh:mm" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>}
            </div>
            <div><Label>Local</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsCalendar;

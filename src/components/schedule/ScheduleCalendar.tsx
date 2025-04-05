import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isSaturday, isSunday, isAfter, isBefore, startOfMonth, endOfMonth, addMonths, getDate, getMonth, getYear } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabaseService } from "@/services/supabaseService";

interface ScheduleCalendarProps {
  userEmail: string;
  isAdmin?: boolean;
}

type ShiftType = 'manha' | 'tarde' | 'noite' | 'nenhum';

interface DaySchedule {
  date: Date;
  shifts: {
    manha: boolean;
    tarde: boolean;
    noite: boolean;
  };
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail, isAdmin = false }) => {
  const [selectedMonth] = useState<Date>(addMonths(new Date(), 1));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [editCount, setEditCount] = useState<number>(0);
  const [savedSchedule, setSavedSchedule] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { toast } = useToast();
  
  const today = new Date();
  const currentMonth = getMonth(today);
  const currentYear = getYear(today);
  const currentDay = getDate(today);
  
  const nextMonth = addMonths(new Date(currentYear, currentMonth, 1), 1);
  
  const isPastDeadline = currentDay > 15;
  
  const canEditNextMonthSchedule = isAdmin || (!isPastDeadline && editCount < 2);

  useEffect(() => {
    const storedEditCount = localStorage.getItem(`editCount_${userEmail}_${format(nextMonth, 'MMMM-yyyy', { locale: pt })}`);
    if (storedEditCount) {
      setEditCount(parseInt(storedEditCount));
    }
  }, [userEmail, nextMonth]);

  useEffect(() => {
    const storedSchedules = localStorage.getItem('userSchedules');
    if (!storedSchedules) return;
    
    try {
      const parsedSchedules = JSON.parse(storedSchedules);
      const userSchedule = parsedSchedules.find((s: any) => 
        s.email === userEmail && s.month === format(nextMonth, 'MMMM yyyy', { locale: pt })
      );
      
      if (userSchedule) {
        const dates: Date[] = [];
        const scheduleItems: DaySchedule[] = [];
        
        userSchedule.dates.forEach((item: any) => {
          const date = new Date(item.date);
          dates.push(date);
          
          scheduleItems.push({
            date,
            shifts: {
              manha: item.shifts.includes('manha'),
              tarde: item.shifts.includes('tarde'),
              noite: item.shifts.includes('noite')
            }
          });
        });
        
        setSelectedDates(dates);
        setSchedule(scheduleItems);
        setSavedSchedule(true);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  }, [userEmail, nextMonth]);

  const handleDateSelect = useCallback((days: Date[] | undefined) => {
    if (!days) return;
    
    if (!canEditNextMonthSchedule) {
      toast({
        title: "Não é possível editar",
        description: isPastDeadline && !isAdmin
          ? `Hoje é dia ${currentDay} e já não é permitido inserir a escala para o próximo mês.`
          : "Só é permitido editar a escala 2 vezes por mês.",
        variant: "destructive",
      });
      return;
    }
    
    const previousDateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'));
    const newDates = days.filter(day => !previousDateStrings.includes(format(day, 'yyyy-MM-dd')));
    const removedDates = selectedDates.filter(day => !days.some(d => format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')));
    
    if (removedDates.length > 0) {
      setSchedule(prev => prev.filter(item => 
        !removedDates.some(d => format(d, 'yyyy-MM-dd') === format(item.date, 'yyyy-MM-dd'))
      ));
    }
    
    if (newDates.length > 0) {
      const newScheduleItems = newDates.map(date => {
        const isSat = isSaturday(date);
        const isSun = isSunday(date);
        
        return {
          date,
          shifts: {
            manha: true,
            tarde: isSat || isSun,
            noite: isSat
          }
        };
      });
      
      setSchedule(prev => [...prev, ...newScheduleItems]);
      
      if (newDates.length === 1) {
        const newDate = newDates[0];
        if (isSaturday(newDate) || isSunday(newDate)) {
          setSelectedDay(newDate);
        }
      }
    }
    
    setSelectedDates(days);
    setSavedSchedule(false);
  }, [selectedDates, canEditNextMonthSchedule, isPastDeadline, isAdmin, currentDay, toast]);

  const handleShiftChange = (date: Date, shift: keyof DaySchedule['shifts'], checked: boolean) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      const dayIndex = newSchedule.findIndex(d => format(d.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
      
      if (dayIndex >= 0) {
        newSchedule[dayIndex].shifts[shift] = checked;
      }
      
      return newSchedule;
    });
    setSavedSchedule(false);
  };

  const handleSaveSchedule = async () => {
    if (!isAdmin && isPastDeadline) {
      toast({
        title: "Não é possível salvar",
        description: `Hoje é dia ${currentDay} e já não é permitido inserir a escala para o próximo mês.`,
        variant: "destructive",
      });
      return;
    }

    if (!isAdmin && editCount >= 2) {
      toast({
        title: "Limite de edições excedido",
        description: "Só é permitido editar a escala 2 vezes por mês.",
        variant: "destructive",
      });
      return;
    }

    try {
      const existingSchedules = localStorage.getItem('userSchedules') ? 
        JSON.parse(localStorage.getItem('userSchedules') || '[]') : [];
      
      const monthKey = format(nextMonth, 'MMMM yyyy', { locale: pt });
      const userScheduleData = {
        user: userEmail,
        email: userEmail,
        month: monthKey,
        dates: schedule.map(item => ({
          date: item.date,
          shifts: Object.entries(item.shifts)
            .filter(([_, isSelected]) => isSelected)
            .map(([shiftName]) => shiftName)
        }))
      };
      
      const userIndex = existingSchedules.findIndex((s: any) => 
        s.email === userEmail && s.month === monthKey
      );
      
      if (userIndex >= 0) {
        existingSchedules[userIndex] = userScheduleData;
      } else {
        existingSchedules.push(userScheduleData);
      }
      
      localStorage.setItem('userSchedules', JSON.stringify(existingSchedules));
      
      const newEditCount = editCount + 1;
      setEditCount(newEditCount);
      
      localStorage.setItem(`editCount_${userEmail}_${format(nextMonth, 'MMMM-yyyy', { locale: pt })}`, String(newEditCount));
      
      setSavedSchedule(true);
      
      await supabaseService.saveUserSchedule(userEmail, userScheduleData);
      
      toast({
        title: "Escala guardada",
        description: "A sua escala foi guardada com sucesso.",
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Erro ao guardar",
        description: "Ocorreu um erro ao guardar a escala.",
        variant: "destructive",
      });
    }
  };

  const renderDayContent = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const daySchedule = schedule.find(d => format(d.date, 'yyyy-MM-dd') === dateStr);
    
    if (isSelected) {
      return (
        <div 
          className="w-full h-full flex items-center justify-center relative cursor-pointer bg-[#6E59A5] text-white rounded-md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isSaturday(date) || isSunday(date)) {
              setSelectedDay(date);
            }
          }}
        >
          <span className="text-xs md:text-sm">{date.getDate()}</span>
          <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5">
            {daySchedule?.shifts.manha && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full"></div>}
            {daySchedule?.shifts.tarde && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-500 rounded-full"></div>}
            {daySchedule?.shifts.noite && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full"></div>}
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-xs md:text-sm">{date.getDate()}</span>
      </div>
    );
  };

  const handleDayClick = (date: Date) => {
    if (isSaturday(date) || isSunday(date)) {
      if (selectedDates.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))) {
        setSelectedDay(date);
      }
    }
  };

  return (
    <div className="w-full px-4 py-6">
      {isPastDeadline && !isAdmin && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Hoje é dia {currentDay} e como tal já não é permitido inserir a escala para o próximo mês.
          </AlertDescription>
        </Alert>
      )}
      
      {isAdmin && isPastDeadline && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-700">Modo Administrador</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Você está no modo administrador e pode editar a escala mesmo após o dia 15.
          </AlertDescription>
        </Alert>
      )}

      <div className="w-full flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-2/3">
          <CardHeader className="pb-2">
            <CardTitle>Calendário de Escalas</CardTitle>
            <CardDescription>Selecione os dias que pretende trabalhar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col w-full">
              <Calendar
                mode="multiple"
                month={nextMonth}
                onMonthChange={() => {}}
                selected={selectedDates}
                onSelect={handleDateSelect}
                locale={pt}
                disabled={(date) => {
                  return !isAfter(date, endOfMonth(today)) || 
                         !isBefore(date, startOfMonth(addMonths(nextMonth, 1)));
                }}
                className="w-full mx-auto rounded-lg shadow-sm"
                classNames={{
                  caption: 'hidden',
                  table: 'w-full border-collapse border-spacing-0',
                  head_cell: 'text-center font-medium text-gray-700 px-1 py-2 bg-gray-200 text-xs md:text-sm border-b border-gray-300',
                  cell: 'text-center p-0 relative border border-gray-200 h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 aspect-square',
                  day: 'h-full w-full flex items-center justify-center',
                  row: 'flex w-full mt-0',
                  head_row: 'flex w-full',
                  month: 'w-full max-w-full',
                  months: 'w-full max-w-full',
                }}
                defaultMonth={nextMonth}
                weekStartsOn={1}
              />
              
              <div className="mt-6 w-full flex justify-center">
                <div className="flex flex-wrap gap-4 items-center mb-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Manhã</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Tarde (Sábado/Domingo)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Noite (Sábado)</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleSaveSchedule} 
                  className="w-64 bg-[#6E59A5] hover:bg-[#9b87f5] text-lg py-6"
                  disabled={(!canEditNextMonthSchedule || selectedDates.length === 0) && !isAdmin}
                >
                  Guardar Escala
                </Button>
              </div>
              
              {!isAdmin && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Edições realizadas: {editCount}/2
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {selectedDay && (isSaturday(selectedDay) || isSunday(selectedDay)) && (
          <Card className="w-full md:w-1/3">
            <CardHeader>
              <CardTitle>Turnos para {format(selectedDay, "EEEE, d 'de' MMMM", { locale: pt })}</CardTitle>
              <CardDescription>Selecione os turnos que pretende trabalhar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`manha-${format(selectedDay, 'yyyy-MM-dd')}`} 
                    checked={schedule.find(d => format(d.date, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd'))?.shifts.manha}
                    onCheckedChange={(checked) => handleShiftChange(selectedDay, 'manha', checked === true)}
                    disabled={!canEditNextMonthSchedule}
                    className="w-5 h-5"
                  />
                  <Label htmlFor={`manha-${format(selectedDay, 'yyyy-MM-dd')}`} className="text-base">Manhã</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`tarde-${format(selectedDay, 'yyyy-MM-dd')}`} 
                    checked={schedule.find(d => format(d.date, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd'))?.shifts.tarde}
                    onCheckedChange={(checked) => handleShiftChange(selectedDay, 'tarde', checked === true)}
                    disabled={!canEditNextMonthSchedule}
                    className="w-5 h-5"
                  />
                  <Label htmlFor={`tarde-${format(selectedDay, 'yyyy-MM-dd')}`} className="text-base">
                    Tarde
                  </Label>
                </div>
                
                {isSaturday(selectedDay) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`noite-${format(selectedDay, 'yyyy-MM-dd')}`} 
                      checked={schedule.find(d => format(d.date, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd'))?.shifts.noite}
                      onCheckedChange={(checked) => handleShiftChange(selectedDay, 'noite', checked === true)}
                      disabled={!canEditNextMonthSchedule}
                      className="w-5 h-5"
                    />
                    <Label htmlFor={`noite-${format(selectedDay, 'yyyy-MM-dd')}`} className="text-base">
                      Noite
                    </Label>
                  </div>
                )}
                
                <div className="pt-4">
                  <Button 
                    onClick={() => setSelectedDay(null)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScheduleCalendar;

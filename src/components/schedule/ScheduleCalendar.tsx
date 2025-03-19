
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isSaturday, isSunday, isAfter, isBefore, startOfMonth, endOfMonth, addMonths, getDate, getMonth, getYear } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ScheduleCalendarProps {
  userEmail: string;
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

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail }) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(addMonths(new Date(), 1));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [editCount, setEditCount] = useState<number>(0);
  const [savedSchedule, setSavedSchedule] = useState<boolean>(false);
  const { toast } = useToast();

  const today = new Date();
  const currentMonth = getMonth(today);
  const currentYear = getYear(today);
  const currentDay = getDate(today);
  
  const nextMonth = addMonths(new Date(currentYear, currentMonth, 1), 1);
  
  const isPastDeadline = currentDay > 15;
  
  const canEditNextMonthSchedule = !isPastDeadline && editCount < 2;

  // Force the calendar to always show next month only
  useEffect(() => {
    setSelectedMonth(nextMonth);
  }, []);

  // Updated to handle Date[] parameter instead of single Date
  const handleDateSelect = (days: Date[] | undefined) => {
    if (!days) return;
    
    if (!canEditNextMonthSchedule) {
      toast({
        title: "Não é possível editar",
        description: isPastDeadline
          ? `Hoje é dia ${currentDay} e já não é permitido inserir a escala para o próximo mês.`
          : "Só é permitido editar a escala 2 vezes por mês.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the most recently selected date (the difference between current days and previous selectedDates)
    const previousDateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'));
    const newDates = days.filter(day => !previousDateStrings.includes(format(day, 'yyyy-MM-dd')));
    const removedDates = selectedDates.filter(day => !days.some(d => format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')));
    
    // If a date was removed, update the schedule
    if (removedDates.length > 0) {
      setSchedule(prev => prev.filter(item => 
        !removedDates.some(d => format(d, 'yyyy-MM-dd') === format(item.date, 'yyyy-MM-dd'))
      ));
    }
    
    // If new dates were added, add them to the schedule
    if (newDates.length > 0) {
      const newScheduleItems = newDates.map(date => {
        const isSat = isSaturday(date);
        const isSun = isSunday(date);
        
        return {
          date,
          shifts: {
            manha: true, // Default to morning shift
            tarde: isSat, // Afternoon only for Saturday
            noite: isSat || isSun // Night for Saturday and Sunday
          }
        };
      });
      
      setSchedule(prev => [...prev, ...newScheduleItems]);
    }
    
    // Update the selectedDates state with the complete new selection
    setSelectedDates(days);
  };

  const handleShiftChange = (date: Date, shift: keyof DaySchedule['shifts'], checked: boolean) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      const dayIndex = newSchedule.findIndex(d => format(d.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
      
      if (dayIndex >= 0) {
        newSchedule[dayIndex].shifts[shift] = checked;
      }
      
      return newSchedule;
    });
  };

  const handleSaveSchedule = () => {
    if (isPastDeadline) {
      toast({
        title: "Não é possível salvar",
        description: `Hoje é dia ${currentDay} e já não é permitido inserir a escala para o próximo mês.`,
        variant: "destructive",
      });
      return;
    }

    if (editCount >= 2) {
      toast({
        title: "Limite de edições excedido",
        description: "Só é permitido editar a escala 2 vezes por mês.",
        variant: "destructive",
      });
      return;
    }

    console.log('Saving schedule:', schedule);
    
    setEditCount(prev => prev + 1);
    setSavedSchedule(true);
    
    toast({
      title: "Escala guardada",
      description: "A sua escala foi guardada com sucesso.",
    });
  };

  const renderDayContent = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const daySchedule = schedule.find(d => format(d.date, 'yyyy-MM-dd') === dateStr);
    
    // Special handling for Saturday and Sunday
    if ((isSaturday(date) || isSunday(date)) && isSelected) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <div className={`w-full h-full flex items-center justify-center relative ${isSelected ? 'cursor-pointer' : ''}`}>
              <div className="absolute top-0 right-1 flex flex-col gap-1">
                {daySchedule?.shifts.manha && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                {daySchedule?.shifts.tarde && isSaturday(date) && <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>}
                {daySchedule?.shifts.noite && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
              </div>
              {date.getDate()}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="center">
            <div className="space-y-2">
              <h4 className="font-medium text-center mb-2">Turnos para {format(date, "EEEE, d", { locale: pt })}</h4>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`manha-${dateStr}`} 
                    checked={daySchedule?.shifts.manha}
                    onCheckedChange={(checked) => handleShiftChange(date, 'manha', checked === true)}
                    disabled={!canEditNextMonthSchedule}
                  />
                  <Label htmlFor={`manha-${dateStr}`}>Manhã</Label>
                </div>
                
                {isSaturday(date) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`tarde-${dateStr}`} 
                      checked={daySchedule?.shifts.tarde}
                      onCheckedChange={(checked) => handleShiftChange(date, 'tarde', checked === true)}
                      disabled={!canEditNextMonthSchedule}
                    />
                    <Label htmlFor={`tarde-${dateStr}`}>Tarde</Label>
                  </div>
                )}
                
                {(isSaturday(date) || isSunday(date)) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`noite-${dateStr}`} 
                      checked={daySchedule?.shifts.noite}
                      onCheckedChange={(checked) => handleShiftChange(date, 'noite', checked === true)}
                      disabled={!canEditNextMonthSchedule}
                    />
                    <Label htmlFor={`noite-${dateStr}`}>Noite</Label>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    
    // For regular days just show a dot if selected
    return (
      <div className="w-full h-full flex items-center justify-center relative">
        {isSelected && <div className="absolute top-0 right-1 w-2 h-2 bg-green-500 rounded-full"></div>}
        {date.getDate()}
      </div>
    );
  };

  return (
    <div className="w-full px-2 py-4">
      {isPastDeadline && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Hoje é dia {currentDay} e como tal já não é permitido inserir a escala para o próximo mês.
          </AlertDescription>
        </Alert>
      )}

      <div className="w-full">
        <Card className="w-full">
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
                  // Only allow dates in the next month
                  return !isAfter(date, endOfMonth(today)) || 
                         !isBefore(date, startOfMonth(addMonths(nextMonth, 1)));
                }}
                className="w-full mx-auto rounded-lg pointer-events-auto"
                components={{
                  Day: ({ date, ...props }) => (
                    <button
                      {...props}
                      className={`h-full w-full p-2 flex items-center justify-center rounded-md hover:bg-gray-100 
                        ${selectedDates.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) 
                          ? 'bg-[#6E59A5] text-white hover:bg-[#9b87f5]' 
                          : ''}
                        ${isSaturday(date) || isSunday(date) ? 'font-bold' : ''}
                      `}
                    >
                      {renderDayContent(date)}
                    </button>
                  ),
                }}
                styles={{
                  caption: { fontSize: '1.5rem', marginBottom: '1rem' },
                  day: { fontSize: '1.2rem', margin: '0.25rem', height: '3.5rem', width: '3.5rem' },
                  head_cell: { fontSize: '1.1rem', paddingBottom: '0.75rem', color: '#403E43' }
                }}
                defaultMonth={nextMonth}
                weekStartsOn={1} // Start from Monday
              />
              
              <div className="mt-8 w-full flex justify-center">
                <div className="flex gap-4 items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Manhã</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Tarde (Sábado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Noite (Sábado e Domingo)</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <Button 
                  onClick={handleSaveSchedule} 
                  className="w-64 bg-[#6E59A5] hover:bg-[#9b87f5] text-lg py-6"
                  disabled={!canEditNextMonthSchedule || savedSchedule || selectedDates.length === 0}
                >
                  Guardar Escala
                </Button>
              </div>
              
              {editCount > 0 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Edições realizadas: {editCount}/2
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScheduleCalendar;

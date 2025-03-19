
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isSaturday, isSunday, isAfter, isBefore, startOfMonth, endOfMonth, addMonths, getDate, getMonth, getYear } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ScheduleCalendarProps {
  userEmail: string;
}

type ShiftType = 'manha' | 'tarde' | 'noite' | 'nenhum';

interface ScheduleData {
  date: Date;
  shifts: {
    manha?: boolean;
    tarde?: boolean;
    noite?: boolean;
  };
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail }) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(addMonths(new Date(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [schedule, setSchedule] = useState<ScheduleData[]>([]);
  const [currentShifts, setCurrentShifts] = useState<{ manha: boolean; tarde: boolean; noite: boolean }>({
    manha: false,
    tarde: false,
    noite: false
  });
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

  useEffect(() => {
    if (selectedDate) {
      const existingSchedule = schedule.find(item => 
        format(item.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      );

      if (existingSchedule) {
        setCurrentShifts({
          manha: existingSchedule.shifts.manha || false,
          tarde: existingSchedule.shifts.tarde || false,
          noite: existingSchedule.shifts.noite || false
        });
      } else {
        setCurrentShifts({ manha: false, tarde: false, noite: false });
      }
    }
  }, [selectedDate, schedule]);

  const handleShiftChange = (shift: keyof typeof currentShifts, value: boolean) => {
    setCurrentShifts(prev => ({ ...prev, [shift]: value }));
    
    const updatedSchedule = [...schedule];
    const scheduleIndex = updatedSchedule.findIndex(item => 
      format(item.date, 'yyyy-MM-dd') === format(selectedDate!, 'yyyy-MM-dd')
    );

    if (scheduleIndex >= 0) {
      updatedSchedule[scheduleIndex].shifts[shift] = value;
    } else {
      updatedSchedule.push({
        date: selectedDate!,
        shifts: { ...{ manha: false, tarde: false, noite: false }, [shift]: value }
      });
    }

    setSchedule(updatedSchedule);
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

  const renderDateContent = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dateSchedule = schedule.find(item => format(item.date, 'yyyy-MM-dd') === dateKey);
    
    const hasShift = dateSchedule && (dateSchedule.shifts.manha || dateSchedule.shifts.tarde || dateSchedule.shifts.noite);
    
    return hasShift ? (
      <div className="relative w-full h-full">
        <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></div>
      </div>
    ) : null;
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Calendário de Escalas</CardTitle>
            <CardDescription>Selecione os dias que pretende trabalhar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                month={nextMonth}
                onMonthChange={() => {}} // Disabled month change to keep only next month
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={pt}
                disabled={(date) => {
                  // Only allow dates in the next month
                  return !isAfter(date, endOfMonth(today)) || 
                         !isBefore(date, startOfMonth(addMonths(nextMonth, 1)));
                }}
                className="w-full max-w-[800px] mx-auto rounded-lg pointer-events-auto"
                modifiersStyles={{
                  selected: { 
                    backgroundColor: '#6E59A5',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
                styles={{
                  caption: { fontSize: '1.25rem', marginBottom: '1rem' },
                  day: { fontSize: '1.1rem', margin: '0.15rem', height: '2.75rem', width: '2.75rem' },
                  head_cell: { fontSize: '1rem', paddingBottom: '0.75rem', color: '#403E43' }
                }}
                defaultMonth={nextMonth}
                weekStartsOn={1} // Start from Monday
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Turno</CardTitle>
            <CardDescription>
              {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt }) : "Selecione uma data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Turnos disponíveis:</h3>
                  
                  <div className="mb-4">
                    <label className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 w-5 h-5"
                        checked={currentShifts.manha}
                        onChange={(e) => handleShiftChange('manha', e.target.checked)}
                        disabled={!canEditNextMonthSchedule}
                      />
                      <span className="text-base">Manhã (08:00 - 16:00)</span>
                    </label>
                  </div>

                  {/* For Saturday, show all three shifts */}
                  {isSaturday(selectedDate) && (
                    <>
                      <div className="mb-4">
                        <label className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 w-5 h-5"
                            checked={currentShifts.tarde}
                            onChange={(e) => handleShiftChange('tarde', e.target.checked)}
                            disabled={!canEditNextMonthSchedule}
                          />
                          <span className="text-base">Tarde (16:00 - 00:00)</span>
                        </label>
                      </div>
                      <div className="mb-4">
                        <label className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 w-5 h-5"
                            checked={currentShifts.noite}
                            onChange={(e) => handleShiftChange('noite', e.target.checked)}
                            disabled={!canEditNextMonthSchedule}
                          />
                          <span className="text-base">Noite (00:00 - 08:00)</span>
                        </label>
                      </div>
                    </>
                  )}

                  {/* For Sunday, show morning and night shifts */}
                  {isSunday(selectedDate) && (
                    <>
                      <div className="mb-4">
                        <label className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 w-5 h-5"
                            checked={currentShifts.noite}
                            onChange={(e) => handleShiftChange('noite', e.target.checked)}
                            disabled={!canEditNextMonthSchedule}
                          />
                          <span className="text-base">Noite (00:00 - 08:00)</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSaveSchedule} 
                    className="w-full bg-[#6E59A5] hover:bg-[#9b87f5] text-lg py-6"
                    disabled={!canEditNextMonthSchedule || savedSchedule}
                  >
                    Guardar Escala
                  </Button>
                  {editCount > 0 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Edições realizadas: {editCount}/2
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Selecione uma data no calendário para ver os turnos disponíveis
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScheduleCalendar;

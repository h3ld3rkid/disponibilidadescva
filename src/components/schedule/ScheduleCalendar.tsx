
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isSaturday, isSunday, isAfter, isBefore, startOfMonth, endOfMonth, addMonths, getDate, getMonth, getYear } from "date-fns";
import { ptPT } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  
  // Check if it's past the 15th of the current month
  const isPastDeadline = currentDay > 15;
  
  // Can only edit schedule for next month before the 15th of current month
  const canEditNextMonthSchedule = !isPastDeadline && editCount < 2;

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

    // In a real implementation, this would save to a database
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
    <div className="container mx-auto px-4 py-8">
      {isPastDeadline && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Hoje é dia {currentDay} e como tal já não é permitido inserir a escala para o próximo mês.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Calendário de Escalas</CardTitle>
            <CardDescription>Selecione os dias que pretende trabalhar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Calendar
                mode="single"
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptPT}
                disabled={(date) => {
                  // Only allow selecting dates from the next month
                  return !isBefore(date, startOfMonth(addMonths(new Date(), 2))) || 
                         !isAfter(date, endOfMonth(today));
                }}
                className="pointer-events-auto"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Turno</CardTitle>
            <CardDescription>
              {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptPT }) : "Selecione uma data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Turnos disponíveis:</h3>
                  
                  {/* Morning shift */}
                  <div className="mb-2">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={currentShifts.manha}
                        onChange={(e) => handleShiftChange('manha', e.target.checked)}
                        disabled={!canEditNextMonthSchedule}
                      />
                      <span>Manhã (08:00 - 16:00)</span>
                    </label>
                  </div>

                  {/* Afternoon shift - Only available on Saturdays */}
                  {isSaturday(selectedDate) && (
                    <div className="mb-2">
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={currentShifts.tarde}
                          onChange={(e) => handleShiftChange('tarde', e.target.checked)}
                          disabled={!canEditNextMonthSchedule}
                        />
                        <span>Tarde (16:00 - 00:00)</span>
                      </label>
                    </div>
                  )}

                  {/* Night shift - Available on Saturday and Sunday */}
                  {(isSaturday(selectedDate) || isSunday(selectedDate)) && (
                    <div className="mb-2">
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={currentShifts.noite}
                          onChange={(e) => handleShiftChange('noite', e.target.checked)}
                          disabled={!canEditNextMonthSchedule}
                        />
                        <span>Noite (00:00 - 08:00)</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSaveSchedule} 
                    className="w-full"
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

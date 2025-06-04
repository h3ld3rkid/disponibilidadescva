
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface WeekdayCheckboxCalendarProps {
  selectedDates: Date[];
  onDateSelect: (dates: Date[]) => void;
  nextMonth: Date;
  disabled?: boolean;
  editCount?: number;
}

interface ShiftData {
  weekday: string;
  shift: string;
  date: Date;
}

const WeekdayCheckboxCalendar: React.FC<WeekdayCheckboxCalendarProps> = ({
  selectedDates,
  onDateSelect,
  nextMonth,
  disabled = false,
  editCount = 0
}) => {
  // Convert selectedDates to shift format for proper handling
  const getShiftDataFromDates = (): ShiftData[] => {
    const shiftData: ShiftData[] = [];
    
    selectedDates.forEach(date => {
      const dayOfWeek = date.getDay();
      const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const weekdayName = weekdayMap[dayOfWeek];
      
      // Extract shift information from the date (we'll store it in hours)
      const hour = date.getHours();
      
      if (weekdayName === 'sabado') {
        // Saturday: 8=morning, 14=afternoon, 20=night
        if (hour === 8) {
          shiftData.push({ weekday: weekdayName, shift: 'manha', date });
        } else if (hour === 14) {
          shiftData.push({ weekday: weekdayName, shift: 'tarde', date });
        } else if (hour === 20) {
          shiftData.push({ weekday: weekdayName, shift: 'noite', date });
        }
      } else if (weekdayName === 'domingo') {
        // Sunday: 8=morning, 20=night
        if (hour === 8) {
          shiftData.push({ weekday: weekdayName, shift: 'manha', date });
        } else if (hour === 20) {
          shiftData.push({ weekday: weekdayName, shift: 'noite', date });
        }
      } else {
        // Weekdays: 12=day shift
        if (hour === 12) {
          shiftData.push({ weekday: weekdayName, shift: 'dia', date });
        }
      }
    });
    
    return shiftData;
  };

  const handleShiftToggle = (weekday: string, shift: string, checked: boolean) => {
    if (disabled) return;

    let newDates = [...selectedDates];
    
    const weekdayIndex = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(weekday);
    
    if (checked) {
      // Add this specific shift
      const firstDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
      const daysToAdd = (weekdayIndex - firstDay.getDay() + 7) % 7;
      const shiftDate = new Date(firstDay);
      shiftDate.setDate(firstDay.getDate() + daysToAdd);
      
      // Set specific hour based on shift
      if (shift === 'manha') {
        shiftDate.setHours(8, 0, 0, 0);
      } else if (shift === 'tarde') {
        shiftDate.setHours(14, 0, 0, 0);
      } else if (shift === 'noite') {
        shiftDate.setHours(20, 0, 0, 0);
      } else if (shift === 'dia') {
        shiftDate.setHours(12, 0, 0, 0);
      }
      
      newDates.push(shiftDate);
    } else {
      // Remove this specific shift
      newDates = newDates.filter(date => {
        const dayOfWeek = date.getDay();
        const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const dateName = weekdayMap[dayOfWeek];
        const hour = date.getHours();
        
        if (dateName !== weekday) return true;
        
        if (shift === 'manha' && hour === 8) return false;
        if (shift === 'tarde' && hour === 14) return false;
        if (shift === 'noite' && hour === 20) return false;
        if (shift === 'dia' && hour === 12) return false;
        
        return true;
      });
    }

    onDateSelect(newDates);
  };

  const isShiftSelected = (weekday: string, shift: string): boolean => {
    const shiftData = getShiftDataFromDates();
    return shiftData.some(data => data.weekday === weekday && data.shift === shift);
  };

  // Count total selected shifts correctly
  const totalSelectedShifts = getShiftDataFromDates().length;

  const weekdays = [
    { name: 'segunda', label: 'Segunda-feira', shortLabel: '2ª', shifts: ['dia'] },
    { name: 'terca', label: 'Terça-feira', shortLabel: '3ª', shifts: ['dia'] },
    { name: 'quarta', label: 'Quarta-feira', shortLabel: '4ª', shifts: ['dia'] },
    { name: 'quinta', label: 'Quinta-feira', shortLabel: '5ª', shifts: ['dia'] },
    { name: 'sexta', label: 'Sexta-feira', shortLabel: '6ª', shifts: ['dia'] },
    { name: 'sabado', label: 'Sábado', shortLabel: 'Sáb', shifts: ['manha', 'tarde', 'noite'] },
    { name: 'domingo', label: 'Domingo', shortLabel: 'Dom', shifts: ['manha', 'noite'] },
  ];

  const shiftLabels = {
    dia: 'Dia Todo',
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite'
  };

  const canSubmitSchedule = editCount < 2;

  return (
    <div className="min-h-screen bg-white">
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="text-center border-b border-gray-200">
          <CardTitle className="text-2xl font-bold text-gray-800">
            🚑 Escala para {format(nextMonth, 'MMMM yyyy', { locale: pt })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {/* Submission info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-gray-700">
                <p className="text-sm font-medium">Submissões da escala</p>
                <p className="text-lg font-bold text-gray-900">{editCount} / 2</p>
              </div>
              {!canSubmitSchedule && (
                <div className="text-red-600 text-sm font-medium">
                  ⚠️ Limite de submissões atingido
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {weekdays.map((weekday) => (
              <div key={weekday.name} className="group">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    <span className="block text-2xl mb-1">{weekday.shortLabel}</span>
                    <span className="text-sm text-gray-600">{weekday.label}</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {weekday.shifts.map((shift) => (
                      <div 
                        key={`${weekday.name}-${shift}`} 
                        className="relative group/shift"
                      >
                        <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                          <Checkbox
                            id={`${weekday.name}-${shift}`}
                            checked={isShiftSelected(weekday.name, shift)}
                            onCheckedChange={(checked) => handleShiftToggle(weekday.name, shift, checked as boolean)}
                            disabled={disabled || !canSubmitSchedule}
                            className="h-6 w-6 border-2 border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          />
                          <Label 
                            htmlFor={`${weekday.name}-${shift}`} 
                            className="text-gray-800 font-medium cursor-pointer flex-1 ml-4 select-none"
                          >
                            {shiftLabels[shift as keyof typeof shiftLabels]}
                          </Label>
                          
                          {/* Indicator when selected */}
                          {isShiftSelected(weekday.name, shift) && (
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex justify-between items-center text-center">
              <div className="text-blue-700">
                <p className="text-sm font-medium">Total de turnos selecionados</p>
                <p className="text-2xl font-bold text-blue-900">{totalSelectedShifts}</p>
              </div>
              
              <div className="text-blue-700">
                <p className="text-sm font-medium">Mês de trabalho</p>
                <p className="text-lg font-semibold text-blue-900">
                  {format(nextMonth, 'MMMM yyyy', { locale: pt })}
                </p>
              </div>

              <div className="text-blue-700">
                <p className="text-sm font-medium">Submissões restantes</p>
                <p className="text-2xl font-bold text-blue-900">{Math.max(0, 2 - editCount)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeekdayCheckboxCalendar;

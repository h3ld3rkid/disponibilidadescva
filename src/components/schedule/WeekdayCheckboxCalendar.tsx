
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
  disabled = false
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

    const currentShiftData = getShiftDataFromDates();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="bg-gradient-to-br from-gray-900/95 to-purple-900/95 border-purple-500/20 backdrop-blur-sm">
        <CardHeader className="text-center border-b border-purple-500/20">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🚑 Escala para {format(nextMonth, 'MMMM yyyy', { locale: pt })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {weekdays.map((weekday) => (
              <div key={weekday.name} className="group">
                <div className="bg-gradient-to-br from-slate-800/80 to-purple-800/40 rounded-xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">
                    <span className="block text-2xl mb-1">{weekday.shortLabel}</span>
                    <span className="text-sm text-purple-300">{weekday.label}</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {weekday.shifts.map((shift) => (
                      <div 
                        key={`${weekday.name}-${shift}`} 
                        className="relative group/shift"
                      >
                        <div className="flex items-center p-4 bg-gradient-to-r from-slate-700/50 to-purple-700/30 rounded-lg border border-purple-500/20 hover:border-purple-400/40 transition-all duration-200 hover:shadow-md cursor-pointer">
                          <Checkbox
                            id={`${weekday.name}-${shift}`}
                            checked={isShiftSelected(weekday.name, shift)}
                            onCheckedChange={(checked) => handleShiftToggle(weekday.name, shift, checked as boolean)}
                            disabled={disabled}
                            className="h-6 w-6 border-2 border-purple-400 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                          />
                          <Label 
                            htmlFor={`${weekday.name}-${shift}`} 
                            className="text-white font-medium cursor-pointer flex-1 ml-4 select-none"
                          >
                            {shiftLabels[shift as keyof typeof shiftLabels]}
                          </Label>
                          
                          {/* Futuristic accent */}
                          <div className="w-2 h-2 bg-purple-400 rounded-full opacity-0 group-hover/shift:opacity-100 transition-opacity duration-200"></div>
                        </div>
                        
                        {/* Glow effect when selected */}
                        {isShiftSelected(weekday.name, shift) && (
                          <div className="absolute inset-0 bg-purple-500/10 rounded-lg animate-pulse pointer-events-none"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl border border-blue-500/30">
            <div className="flex justify-between items-center text-center">
              <div className="text-blue-300">
                <p className="text-sm font-medium">Total de turnos selecionados</p>
                <p className="text-2xl font-bold text-white">{selectedDates.length}</p>
              </div>
              
              <div className="text-purple-300">
                <p className="text-sm font-medium">Mês de trabalho</p>
                <p className="text-lg font-semibold text-white">
                  {format(nextMonth, 'MMMM yyyy', { locale: pt })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeekdayCheckboxCalendar;

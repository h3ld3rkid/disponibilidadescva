
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

interface ShiftSelection {
  weekday: string;
  shifts: string[];
}

const WeekdayCheckboxCalendar: React.FC<WeekdayCheckboxCalendarProps> = ({
  selectedDates,
  onDateSelect,
  nextMonth,
  disabled = false
}) => {
  // Convert selectedDates to shift format for display
  const getSelectedShifts = (): { [key: string]: string[] } => {
    const shifts: { [key: string]: string[] } = {
      'segunda': [],
      'terca': [],
      'quarta': [],
      'quinta': [],
      'sexta': [],
      'sabado': [],
      'domingo': [],
    };

    // Parse the stored dates to extract shift information
    selectedDates.forEach(date => {
      const dayOfWeek = date.getDay();
      const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const weekdayName = weekdayMap[dayOfWeek];
      
      // For now, assume all shifts are selected when a date is selected
      // This should be improved to store actual shift data
      if (weekdayName === 'sabado') {
        shifts[weekdayName] = ['manha', 'tarde', 'noite'];
      } else if (weekdayName === 'domingo') {
        shifts[weekdayName] = ['manha', 'noite'];
      } else {
        shifts[weekdayName] = ['dia'];
      }
    });

    return shifts;
  };

  const handleShiftToggle = (weekday: string, shift: string, checked: boolean) => {
    if (disabled) return;

    const selectedShifts = getSelectedShifts();
    const currentShifts = selectedShifts[weekday] || [];
    
    let newShifts: string[];
    if (checked) {
      // Add shift if not already present
      newShifts = [...currentShifts, shift].filter((value, index, self) => self.indexOf(value) === index);
    } else {
      // Remove shift
      newShifts = currentShifts.filter(s => s !== shift);
    }

    // Update the selected dates based on the new shifts
    const newSelectedDates = [...selectedDates];
    
    // Remove existing dates for this weekday
    const filteredDates = newSelectedDates.filter(date => {
      const dayOfWeek = date.getDay();
      const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      return weekdayMap[dayOfWeek] !== weekday;
    });
    
    // Add new dates if there are shifts selected
    if (newShifts.length > 0) {
      const weekdayIndex = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(weekday);
      // Find the first occurrence of this weekday in the next month
      const firstDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
      const daysToAdd = (weekdayIndex - firstDay.getDay() + 7) % 7;
      const representativeDate = new Date(firstDay);
      representativeDate.setDate(firstDay.getDate() + daysToAdd);
      filteredDates.push(representativeDate);
    }

    onDateSelect(filteredDates);
  };

  const isShiftSelected = (weekday: string, shift: string): boolean => {
    const selectedShifts = getSelectedShifts();
    return selectedShifts[weekday]?.includes(shift) || false;
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

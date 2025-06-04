
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths } from "date-fns";
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
  const getSelectedShifts = (): ShiftSelection[] => {
    const shifts: ShiftSelection[] = [
      { weekday: 'segunda', shifts: [] },
      { weekday: 'terca', shifts: [] },
      { weekday: 'quarta', shifts: [] },
      { weekday: 'quinta', shifts: [] },
      { weekday: 'sexta', shifts: [] },
      { weekday: 'sabado', shifts: [] },
      { weekday: 'domingo', shifts: [] },
    ];

    // For simplicity, we'll treat each selected date as representing all shifts for that day
    // In a real implementation, you might want to store shift information differently
    selectedDates.forEach(date => {
      const dayOfWeek = date.getDay();
      const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const weekdayName = weekdayMap[dayOfWeek];
      
      const shiftData = shifts.find(s => s.weekday === weekdayName);
      if (shiftData) {
        // For now, assume all shifts are selected when a date is selected
        if (weekdayName === 'sabado') {
          shiftData.shifts = ['manha', 'tarde', 'noite'];
        } else if (weekdayName === 'domingo') {
          shiftData.shifts = ['manha', 'noite'];
        } else {
          shiftData.shifts = ['dia']; // Weekdays have one shift
        }
      }
    });

    return shifts;
  };

  const handleShiftToggle = (weekday: string, shift: string, checked: boolean) => {
    if (disabled) return;

    // This is a simplified implementation
    // In a real app, you'd want to store shift data more granularly
    const newSelectedDates = [...selectedDates];
    
    if (checked) {
      // Add a representative date for this weekday if not already present
      const existingDate = newSelectedDates.find(date => {
        const dayOfWeek = date.getDay();
        const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        return weekdayMap[dayOfWeek] === weekday;
      });
      
      if (!existingDate) {
        // Create a representative date for this weekday in the next month
        const weekdayIndex = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(weekday);
        // Find the first occurrence of this weekday in the next month
        const firstDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
        const daysToAdd = (weekdayIndex - firstDay.getDay() + 7) % 7;
        const representativeDate = new Date(firstDay);
        representativeDate.setDate(firstDay.getDate() + daysToAdd);
        newSelectedDates.push(representativeDate);
      }
    } else {
      // Remove dates for this weekday
      const filteredDates = newSelectedDates.filter(date => {
        const dayOfWeek = date.getDay();
        const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        return weekdayMap[dayOfWeek] !== weekday;
      });
      newSelectedDates.length = 0;
      newSelectedDates.push(...filteredDates);
    }

    onDateSelect(newSelectedDates);
  };

  const isShiftSelected = (weekday: string, shift: string): boolean => {
    return selectedDates.some(date => {
      const dayOfWeek = date.getDay();
      const weekdayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      return weekdayMap[dayOfWeek] === weekday;
    });
  };

  const weekdays = [
    { name: 'segunda', label: 'Segunda-feira', shifts: ['dia'] },
    { name: 'terca', label: 'Terça-feira', shifts: ['dia'] },
    { name: 'quarta', label: 'Quarta-feira', shifts: ['dia'] },
    { name: 'quinta', label: 'Quinta-feira', shifts: ['dia'] },
    { name: 'sexta', label: 'Sexta-feira', shifts: ['dia'] },
    { name: 'sabado', label: 'Sábado', shifts: ['manha', 'tarde', 'noite'] },
    { name: 'domingo', label: 'Domingo', shifts: ['manha', 'noite'] },
  ];

  const shiftLabels = {
    dia: 'Dia Todo',
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Escala para {format(nextMonth, 'MMMM yyyy', { locale: pt })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {weekdays.map((weekday) => (
          <div key={weekday.name} className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-800">
              {weekday.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-4">
              {weekday.shifts.map((shift) => (
                <div key={`${weekday.name}-${shift}`} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={`${weekday.name}-${shift}`}
                    checked={isShiftSelected(weekday.name, shift)}
                    onCheckedChange={(checked) => handleShiftToggle(weekday.name, shift, checked as boolean)}
                    disabled={disabled}
                    className="h-5 w-5"
                  />
                  <Label 
                    htmlFor={`${weekday.name}-${shift}`} 
                    className="text-base font-medium cursor-pointer flex-1"
                  >
                    {shiftLabels[shift as keyof typeof shiftLabels]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">
            Total de turnos selecionados: {selectedDates.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekdayCheckboxCalendar;

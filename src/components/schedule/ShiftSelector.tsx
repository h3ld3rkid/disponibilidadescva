
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar, Moon } from 'lucide-react';

interface ShiftSelectorProps {
  selectedShifts: string[];
  selectedOvernights: string[];
  onShiftChange: (shifts: string[]) => void;
  onOvernightChange: (overnights: string[]) => void;
}

const ShiftSelector: React.FC<ShiftSelectorProps> = ({
  selectedShifts,
  selectedOvernights,
  onShiftChange,
  onOvernightChange
}) => {
  const weekdayShifts = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'
  ];

  const saturdayShifts = [
    'Sábado_manhã', 'Sábado_tarde', 'Sábado_noite'
  ];

  const sundayShifts = [
    'Domingo_manhã', 'Domingo_noite'
  ];

  const overnights = [
    'Dom/Seg', 'Seg/Ter', 'Ter/Qua', 'Qua/Qui', 'Qui/Sex', 'Sex/Sab', 'Sab/Dom'
  ];

  const handleShiftToggle = (shift: string) => {
    console.log('Shifting toggle for:', shift);
    const newShifts = selectedShifts.includes(shift)
      ? selectedShifts.filter(s => s !== shift)
      : [...selectedShifts, shift];
    console.log('New shifts array:', newShifts);
    onShiftChange(newShifts);
  };

  const handleOvernightToggle = (overnight: string) => {
    console.log('Overnight toggle for:', overnight);
    const newOvernights = selectedOvernights.includes(overnight)
      ? selectedOvernights.filter(o => o !== overnight)
      : [...selectedOvernights, overnight];
    console.log('New overnights array:', newOvernights);
    onOvernightChange(newOvernights);
  };

  const ShiftButton = ({ shift, isSelected, onClick, color = "blue" }: {
    shift: string;
    isSelected: boolean;
    onClick: () => void;
    color?: string;
  }) => {
    const getColorClasses = () => {
      if (isSelected) {
        switch (color) {
          case "blue":
            return "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30";
          case "orange":
            return "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/30";
          case "purple":
            return "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30";
          default:
            return "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30";
        }
      } else {
        switch (color) {
          case "blue":
            return "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
          case "orange":
            return "bg-white border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50";
          case "purple":
            return "bg-white border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50";
          default:
            return "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
        }
      }
    };

    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          flex items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-300 ease-in-out
          border-2 font-semibold text-sm min-h-[60px] w-full
          ${getColorClasses()}
          transform hover:scale-105 active:scale-95
        `}
      >
        <span className="text-center font-medium">
          {shift.replace('_', ' ')}
        </span>
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 bg-white rounded-full opacity-90 animate-pulse"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Weekday Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-6">Dias da Semana</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekdayShifts.map(shift => (
                <ShiftButton
                  key={shift}
                  shift={shift}
                  isSelected={selectedShifts.includes(shift)}
                  onClick={() => handleShiftToggle(shift)}
                  color="blue"
                />
              ))}
            </div>
          </div>

          {/* Weekend Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-6">Fim de Semana</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Saturday */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                <h4 className="text-lg font-semibold text-orange-800 mb-4 text-center">Sábado</h4>
                <div className="space-y-3">
                  {saturdayShifts.map(shift => (
                    <ShiftButton
                      key={shift}
                      shift={shift.replace('Sábado_', '')}
                      isSelected={selectedShifts.includes(shift)}
                      onClick={() => handleShiftToggle(shift)}
                      color="orange"
                    />
                  ))}
                </div>
              </div>

              {/* Sunday */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                <h4 className="text-lg font-semibold text-purple-800 mb-4 text-center">Domingo</h4>
                <div className="space-y-3">
                  {sundayShifts.map(shift => (
                    <ShiftButton
                      key={shift}
                      shift={shift.replace('Domingo_', '')}
                      isSelected={selectedShifts.includes(shift)}
                      onClick={() => handleShiftToggle(shift)}
                      color="purple"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overnights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-purple-600" />
            Pernoites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overnights.map(overnight => (
              <ShiftButton
                key={overnight}
                shift={overnight}
                isSelected={selectedOvernights.includes(overnight)}
                onClick={() => handleOvernightToggle(overnight)}
                color="purple"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftSelector;

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Save } from 'lucide-react';
interface ScheduleSummaryProps {
  selectedDates: string[];
  selectedOvernights: string[];
  editCount: number;
  canSubmitSchedule: boolean;
  submissionBlocked: boolean;
  isLoading: boolean;
  onSubmit: () => void;
}
const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({
  selectedDates,
  selectedOvernights,
  editCount,
  canSubmitSchedule,
  submissionBlocked,
  isLoading,
  onSubmit
}) => {
  const totalSelectedShifts = selectedDates.length;
  const hasSelections = selectedDates.length > 0 || selectedOvernights.length > 0;
  return <Card className="bg-white border-gray-200 shadow-lg">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Resumo
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-sm text-blue-600 font-medium">Turnos</p>
            <p className="text-2xl font-bold text-blue-900">{totalSelectedShifts}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <p className="text-sm text-purple-600 font-medium">Pernoites</p>
            <p className="text-2xl font-bold text-purple-900">{selectedOvernights.length}</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-600 font-medium">Submissões</p>
          <p className="text-2xl font-bold text-gray-900">{editCount} / 2</p>
        </div>
        
        {!canSubmitSchedule && <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p className="text-red-700 text-sm font-medium text-center">
              ⚠️ Limite de submissões atingido
            </p>
          </div>}

        <Button onClick={onSubmit} disabled={isLoading || !hasSelections || !canSubmitSchedule || submissionBlocked} className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300">
          {isLoading ? <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              A submeter...
            </div> : <div className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Guardar Escala
            </div>}
        </Button>
        
        {!hasSelections && <p className="text-sm text-gray-500 text-center mt-2">Selecione pelo menos um turno ou pernoite para submeter</p>}
      </CardContent>
    </Card>;
};
export default ScheduleSummary;
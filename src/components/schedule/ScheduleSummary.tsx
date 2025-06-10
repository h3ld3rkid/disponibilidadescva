import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

// This component is now simplified and not used in the main flow
// Keeping it for potential future use but functionality moved to SimpleScheduleForm

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
  return (
    <Card>
      <CardContent className="pt-6">
        <p>Esta funcionalidade foi movida para o formulário principal.</p>
      </CardContent>
    </Card>
  );
};

export default ScheduleSummary;

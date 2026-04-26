import React from 'react';
import MonthlySubmissionPeriodsConfig from '@/components/admin/MonthlySubmissionPeriodsConfig';

const SubmissionPeriodsConfig = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Períodos de Submissão</h1>
        <p className="text-muted-foreground">
          Configure as datas em que cada escala mensal pode ser submetida.
        </p>
      </div>
      <MonthlySubmissionPeriodsConfig />
    </div>
  );
};

export default SubmissionPeriodsConfig;

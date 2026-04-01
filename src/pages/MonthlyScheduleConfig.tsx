
import React from 'react';
import MonthlyScheduleLinksConfig from '@/components/config/MonthlyScheduleLinksConfig';
import XLSXLinkConfig from '@/components/config/XLSXLinkConfig';

const MonthlyScheduleConfig = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ficheiros da Escala</h1>
        <p className="text-muted-foreground">
          Configure os links das escalas mensais e o ficheiro XLSX.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <MonthlyScheduleLinksConfig />
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <XLSXLinkConfig />
        </div>
      </div>
    </div>
  );
};

export default MonthlyScheduleConfig;

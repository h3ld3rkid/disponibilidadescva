import React from 'react';
import XLSXLinkConfig from '@/components/config/XLSXLinkConfig';

const XLSXConfig = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuração do Ficheiro XLSX</h1>
        <p className="text-muted-foreground">
          Configure o link para o ficheiro Excel da escala para análise mais precisa.
        </p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        <XLSXLinkConfig />
      </div>
    </div>
  );
};

export default XLSXConfig;

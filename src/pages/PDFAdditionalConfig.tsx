import React from 'react';
import PDFLinkConfig from '@/components/config/PDFLinkConfig';

const PDFAdditionalConfig = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuração do Link PDF Adicional</h1>
        <p className="text-muted-foreground">
          Configure o link adicional para o PDF da escala anterior.
        </p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        <PDFLinkConfig />
      </div>
    </div>
  );
};

export default PDFAdditionalConfig;
import React from 'react';
import DatabaseConfigForm from '@/components/config/DatabaseConfig';
import FooterTextConfig from '@/components/config/FooterTextConfig';
import PDFLinkConfig from '@/components/config/PDFLinkConfig';

const DatabaseConfigInternal = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground">
          Configure a base de dados e personalize o texto do rodapé.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <DatabaseConfigForm />
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <FooterTextConfig />
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <PDFLinkConfig />
        </div>
      </div>
    </div>
  );
};

export default DatabaseConfigInternal;
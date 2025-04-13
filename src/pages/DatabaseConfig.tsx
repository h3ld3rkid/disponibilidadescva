
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DatabaseConfigForm from '@/components/config/DatabaseConfig';

const DatabaseConfig = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex items-center">
          <img 
            src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
            alt="Cruz Vermelha Amares" 
            className="h-8 object-contain mr-3" 
          />
          <h1 className="text-2xl font-semibold text-gray-900">Configuração da Base de Dados</h1>
        </div>
      </div>
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button variant="outline" asChild>
            <Link to="/login" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o Login
            </Link>
          </Button>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <DatabaseConfigForm />
        </div>
      </div>
    </div>
  );
};

export default DatabaseConfig;

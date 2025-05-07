
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, RotateCcw, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserSchedulesHeaderProps {
  isAdmin: boolean;
  selectedUsers: string[];
  isMigrating: boolean;
  migrationDone: boolean;
  onExportPDF: () => void;
  onMigrateData: () => void;
  onRefresh: () => void;
}

const UserSchedulesHeader: React.FC<UserSchedulesHeaderProps> = ({
  isAdmin,
  selectedUsers,
  isMigrating,
  migrationDone,
  onExportPDF,
  onMigrateData,
  onRefresh
}) => {
  if (!isAdmin) return null;
  
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button 
          onClick={onExportPDF}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          disabled={selectedUsers.length === 0}
        >
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
        <span className="text-sm text-gray-600">
          {selectedUsers.length} utilizador(es) selecionado(s)
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          onClick={onMigrateData}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          disabled={isMigrating || migrationDone}
        >
          <Database className="h-4 w-4" />
          {isMigrating ? 'Migrando...' : 'Migrar dados para Supabase'}
        </Button>
        <Button 
          onClick={onRefresh}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>
    </div>
  );
};

export default UserSchedulesHeader;

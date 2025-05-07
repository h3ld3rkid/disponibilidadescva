
import React from 'react';

interface MigrationStatusProps {
  migrationDone: boolean;
  migrationCount: number;
  showScheduleRule?: boolean;
  isAdmin?: boolean;
}

const MigrationStatus: React.FC<MigrationStatusProps> = ({
  migrationDone,
  migrationCount,
  showScheduleRule = false,
  isAdmin = false
}) => {
  return (
    <>
      {migrationDone && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          <p className="font-medium">Migração concluída com sucesso!</p>
          <p>Foram migrados {migrationCount} registros do localStorage para o Supabase.</p>
        </div>
      )}
      
      {showScheduleRule && !isAdmin && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          <p className="font-medium">Prazo de edição encerrado!</p>
          <p>A edição da escala só é permitida até o dia 15 do mês anterior.</p>
        </div>
      )}
    </>
  );
};

export default MigrationStatus;

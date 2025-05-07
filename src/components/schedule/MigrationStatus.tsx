
import React from 'react';

interface MigrationStatusProps {
  migrationDone: boolean;
  migrationCount: number;
}

const MigrationStatus: React.FC<MigrationStatusProps> = ({
  migrationDone,
  migrationCount
}) => {
  if (!migrationDone) return null;
  
  return (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
      <p className="font-medium">Migração concluída com sucesso!</p>
      <p>Foram migrados {migrationCount} registros do localStorage para o Supabase.</p>
    </div>
  );
};

export default MigrationStatus;

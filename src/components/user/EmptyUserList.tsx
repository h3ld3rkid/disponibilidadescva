
import React from 'react';
import { Users } from 'lucide-react';

const EmptyUserList: React.FC = () => {
  return (
    <div className="text-center py-8 text-gray-500">
      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>Nenhum utilizador encontrado</p>
    </div>
  );
};

export default EmptyUserList;

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, Briefcase, User, Bell, RefreshCw } from 'lucide-react';

interface HomeProps {
  userEmail: string;
  isAdmin: boolean;
}

const Home: React.FC<HomeProps> = ({ userEmail, isAdmin }) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Escala',
      description: 'Ver escala atual',
      icon: Calendar,
      path: '/dashboard/current-schedule',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Disponibilidade',
      description: 'Submeter disponibilidade',
      icon: ClipboardList,
      path: '/dashboard/schedule',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Meus Serviços',
      description: 'Ver os meus serviços',
      icon: Briefcase,
      path: '/dashboard/my-services',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Trocas',
      description: 'Gerir pedidos de troca',
      icon: RefreshCw,
      path: '/dashboard/exchanges',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'Perfil',
      description: 'Editar perfil',
      icon: User,
      path: '/dashboard/profile',
      color: 'bg-slate-500 hover:bg-slate-600'
    },
    {
      title: 'Avisos',
      description: 'Ver avisos',
      icon: Bell,
      path: '/dashboard/announcements',
      color: 'bg-red-500 hover:bg-red-600',
      adminOnly: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>Navegue rapidamente para as funcionalidades principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions
              .filter(action => action.adminOnly ? isAdmin : true)
              .map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className={`h-auto flex flex-col items-center justify-center gap-2 p-4 text-white border-0 ${action.color}`}
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-8 w-8" />
                <span className="font-medium text-sm">{action.title}</span>
                <span className="text-xs opacity-80 text-center">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;

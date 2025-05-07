
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Trash2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";

interface UserScheduleListProps {
  isLoading: boolean;
  userEmails: string[];
  userInfo: any;
  toggleUserSelection: (email: string) => void;
  selectedUsers: string[];
  schedules: any[];
  onViewSchedule: (email: string, name: string) => void;
  onDeleteSchedule: (email: string) => void;
  onResetEditCounter: (email: string) => void;
  getUserNameFromEmail: (email: string) => string;
}

const UserScheduleList: React.FC<UserScheduleListProps> = ({
  isLoading,
  userEmails,
  userInfo,
  toggleUserSelection,
  selectedUsers,
  schedules,
  onViewSchedule,
  onDeleteSchedule,
  onResetEditCounter,
  getUserNameFromEmail
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escalas dos Utilizadores</CardTitle>
          <CardDescription>Visualize os utilizadores que submeteram escalas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center">
            <div className="animate-pulse text-gray-500">A carregar escalas...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userEmails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escalas dos Utilizadores</CardTitle>
          <CardDescription>Visualize os utilizadores que submeteram escalas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center">
            <div className="text-gray-500">Não existem escalas submetidas.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escalas dos Utilizadores</CardTitle>
        <CardDescription>Visualize os utilizadores que submeteram escalas</CardDescription>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {userInfo && userInfo.role === 'admin' && (
                <TableHead className="w-[50px]"></TableHead>
              )}
              <TableHead>Utilizador</TableHead>
              <TableHead>Meses com Escalas</TableHead>
              {userInfo && userInfo.role === 'admin' && (
                <TableHead className="w-[200px] text-right">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {userEmails.map((email) => {
              // Get user name from email
              const userName = getUserNameFromEmail(email);
              
              // Get months for this user
              const userMonths = Array.from(new Set(
                schedules
                  .filter(s => s.email === email)
                  .map(s => s.month)
              ));
              
              return (
                <TableRow key={email}>
                  {userInfo && userInfo.role === 'admin' && (
                    <TableCell>
                      <Checkbox 
                        checked={selectedUsers.includes(email)}
                        onCheckedChange={() => toggleUserSelection(email)}
                        className="ml-1"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium"
                      onClick={() => onViewSchedule(email, userName)}
                    >
                      {userName}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {userMonths.map((month) => (
                      <span 
                        key={`${email}-${month}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1"
                      >
                        {String(month)}
                      </span>
                    ))}
                  </TableCell>
                  {userInfo && userInfo.role === 'admin' && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onViewSchedule(email, userName)}
                          className="h-8 flex items-center"
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Ver Escala
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="h-8 flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmar eliminação</DialogTitle>
                            </DialogHeader>
                            <p>Tem a certeza que deseja eliminar as escalas de {userName}?</p>
                            <DialogFooter>
                              <Button 
                                variant="destructive" 
                                onClick={() => onDeleteSchedule(email)}
                              >
                                Eliminar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 flex items-center"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Resetar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reiniciar contador</DialogTitle>
                            </DialogHeader>
                            <p>Deseja reiniciar o contador de edições para {userName}?</p>
                            <DialogFooter>
                              <Button 
                                onClick={() => onResetEditCounter(email)}
                              >
                                Reiniciar (0/2)
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserScheduleList;

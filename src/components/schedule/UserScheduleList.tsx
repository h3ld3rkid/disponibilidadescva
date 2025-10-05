
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, RotateCcw, User, Mail, Hash, Calendar } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import SchedulePrintButton from './SchedulePrintButton';

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
  const getUserSchedule = (email: string) => {
    return schedules.find(schedule => schedule.email === email);
  };

  const getUserDetails = (email: string) => {
    const schedule = getUserSchedule(email);
    return {
      name: schedule?.user || email,
      mechanographicNumber: email.split('@')[0] // Fallback if not found
    };
  };

  const isAdmin = userInfo?.role === 'admin';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <div className="animate-pulse text-lg text-gray-600">A carregar escalas...</div>
        </CardContent>
      </Card>
    );
  }

  if (userEmails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Escalas Submetidas
          </CardTitle>
          <CardDescription>
            Lista de utilizadores que submeteram as suas escalas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Ainda não foram submetidas escalas para o próximo mês.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Escalas Submetidas ({userEmails.length})
        </CardTitle>
        <CardDescription>
          Lista de utilizadores que submeteram as suas escalas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {userEmails.map((email) => {
            const userSchedule = getUserSchedule(email);
            const userDetails = getUserDetails(email);
            const isSelected = selectedUsers.includes(email);
            const displayName = getUserNameFromEmail(email);
            
            return (
              <div key={email} className="p-4 border rounded-lg hover:bg-gray-50">
                {/* Mobile Layout */}
                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUserSelection(email)}
                        className="mt-1"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-sm break-words">{displayName}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="break-all">{email}</span>
                        </div>
                        {userSchedule?.month && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            Mês: {userSchedule.month}
                          </div>
                        )}
                        {userSchedule?.editCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 flex-shrink-0" />
                            Edições: {userSchedule.editCount}
                          </div>
                        )}
                      </div>
                      
                      {userSchedule?.printedAt && (
                        <Badge variant="secondary" className="text-xs mt-2">
                          Impresso em {new Date(userSchedule.printedAt).toLocaleDateString('pt-PT')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && userSchedule && (
                      <SchedulePrintButton
                        userEmail={email}
                        userName={userDetails.name}
                        mechanographicNumber={userDetails.mechanographicNumber}
                        scheduleData={userSchedule.dates}
                        printedAt={userSchedule.printedAt}
                        onPrintComplete={() => window.location.reload()}
                      />
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewSchedule(email, userDetails.name)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reiniciar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reiniciar contador de edições</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende reiniciar o contador de edições para {displayName}? Esta ação permitirá ao utilizador editar a escala novamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onResetEditCounter(email)}>
                                Reiniciar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Apagar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar escalas</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende eliminar as escalas de {displayName}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteSchedule(email)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {isAdmin && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUserSelection(email)}
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{displayName}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {email}
                        </div>
                        {userSchedule?.month && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Mês: {userSchedule.month}
                          </div>
                        )}
                        {userSchedule?.editCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Edições: {userSchedule.editCount}
                          </div>
                        )}
                      </div>
                      
                      {userSchedule?.printedAt && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Impresso em {new Date(userSchedule.printedAt).toLocaleDateString('pt-PT')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAdmin && userSchedule && (
                      <SchedulePrintButton
                        userEmail={email}
                        userName={userDetails.name}
                        mechanographicNumber={userDetails.mechanographicNumber}
                        scheduleData={userSchedule.dates}
                        printedAt={userSchedule.printedAt}
                        onPrintComplete={() => window.location.reload()}
                      />
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewSchedule(email, userDetails.name)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reiniciar contador de edições</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende reiniciar o contador de edições para {displayName}? Esta ação permitirá ao utilizador editar a escala novamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onResetEditCounter(email)}>
                                Reiniciar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar escalas</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende eliminar as escalas de {displayName}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteSchedule(email)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserScheduleList;

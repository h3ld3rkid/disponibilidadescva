
import React from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Trash2, RotateCcw, CheckSquare, XSquare, Files } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserSchedulesHeaderProps {
  isAdmin: boolean;
  selectedUsers: string[];
  isMigrating: boolean;
  migrationDone: boolean;
  onExportPDF: () => void;
  onExportIndividualPDFs: () => void;
  onMigrateData: () => void;
  onRefresh: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const UserSchedulesHeader: React.FC<UserSchedulesHeaderProps> = ({
  isAdmin,
  selectedUsers,
  isMigrating,
  migrationDone,
  onExportPDF,
  onExportIndividualPDFs,
  onMigrateData,
  onRefresh,
  onDeleteSelected,
  onSelectAll,
  onDeselectAll
}) => {
  if (!isAdmin) return null;
  
  return (
    <TooltipProvider>
      <div className="mb-6 space-y-4">
        {/* Mobile Layout */}
        <div className="flex flex-col gap-4 md:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedUsers.length} selecionado(s)
            </span>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onExportPDF}
                    disabled={selectedUsers.length === 0}
                    size="icon"
                    variant="outline"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimir Seleção (PDF único)</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onExportIndividualPDFs}
                    disabled={selectedUsers.length === 0}
                    size="icon"
                    variant="outline"
                  >
                    <Files className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar Ficheiros Individuais</TooltipContent>
              </Tooltip>
              
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={selectedUsers.length === 0}
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Apagar Seleção</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar escalas selecionadas</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem a certeza que pretende apagar as escalas de {selectedUsers.length} utilizador(es)? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Apagar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onSelectAll}
                    variant="outline" 
                    size="icon"
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Selecionar Tudo</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onDeselectAll}
                    variant="outline" 
                    size="icon"
                  >
                    <XSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desselecionar Tudo</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onRefresh}
                    variant="outline" 
                    size="icon"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onExportPDF}
                  disabled={selectedUsers.length === 0}
                  size="icon"
                  variant="outline"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Imprimir Seleção (PDF único)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onExportIndividualPDFs}
                  disabled={selectedUsers.length === 0}
                  size="icon"
                  variant="outline"
                >
                  <Files className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar Ficheiros Individuais</TooltipContent>
            </Tooltip>
            
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={selectedUsers.length === 0}
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Apagar Seleção</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar escalas selecionadas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem a certeza que pretende apagar as escalas de {selectedUsers.length} utilizador(es)? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <span className="text-sm text-muted-foreground ml-2">
              {selectedUsers.length} selecionado(s)
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onSelectAll}
                  variant="outline" 
                  size="icon"
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Selecionar Tudo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onDeselectAll}
                  variant="outline" 
                  size="icon"
                >
                  <XSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desselecionar Tudo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onRefresh}
                  variant="outline" 
                  size="icon"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default UserSchedulesHeader;

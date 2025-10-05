
import React from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Trash2, RotateCcw, Database } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface UserSchedulesHeaderProps {
  isAdmin: boolean;
  selectedUsers: string[];
  isMigrating: boolean;
  migrationDone: boolean;
  onExportPDF: () => void;
  onMigrateData: () => void;
  onRefresh: () => void;
  onDeleteSelected: () => void;
}

const UserSchedulesHeader: React.FC<UserSchedulesHeaderProps> = ({
  isAdmin,
  selectedUsers,
  isMigrating,
  migrationDone,
  onExportPDF,
  onMigrateData,
  onRefresh,
  onDeleteSelected
}) => {
  if (!isAdmin) return null;
  
  return (
    <div className="mb-6 space-y-4">
      {/* Mobile Layout */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedUsers.length} utilizador(es) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button 
              onClick={onExportPDF}
              className="flex-1 flex items-center justify-center gap-2"
              disabled={selectedUsers.length === 0}
              size="sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir Seleção
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={selectedUsers.length === 0}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar Seleção
                </Button>
              </AlertDialogTrigger>
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
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={onRefresh}
            variant="outline" 
            className="flex-1 flex items-center justify-center gap-2"
            size="sm"
          >
            <RotateCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onExportPDF}
            className="flex items-center gap-2"
            disabled={selectedUsers.length === 0}
          >
            <Printer className="h-4 w-4" />
            Imprimir Seleção
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex items-center gap-2"
                disabled={selectedUsers.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Apagar Seleção
              </Button>
            </AlertDialogTrigger>
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
          
          <span className="text-sm text-muted-foreground">
            {selectedUsers.length} utilizador(es) selecionado(s)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
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
    </div>
  );
};

export default UserSchedulesHeader;

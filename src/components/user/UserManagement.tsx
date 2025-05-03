
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger, 
  DialogClose
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetDescription, 
  SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { 
  UserPlus, Pencil, UserX, UserCheck, KeyRound, BellRing, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserForm from "./UserForm";
// Updated import
import { supabaseService } from "../../services/supabase";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";

type UserFormSubmitFunction = (data: { 
  name: string; 
  email: string; 
  password?: string; 
  mechanographicNumber: string;
  role: "admin" | "user";
}) => Promise<boolean>;

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  useEffect(() => {
    fetchData();
    
    const timer = setInterval(async () => {
      try {
        const requests = await supabaseService.getPasswordResetRequests();
        setResetRequests(requests);
      } catch (error) {
        console.error("Error checking reset requests:", error);
      }
    }, 30000);
    
    return () => clearInterval(timer);
  }, [toast]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const userData = await supabaseService.getAllUsers();
      setUsers(userData);
      
      const requests = await supabaseService.getPasswordResetRequests();
      setResetRequests(requests);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Falha ao obter dados",
        description: "Ocorreu um erro ao carregar os dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser: UserFormSubmitFunction = async (userData) => {
    try {
      setIsLoading(true);
      const newUser = await supabaseService.createUser({
        name: userData.name,
        email: userData.email,
        mechanographic_number: userData.mechanographicNumber,
        role: userData.role,
        password: "CVAmares"
      });
      
      setUsers(prev => [...prev, newUser]);
      
      toast({
        title: "Utilizador criado",
        description: `Utilizador ${userData.name} foi criado com sucesso`,
      });
      
      return true;
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Falha ao criar utilizador",
        description: "Ocorreu um erro ao criar o utilizador",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser: UserFormSubmitFunction = async (userData) => {
    try {
      setIsLoading(true);
      const updatedUser = await supabaseService.updateUser(selectedUser.id, {
        name: userData.name,
        email: userData.email,
        mechanographic_number: userData.mechanographicNumber,
        role: userData.role
      });
      
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      setIsEditSheetOpen(false);
      
      const storedUser = localStorage.getItem('mysqlConnection');
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        if (currentUser.email === userData.email) {
          currentUser.role = userData.role;
          localStorage.setItem('mysqlConnection', JSON.stringify(currentUser));
          
          const event = new CustomEvent('userRoleChanged');
          window.dispatchEvent(event);
        }
      }
      
      toast({
        title: "Utilizador atualizado",
        description: `Utilizador ${userData.name} foi atualizado com sucesso`,
      });
      
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Falha ao atualizar utilizador",
        description: "Ocorreu um erro ao atualizar o utilizador",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      setIsLoading(true);
      const result = await supabaseService.toggleUserStatus(userId);
      
      if (result.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, active: result.active }
            : user
        ));
        
        toast({
          title: result.active ? "Utilizador ativado" : "Utilizador desativado",
          description: `Utilizador foi ${result.active ? 'ativado' : 'desativado'} com sucesso`,
        });
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Falha ao alterar estado do utilizador",
        description: "Ocorreu um erro ao alterar o estado do utilizador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      await supabaseService.resetPassword(email);
      
      setResetRequests(prev => prev.filter(e => e !== email));
      
      toast({
        title: "Password redefinida",
        description: `A password do utilizador ${email} foi redefinida para 'CVAmares'`,
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Falha ao redefinir password",
        description: "Ocorreu um erro ao redefinir a password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!userId) {
      toast({
        title: "Erro",
        description: "ID de utilizador inválido",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setDeleteInProgress(true);
      
      // Save user information before deletion for cleanup
      const userToBeDeleted = users.find(user => user.id === userId);
      if (!userToBeDeleted) {
        throw new Error("User not found");
      }
      
      // Delete from database
      const result = await supabaseService.deleteUser(userId);
      
      if (result.success) {
        // Remove from UI state
        setUsers(prev => prev.filter(user => user.id !== userId));
        
        // Clean up any local storage data for this user
        const userEmail = userToBeDeleted.email;
        if (userEmail) {
          // Remove stored schedules
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`userSchedule_${userEmail}`)) {
              localStorage.removeItem(key);
            }
            if (key && key === `userInfo_${userEmail}`) {
              localStorage.removeItem(key);
            }
            if (key && key.startsWith(`editCount_${userEmail}`)) {
              localStorage.removeItem(key);
            }
          }
        }
        
        toast({
          title: "Utilizador eliminado",
          description: "Utilizador foi eliminado com sucesso",
        });
        
        // Trigger UI updates in other components
        const event = new CustomEvent('schedulesChanged');
        window.dispatchEvent(event);
      } else {
        throw new Error(result.message || "Failed to delete user");
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Falha ao eliminar utilizador",
        description: error.message || "Ocorreu um erro ao eliminar o utilizador",
        variant: "destructive",
      });
    } finally {
      setDeleteInProgress(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (user: any) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle>Gestão de Utilizadores</CardTitle>
            <CardDescription>Criar, editar e gerir utilizadores do sistema</CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {resetRequests.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    <BellRing className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {resetRequests.length}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Pedidos de Reset de Password</h4>
                    <div className="max-h-40 overflow-auto">
                      {resetRequests.map((email, index) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm">{email}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => resetPassword(email)}
                            className="text-xs"
                          >
                            <KeyRound className="h-3 w-3 mr-1" />
                            Redefinir
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-brand-indigo hover:bg-brand-darkblue">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Utilizador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Utilizador</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes para criar uma nova conta de utilizador
                  </DialogDescription>
                </DialogHeader>
                <UserForm onSubmit={handleCreateUser} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-pulse text-gray-500">A carregar utilizadores...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Núm. Mec.</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum utilizador encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.mechanographic_number}</TableCell>
                      <TableCell>
                        <span className={user.role === 'admin' ? 'text-brand-indigo font-medium' : ''}>
                          {user.role === 'admin' ? 'Administrador' : 'Utilizador'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inativo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Sheet open={isEditSheetOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                            if (open) {
                              setSelectedUser(user);
                            }
                            setIsEditSheetOpen(open);
                          }}>
                            <SheetTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => {
                                setSelectedUser(user);
                                setIsEditSheetOpen(true);
                              }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Editar Utilizador</SheetTitle>
                                <SheetDescription>
                                  Atualizar informações do utilizador
                                </SheetDescription>
                              </SheetHeader>
                              {selectedUser && (
                                <div className="py-4">
                                  <UserForm 
                                    onSubmit={handleEditUser} 
                                    defaultValues={{
                                      name: selectedUser.name,
                                      email: selectedUser.email,
                                      mechanographicNumber: selectedUser.mechanographic_number,
                                      role: selectedUser.role,
                                    }}
                                    isEdit={true}
                                  />
                                </div>
                              )}
                            </SheetContent>
                          </Sheet>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resetPassword(user.email)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleUserStatus(user.id)}
                            className={user.active ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar Utilizador</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja eliminar este utilizador? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {userToDelete && (
              <div className="bg-slate-100 p-4 rounded-md mb-4">
                <p><strong>Nome:</strong> {userToDelete.name}</p>
                <p><strong>Email:</strong> {userToDelete.email}</p>
                <p><strong>Núm. Mec.:</strong> {userToDelete.mechanographic_number}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteInProgress}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => userToDelete && deleteUser(userToDelete.id)}
              disabled={deleteInProgress}
            >
              {deleteInProgress ? 'A eliminar...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;

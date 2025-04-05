
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetDescription, 
  SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { 
  UserPlus, Pencil, UserX, UserCheck, KeyRound, BellRing 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserForm from "./UserForm";
import { mysqlService } from "../../services/mysqlService";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";

// Define proper type for the onSubmit function
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await mysqlService.getAllUsers();
        setUsers(userData);
        
        // Get password reset requests
        const requests = await mysqlService.getPasswordResetRequests();
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

    fetchData();
    
    // Set up a timer to check for reset requests every 30 seconds
    const timer = setInterval(async () => {
      try {
        const requests = await mysqlService.getPasswordResetRequests();
        setResetRequests(requests);
      } catch (error) {
        console.error("Error checking reset requests:", error);
      }
    }, 30000);
    
    return () => clearInterval(timer);
  }, [toast]);

  const handleCreateUser: UserFormSubmitFunction = async (userData) => {
    try {
      setIsLoading(true);
      const newUser = await mysqlService.createUser({
        ...userData,
        password: "CVAmares" // Default password for new users
      });
      
      setUsers([...users, newUser]);
      
      toast({
        title: "Utilizador criado",
        description: `Utilizador ${userData.name} foi criado com sucesso`,
      });
      
      return true; // Success
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Falha ao criar utilizador",
        description: "Ocorreu um erro ao criar o utilizador",
        variant: "destructive",
      });
      
      return false; // Failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser: UserFormSubmitFunction = async (userData) => {
    try {
      setIsLoading(true);
      const updatedUser = await mysqlService.updateUser(selectedUser.id, userData);
      
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      );
      
      setUsers(updatedUsers);
      setIsEditSheetOpen(false);
      
      toast({
        title: "Utilizador atualizado",
        description: `Utilizador ${userData.name} foi atualizado com sucesso`,
      });
      
      return true; // Success
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Falha ao atualizar utilizador",
        description: "Ocorreu um erro ao atualizar o utilizador",
        variant: "destructive",
      });
      
      return false; // Failure
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      setIsLoading(true);
      const result = await mysqlService.toggleUserStatus(userId);
      
      if (result.success) {
        const updatedUsers = users.map(user => 
          user.id === userId 
            ? { ...user, active: result.active }
            : user
        );
        
        setUsers(updatedUsers);
        
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
      await mysqlService.resetPassword(email);
      
      // Update the reset requests list
      setResetRequests(resetRequests.filter(e => e !== email));
      
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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mechanographicNumber}</TableCell>
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
                                    mechanographicNumber: selectedUser.mechanographicNumber,
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;

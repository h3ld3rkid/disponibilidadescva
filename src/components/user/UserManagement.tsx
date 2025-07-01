import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { ReloadIcon, Plus, Edit, Trash, CheckCheck, UserCog } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import PasswordResetSection from '@/components/admin/PasswordResetSection';

interface User {
  id: string; // Made required to match component expectations
  name: string;
  email: string;
  password?: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
}

const UserForm = ({ onUserCreated }: { onUserCreated: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mechanographicNumber, setMechanographicNumber] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name || !email || !mechanographicNumber) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await userService.createUser({
        name,
        email,
        mechanographic_number: mechanographicNumber,
        role,
      });

      toast({
        title: "Utilizador criado",
        description: "Utilizador criado com sucesso.",
      });

      setName('');
      setEmail('');
      setMechanographicNumber('');
      setRole('user');
      onUserCreated();
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar utilizador",
        description: "Ocorreu um erro ao criar o utilizador.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Criar Novo Utilizador
        </CardTitle>
        <CardDescription>
          Adicionar um novo utilizador ao sistema
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mechanographicNumber">Número Mecanográfico</Label>
            <Input
              type="text"
              id="mechanographicNumber"
              value={mechanographicNumber}
              onChange={(e) => setMechanographicNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'admin' | 'user')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={isLoading} type="submit">
            {isLoading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                A criar...
              </>
            ) : (
              "Criar Utilizador"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const UserList = ({
  users,
  onUserUpdated,
  onUserDeleted,
  onUserStatusToggled
}: {
  users: User[];
  onUserUpdated: () => void;
  onUserDeleted: (email: string) => void;
  onUserStatusToggled: () => void;
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMechanographicNumber, setEditMechanographicNumber] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditMechanographicNumber(user.mechanographic_number);
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);

    try {
      await userService.updateUser(selectedUser.id, {
        name: editName,
        email: editEmail,
        mechanographic_number: editMechanographicNumber,
        role: editRole,
      });

      toast({
        title: "Utilizador atualizado",
        description: "Utilizador atualizado com sucesso.",
      });

      handleCloseEditDialog();
      onUserUpdated();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro ao atualizar utilizador",
        description: "Ocorreu um erro ao atualizar o utilizador.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);

    try {
      const result = await userService.deleteUser(selectedUser.id);
      
      if (result.success) {
        toast({
          title: "Utilizador apagado",
          description: "Utilizador apagado com sucesso.",
        });
        
        handleCloseDeleteDialog();
        onUserDeleted(selectedUser.email);
      } else {
        toast({
          title: "Erro ao apagar utilizador",
          description: result.message || "Ocorreu um erro ao apagar o utilizador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao apagar utilizador",
        description: "Ocorreu um erro ao apagar o utilizador.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      await userService.toggleUserStatus(user.id);
      toast({
        title: "Estado atualizado",
        description: `Utilizador ${user.name} ${user.active ? 'desativado' : 'ativado'} com sucesso.`,
      });
      onUserStatusToggled();
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Erro ao alterar estado",
        description: "Ocorreu um erro ao alterar o estado do utilizador.",
        variant: "destructive",
      });
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'mechanographic_number', headerName: 'Nº Mecanográfico', width: 150 },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      valueOptions: ['admin', 'user'],
      editable: false,
    },
    {
      field: 'active',
      headerName: 'Ativo',
      width: 100,
      renderCell: (params: GridRenderCellParams<any, any>) => (
        <Switch
          checked={params.value}
          onCheckedChange={() => handleToggleUserStatus(params.row)}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 200,
      renderCell: (params: GridRenderCellParams<any, any>) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            onClick={() => handleOpenEditDialog(params.row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Tem a certeza que quer apagar este utilizador?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleOpenDeleteDialog(params.row)}>Apagar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Lista de Utilizadores
          </CardTitle>
          <CardDescription>
            Gerenciar utilizadores existentes
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div style={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={users}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
            <DialogDescription>
              Atualizar informações do utilizador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="editName">Nome</Label>
              <Input
                type="text"
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                type="email"
                id="editEmail"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editMechanographicNumber">Número Mecanográfico</Label>
              <Input
                type="text"
                id="editMechanographicNumber"
                value={editMechanographicNumber}
                onChange={(e) => setEditMechanographicNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleCloseEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  A atualizar...
                </>
              ) : (
                <>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Atualizar Utilizador
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Tem a certeza que quer apagar este utilizador?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  A apagar...
                </>
              ) : (
                "Apagar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

import PasswordResetSection from '@/components/admin/PasswordResetSection';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Erro ao carregar utilizadores",
        description: "Ocorreu um erro ao carregar a lista de utilizadores.",
        variant: "destructive",
      });
    }
  };

  const handleUserCreated = () => {
    loadUsers();
  };

  const handleUserUpdated = () => {
    loadUsers();
  };
  
  const handleUserDeleted = (deletedUserEmail: string) => {
    setUsers(prevUsers => prevUsers.filter(user => user.email !== deletedUserEmail));
  };

  const handleUserStatusToggled = () => {
    loadUsers();
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Utilizadores</h1>
        <p className="text-gray-600">Gerir utilizadores do sistema</p>
      </div>

      <div className="space-y-6">
        {/* User Form */}
        <UserForm onUserCreated={handleUserCreated} />
        
        {/* Password Reset Section */}
        <PasswordResetSection />
        
        {/* User List */}
        <UserList 
          users={users}
          onUserUpdated={handleUserUpdated}
          onUserDeleted={handleUserDeleted}
          onUserStatusToggled={handleUserStatusToggled}
        />
      </div>
    </div>
  );
};

export default UserManagement;

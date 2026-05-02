import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";

const ROLE_LABELS: Record<string, string> = { admin: "Administrador", receptionist: "Recepcionista", dentist: "Dentista" };
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  receptionist: "bg-blue-100 text-blue-800 border-blue-200",
  dentist: "bg-teal-100 text-teal-800 border-teal-200",
};

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ name: "", email: "", password: "", role: "receptionist" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function handleCreate() {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Complete todos los campos obligatorios", variant: "destructive" });
      return;
    }
    createUser.mutate({ data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Usuario creado exitosamente" });
        setShowCreateDialog(false);
        setFormData({ name: "", email: "", password: "", role: "receptionist" });
      },
      onError: () => toast({ title: "Error al crear usuario", variant: "destructive" }),
    });
  }

  function handleUpdate() {
    if (!editingUser) return;
    updateUser.mutate({ id: editingUser.id, data: { name: editingUser.name, role: editingUser.role } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Usuario actualizado" });
        setEditingUser(null);
      },
      onError: () => toast({ title: "Error al actualizar usuario", variant: "destructive" }),
    });
  }

  function handleDelete(id: number) {
    deleteUser.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Usuario eliminado" });
        setDeleteConfirm(null);
      },
      onError: () => toast({ title: "Error al eliminar usuario", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Administrar acceso al sistema</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Usuario
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-16"/>)}</div>
      ) : (
        <div className="space-y-3">
          {users?.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ml-2 ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                    {!user.isActive && <Badge variant="secondary">Inactivo</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingUser({ id: user.id, name: user.name, role: user.role })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirm(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo *</label>
              <Input placeholder="Dr. Juan Pérez" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Correo electrónico *</label>
              <Input type="email" placeholder="usuario@clinica.com" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña *</label>
              <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <Select value={formData.role} onValueChange={v => setFormData(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="receptionist">Recepcionista</SelectItem>
                  <SelectItem value="dentist">Dentista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createUser.isPending}>
              {createUser.isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={editingUser?.name ?? ""} onChange={e => setEditingUser(u => u ? { ...u, name: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <Select value={editingUser?.role ?? "receptionist"} onValueChange={v => setEditingUser(u => u ? { ...u, role: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="receptionist">Recepcionista</SelectItem>
                  <SelectItem value="dentist">Dentista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar eliminación</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Esta acción no se puede deshacer. El usuario perderá acceso al sistema.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? "Eliminando..." : "Eliminar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Receipt,
  Package,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  receptionist: "Recepcionista",
  dentist: "Dentista",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("clinica_token");
        setLocation("/login");
      },
    });
  };

  const isDentist = user?.role === "dentist";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Pacientes", href: "/patients", icon: Users, show: true },
    { name: "Citas", href: "/appointments", icon: Calendar, show: true },
    { name: "Historial Clínico", href: "/clinical-records", icon: FileText, show: true },
    { name: "Facturación", href: "/invoices", icon: Receipt, show: true },
    { name: "Inventario", href: "/inventory", icon: Package, show: !isDentist },
  ].filter(item => item.show);

  const NavLinks = () => (
    <nav className="space-y-1 px-2">
      {navigation.map((item) => {
        const isActive = location.startsWith(item.href);
        return (
          <Link key={item.name} href={item.href}>
            <div
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-5 w-5 ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                }`}
                aria-hidden="true"
              />
              {item.name}
            </div>
          </Link>
        );
      })}
      {user?.role === "admin" && (
        <Link href="/settings/users">
          <div
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer ${
              location.startsWith("/settings/users")
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Settings
              className={`mr-3 flex-shrink-0 h-5 w-5 ${
                location.startsWith("/settings/users")
                  ? "text-primary-foreground"
                  : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
              }`}
              aria-hidden="true"
            />
            Usuarios
          </div>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-center h-16 px-4 bg-sidebar border-b border-sidebar-border">
              <h1 className="text-xl font-bold text-sidebar-foreground">Clínica Argüello</h1>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavLinks />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-sidebar-border bg-sidebar pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-bold text-sidebar-foreground">Clínica Argüello</h1>
          </div>
          <div className="flex-grow flex flex-col">
            <NavLinks />
          </div>
        </div>
      </div>

      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="px-4 border-r border-border text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Abrir menú</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>
          <div className="flex-1 px-4 flex justify-end">
            <div className="flex items-center md:ml-6 gap-4">
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-right hidden sm:block">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] ?? user.role}</p>
                  </div>
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : null}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

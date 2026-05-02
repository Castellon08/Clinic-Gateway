import { useState } from "react";
import { Link } from "wouter";
import { useListPatients } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Phone, Mail, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

function calcAge(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

const GENDER_LABELS: Record<string, string> = { male: "M", female: "F", other: "Otro" };

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: me } = useGetMe();

  const { data: response, isLoading } = useListPatients(
    debouncedSearch ? { search: debouncedSearch } : undefined
  );

  const patients = response?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de pacientes activos</p>
        </div>
        {me?.role !== "dentist" && (
          <Link href="/patients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, cédula, teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !patients.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search ? `Sin resultados para "${search}"` : "No hay pacientes registrados"}
            </p>
            {!search && me?.role !== "dentist" && (
              <Link href="/patients/new">
                <Button variant="link" className="mt-2">Registrar el primer paciente</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{patient.firstName} {patient.lastName}</p>
                      {patient.gender && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {GENDER_LABELS[patient.gender] ?? patient.gender}
                        </span>
                      )}
                      {patient.birthDate && (
                        <span className="text-xs text-muted-foreground">{calcAge(patient.birthDate)} años</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {patient.cedula && <span className="text-xs text-muted-foreground">Cédula: {patient.cedula}</span>}
                      {patient.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                          <Mail className="h-3 w-3" />{patient.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
          <p className="text-xs text-center text-muted-foreground pt-2">
            {response?.total ?? patients.length} paciente{(response?.total ?? patients.length) !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

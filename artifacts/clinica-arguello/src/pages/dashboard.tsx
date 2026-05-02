import { useGetDashboardSummary, useGetAppointmentsToday, useGetRevenueByMonth, useGetLowStockAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(amount);
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: todayAppointments, isLoading: apptLoading } = useGetAppointmentsToday();
  const { data: revenueData, isLoading: revenueLoading } = useGetRevenueByMonth();
  const { data: lowStock, isLoading: stockLoading } = useGetLowStockAlerts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel Principal</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen de actividad clínica — {new Date().toLocaleDateString("es-NI", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pacientes Totales</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{summary?.totalPatients ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{summary?.newPatientsThisMonth ?? 0} nuevos este mes</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Citas Hoy</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{summary?.totalAppointmentsToday ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{summary?.completedAppointmentsToday ?? 0} completadas · {summary?.pendingAppointmentsToday ?? 0} pendientes</p>
                  </div>
                  <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ingresos este Mes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(summary?.totalRevenueThisMonth ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{summary?.totalPendingInvoices ?? 0} facturas pendientes</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alertas de Inventario</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{summary?.lowStockCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">artículos con stock bajo</p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${(summary?.lowStockCount ?? 0) > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
                    <AlertTriangle className={`h-6 w-6 ${(summary?.lowStockCount ?? 0) > 0 ? "text-amber-600" : "text-gray-400"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Citas de Hoy</CardTitle>
                <Link href="/appointments">
                  <span className="text-sm text-primary hover:underline cursor-pointer">Ver todas</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {apptLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !todayAppointments?.length ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No hay citas programadas para hoy</div>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-mono font-semibold text-foreground w-14 shrink-0">{appt.appointmentTime}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{appt.patient?.firstName} {appt.patient?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{appt.reason}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[appt.status]}`}>
                        {STATUS_LABELS[appt.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low stock alerts */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Inventario Bajo</CardTitle>
                <Link href="/inventory">
                  <span className="text-sm text-primary hover:underline cursor-pointer">Ver todo</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-12"/>)}</div>
              ) : !lowStock?.length ? (
                <div className="py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Todo el inventario en orden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStock.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-200">
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-amber-700">{item.quantity} {item.unit} (mín: {item.minQuantity})</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Ingresos por Mes — {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !revenueData?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sin datos de ingresos por mes disponibles</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `C$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "Ingresos"]} />
                <Bar dataKey="revenue" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

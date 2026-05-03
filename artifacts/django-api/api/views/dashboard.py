from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, Q
from django.db import connection
from datetime import date, datetime, timedelta

from ..models import Patient, Appointment, Invoice, Inventory


class DashboardSummaryView(APIView):
    def get(self, request):
        today = date.today()
        first_of_month = today.replace(day=1)
        week_ago = today - timedelta(days=7)

        total_patients = Patient.objects.count()
        new_patients = Patient.objects.filter(created_at__date__gte=first_of_month).count()

        appts_today = list(Appointment.objects.filter(appointment_date=today).values_list("status", flat=True))
        total_today = len(appts_today)
        completed_today = sum(1 for s in appts_today if s == "completed")
        pending_today = sum(1 for s in appts_today if s in ("pending", "confirmed"))

        appts_week = Appointment.objects.filter(
            appointment_date__gte=week_ago
        ).exclude(status__in=["cancelled", "no_show"]).count()

        paid_invoices = Invoice.objects.filter(status="paid", paid_at__date__gte=first_of_month)
        revenue_this_month = float(paid_invoices.aggregate(total=Sum("total"))["total"] or 0)

        pending_qs = Invoice.objects.filter(status="pending")
        pending_count = pending_qs.count()
        pending_amount = float(pending_qs.aggregate(total=Sum("total"))["total"] or 0)

        low_stock = sum(1 for i in Inventory.objects.all() if float(i.quantity) <= float(i.min_quantity))

        return Response({
            "totalPatients": total_patients,
            "totalAppointmentsToday": total_today,
            "completedAppointmentsToday": completed_today,
            "pendingAppointmentsToday": pending_today,
            "totalRevenueThisMonth": revenue_this_month,
            "totalPendingInvoices": pending_count,
            "pendingInvoicesAmount": pending_amount,
            "lowStockCount": low_stock,
            "newPatientsThisMonth": new_patients,
            "appointmentsThisWeek": appts_week,
        })


class AppointmentsTodayView(APIView):
    def get(self, request):
        today = date.today()
        qs = Appointment.objects.select_related("patient", "dentist").filter(
            appointment_date=today
        ).order_by("appointment_time")
        return Response([{
            "id": a.id,
            "patientId": a.patient_id,
            "dentistId": a.dentist_id,
            "patient": {"id": a.patient.id, "firstName": a.patient.first_name, "lastName": a.patient.last_name, "phone": a.patient.phone, "email": a.patient.email, "cedula": a.patient.cedula},
            "dentist": {"id": a.dentist.id, "name": a.dentist.name, "email": a.dentist.email, "role": a.dentist.role},
            "appointmentDate": str(a.appointment_date),
            "appointmentTime": a.appointment_time,
            "durationMinutes": a.duration_minutes,
            "status": a.status,
            "reason": a.reason,
            "notes": a.notes,
            "createdAt": a.created_at,
            "updatedAt": a.updated_at,
        } for a in qs])


class RecentPatientsView(APIView):
    def get(self, request):
        patients = Patient.objects.order_by("-created_at")[:10]
        return Response([{
            "id": p.id, "firstName": p.first_name, "lastName": p.last_name,
            "cedula": p.cedula, "phone": p.phone, "email": p.email,
            "createdAt": p.created_at,
        } for p in patients])


class RevenueByMonthView(APIView):
    def get(self, request):
        year = date.today().year
        MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXTRACT(MONTH FROM paid_at)::int as month_num,
                       COALESCE(SUM(total::numeric), 0) as revenue,
                       COUNT(*) as count
                FROM invoices
                WHERE status = 'paid' AND EXTRACT(YEAR FROM paid_at) = %s
                GROUP BY EXTRACT(MONTH FROM paid_at)
                ORDER BY EXTRACT(MONTH FROM paid_at)
            """, [year])
            rows = cursor.fetchall()
        return Response([{
            "monthNumber": row[0],
            "month": MONTHS[row[0] - 1],
            "revenue": float(row[1]),
            "invoiceCount": row[2],
        } for row in rows])


class LowStockAlertsView(APIView):
    def get(self, request):
        items = [i for i in Inventory.objects.order_by("name") if float(i.quantity) <= float(i.min_quantity)]
        return Response([{
            "id": i.id, "name": i.name, "category": i.category, "unit": i.unit,
            "quantity": float(i.quantity), "minQuantity": float(i.min_quantity),
            "unitCost": float(i.unit_cost) if i.unit_cost else None,
            "isLowStock": True,
        } for i in items])

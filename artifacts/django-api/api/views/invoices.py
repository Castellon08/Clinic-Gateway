from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from ..models import Invoice, Patient, Appointment


def _patient_dict(p):
    if not p:
        return None
    return {"id": p.id, "firstName": p.first_name, "lastName": p.last_name, "phone": p.phone, "email": p.email, "cedula": p.cedula}


def _invoice_dict(inv):
    return {
        "id": inv.id,
        "patientId": inv.patient_id,
        "appointmentId": inv.appointment_id,
        "invoiceNumber": inv.invoice_number,
        "items": inv.items,
        "subtotal": str(inv.subtotal),
        "total": str(inv.total),
        "status": inv.status,
        "paymentMethod": inv.payment_method,
        "notes": inv.notes,
        "issuedAt": inv.issued_at,
        "paidAt": inv.paid_at,
        "createdAt": inv.created_at,
        "updatedAt": inv.updated_at,
        "patient": _patient_dict(inv.patient),
    }


def _generate_invoice_number():
    from datetime import datetime
    count = Invoice.objects.count()
    num = str(count + 1).zfill(6)
    year = datetime.now().year
    return f"INV-{year}-{num}"


def _apply_markup(items, markup_percent):
    pct = max(0, float(markup_percent)) if markup_percent else 0
    result = []
    for item in items:
        base_total = float(item.get("quantity", 0)) * float(item.get("unitPrice", 0))
        total = base_total + base_total * (pct / 100)
        result.append({**item, "total": total})
    return result


class InvoiceListView(APIView):
    def get(self, request):
        qs = Invoice.objects.select_related("patient").all()
        user = request.user

        if user.role == "dentist":
            patient_ids = list(
                Appointment.objects.filter(dentist_id=user.pk)
                .values_list("patient_id", flat=True)
                .distinct()
            )
            if not patient_ids:
                return Response([])
            qs = qs.filter(patient_id__in=patient_ids)
        elif request.query_params.get("patientId"):
            qs = qs.filter(patient_id=int(request.query_params["patientId"]))

        if request.query_params.get("status"):
            qs = qs.filter(status=request.query_params["status"])
        if request.query_params.get("dateFrom"):
            qs = qs.filter(created_at__gte=request.query_params["dateFrom"])
        if request.query_params.get("dateTo"):
            qs = qs.filter(created_at__lte=request.query_params["dateTo"])

        return Response([_invoice_dict(inv) for inv in qs.order_by("-created_at")])

    def post(self, request):
        data = request.data
        patient_id = data.get("patientId")
        items = data.get("items", [])
        if not patient_id or not items:
            return Response({"error": "patientId and items are required"}, status=status.HTTP_400_BAD_REQUEST)

        markup_percent = float(data.get("markupPercent", 0)) if request.user.role == "admin" else 0
        invoice_items = _apply_markup(items, markup_percent)
        subtotal = sum(i.get("total", 0) for i in invoice_items)
        invoice_number = _generate_invoice_number()

        paid_at = None
        if data.get("status") == "paid":
            from datetime import datetime
            paid_at = datetime.now()

        inv = Invoice.objects.create(
            patient_id=int(patient_id),
            appointment_id=data.get("appointmentId"),
            invoice_number=invoice_number,
            items=[{k: v for k, v in i.items()} for i in invoice_items],
            subtotal=subtotal,
            total=subtotal,
            status=data.get("status", "pending"),
            payment_method=data.get("paymentMethod"),
            notes=data.get("notes"),
            paid_at=paid_at,
        )
        inv = Invoice.objects.select_related("patient").get(pk=inv.pk)
        result = _invoice_dict(inv)
        result["markupPercent"] = markup_percent
        return Response(result, status=status.HTTP_201_CREATED)


class InvoiceDetailView(APIView):
    def _get(self, pk):
        try:
            return Invoice.objects.select_related("patient").get(pk=pk)
        except Invoice.DoesNotExist:
            return None

    def get(self, request, pk):
        inv = self._get(pk)
        if not inv:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_invoice_dict(inv))

    def put(self, request, pk):
        inv = self._get(pk)
        if not inv:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if "status" in data:
            inv.status = data["status"]
            if data["status"] == "paid" and not inv.paid_at:
                from datetime import datetime
                inv.paid_at = datetime.now()
        if "paymentMethod" in data:
            inv.payment_method = data["paymentMethod"]
        if "notes" in data:
            inv.notes = data["notes"]
        if "items" in data:
            markup_percent = float(data.get("markupPercent", 0)) if request.user.role == "admin" else 0
            invoice_items = _apply_markup(data["items"], markup_percent)
            subtotal = sum(i.get("total", 0) for i in invoice_items)
            inv.items = invoice_items
            inv.subtotal = subtotal
            inv.total = subtotal
        inv.save()
        return Response(_invoice_dict(inv))

    def delete(self, request, pk):
        inv = self._get(pk)
        if not inv:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        inv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

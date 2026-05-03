from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q

from ..models import Patient, Appointment
from ..serializers import PatientSerializer


def _patient_to_dict(p):
    return {
        "id": p.id,
        "cedula": p.cedula,
        "firstName": p.first_name,
        "lastName": p.last_name,
        "birthDate": str(p.birth_date) if p.birth_date else None,
        "gender": p.gender,
        "phone": p.phone,
        "email": p.email,
        "address": p.address,
        "bloodType": p.blood_type,
        "allergies": p.allergies,
        "medicalNotes": p.medical_notes,
        "odontogramData": p.odontogram_data or {},
        "createdAt": p.created_at,
        "updatedAt": p.updated_at,
    }


class PatientListView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "")
        page = max(1, int(request.query_params.get("page", 1)))
        limit = min(100, max(1, int(request.query_params.get("limit", 50))))
        offset = (page - 1) * limit

        qs = Patient.objects.all()

        if request.user.role == "dentist":
            patient_ids = list(
                Appointment.objects.filter(dentist_id=request.user.pk)
                .values_list("patient_id", flat=True)
                .distinct()
            )
            if not patient_ids:
                return Response({"data": [], "total": 0, "page": page, "limit": limit})
            qs = qs.filter(id__in=patient_ids)

        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(cedula__icontains=search) |
                Q(phone__icontains=search)
            )

        total = qs.count()
        patients = qs[offset:offset + limit]
        return Response({"data": [_patient_to_dict(p) for p in patients], "total": total, "page": page, "limit": limit})

    def post(self, request):
        data = request.data
        first_name = data.get("firstName") or data.get("first_name")
        last_name = data.get("lastName") or data.get("last_name")
        if not first_name or not last_name:
            return Response({"error": "firstName and lastName are required"}, status=status.HTTP_400_BAD_REQUEST)
        patient = Patient.objects.create(
            first_name=first_name,
            last_name=last_name,
            cedula=data.get("cedula"),
            birth_date=data.get("birthDate") or data.get("birth_date"),
            gender=data.get("gender"),
            phone=data.get("phone"),
            email=data.get("email"),
            address=data.get("address"),
            blood_type=data.get("bloodType") or data.get("blood_type"),
            allergies=data.get("allergies"),
            medical_notes=data.get("medicalNotes") or data.get("medical_notes"),
        )
        return Response(_patient_to_dict(patient), status=status.HTTP_201_CREATED)


class PatientDetailView(APIView):
    def _get(self, pk, request):
        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return None, Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "dentist":
            patient_ids = list(
                Appointment.objects.filter(dentist_id=request.user.pk)
                .values_list("patient_id", flat=True)
                .distinct()
            )
            if pk not in patient_ids:
                return None, Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return patient, None

    def get(self, request, pk):
        patient, err = self._get(pk, request)
        if err:
            return err
        from ..models import Appointment, ClinicalRecord, Invoice, User

        appointments = Appointment.objects.select_related("patient", "dentist").filter(
            patient_id=pk
        ).order_by("-appointment_date")

        clinical_records = ClinicalRecord.objects.select_related("patient", "dentist").filter(
            patient_id=pk
        ).order_by("-visit_date")

        invoices = Invoice.objects.select_related("patient").filter(
            patient_id=pk
        ).order_by("-created_at")

        def _user_d(u):
            if not u:
                return None
            return {"id": u.id, "name": u.name, "email": u.email, "role": u.role}

        def _patient_min_d(p):
            if not p:
                return None
            return {"id": p.id, "firstName": p.first_name, "lastName": p.last_name, "phone": p.phone, "email": p.email, "cedula": p.cedula}

        appts_data = [{
            "id": a.id, "patientId": a.patient_id, "dentistId": a.dentist_id,
            "patient": _patient_min_d(a.patient), "dentist": _user_d(a.dentist),
            "appointmentDate": str(a.appointment_date), "appointmentTime": a.appointment_time,
            "durationMinutes": a.duration_minutes, "status": a.status,
            "reason": a.reason, "notes": a.notes, "createdAt": a.created_at, "updatedAt": a.updated_at,
        } for a in appointments]

        records_data = [{
            "id": r.id, "patientId": r.patient_id, "dentistId": r.dentist_id, "appointmentId": r.appointment_id,
            "patient": _patient_min_d(r.patient), "dentist": _user_d(r.dentist),
            "visitDate": str(r.visit_date), "chiefComplaint": r.chief_complaint,
            "diagnosis": r.diagnosis, "treatment": r.treatment, "toothNumbers": r.tooth_numbers,
            "observations": r.observations, "nextVisitNotes": r.next_visit_notes,
            "createdAt": r.created_at, "updatedAt": r.updated_at,
        } for r in clinical_records]

        invoices_data = [{
            "id": inv.id, "patientId": inv.patient_id, "appointmentId": inv.appointment_id,
            "invoiceNumber": inv.invoice_number, "items": inv.items,
            "subtotal": str(inv.subtotal), "total": str(inv.total),
            "status": inv.status, "paymentMethod": inv.payment_method, "notes": inv.notes,
            "issuedAt": inv.issued_at, "paidAt": inv.paid_at, "createdAt": inv.created_at,
        } for inv in invoices]

        return Response({
            **_patient_to_dict(patient),
            "appointments": appts_data,
            "clinicalRecords": records_data,
            "invoices": invoices_data,
        })

    def put(self, request, pk):
        patient, err = self._get(pk, request)
        if err:
            return err
        data = request.data
        field_map = {
            "firstName": "first_name", "lastName": "last_name", "birthDate": "birth_date",
            "bloodType": "blood_type", "medicalNotes": "medical_notes",
        }
        for json_key, model_field in field_map.items():
            if json_key in data:
                setattr(patient, model_field, data[json_key])
        for field in ["cedula", "gender", "phone", "email", "address", "allergies"]:
            if field in data:
                setattr(patient, field, data[field])
        patient.save()
        return Response(_patient_to_dict(patient))

    def delete(self, request, pk):
        if request.user.role not in ("admin", "receptionist"):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PatientOdontogramView(APIView):
    def put(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
        patient.odontogram_data = request.data.get("odontogramData", {})
        patient.save()
        return Response(_patient_to_dict(patient))

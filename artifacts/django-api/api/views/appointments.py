from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..models import Appointment, Patient, User

WORK_HOURS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
]


def _user_dict(u):
    if not u:
        return None
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role}


def _patient_dict(p):
    if not p:
        return None
    return {"id": p.id, "firstName": p.first_name, "lastName": p.last_name, "phone": p.phone, "email": p.email, "cedula": p.cedula}


def _appt_dict(a):
    return {
        "id": a.id,
        "patientId": a.patient_id,
        "dentistId": a.dentist_id,
        "patient": _patient_dict(a.patient),
        "dentist": _user_dict(a.dentist),
        "appointmentDate": str(a.appointment_date),
        "appointmentTime": a.appointment_time,
        "durationMinutes": a.duration_minutes,
        "status": a.status,
        "reason": a.reason,
        "notes": a.notes,
        "createdAt": a.created_at,
        "updatedAt": a.updated_at,
    }


class AvailabilityView(APIView):
    def get(self, request):
        dentist_id = request.query_params.get("dentistId")
        date = request.query_params.get("date")
        if not dentist_id or not date:
            return Response({"error": "dentistId and date are required"}, status=status.HTTP_400_BAD_REQUEST)
        booked = list(
            Appointment.objects.filter(
                dentist_id=int(dentist_id),
                appointment_date=date,
            ).exclude(status__in=["cancelled", "no_show"])
            .values_list("appointment_time", flat=True)
        )
        available = [h for h in WORK_HOURS if h not in booked]
        return Response({"date": date, "dentistId": int(dentist_id), "availableSlots": available, "bookedSlots": booked})


class AppointmentListView(APIView):
    def get(self, request):
        qs = Appointment.objects.select_related("patient", "dentist").all()
        user = request.user

        if user.role == "dentist":
            qs = qs.filter(dentist_id=user.pk)
        elif request.query_params.get("dentistId"):
            qs = qs.filter(dentist_id=int(request.query_params["dentistId"]))

        if request.query_params.get("date"):
            qs = qs.filter(appointment_date=request.query_params["date"])
        if request.query_params.get("dateFrom"):
            qs = qs.filter(appointment_date__gte=request.query_params["dateFrom"])
        if request.query_params.get("dateTo"):
            qs = qs.filter(appointment_date__lte=request.query_params["dateTo"])
        if request.query_params.get("status"):
            qs = qs.filter(status=request.query_params["status"])
        if request.query_params.get("patientId"):
            qs = qs.filter(patient_id=int(request.query_params["patientId"]))

        qs = qs.order_by("appointment_date", "appointment_time")
        return Response([_appt_dict(a) for a in qs])

    def post(self, request):
        data = request.data
        patient_id = data.get("patientId")
        dentist_id = data.get("dentistId")
        appointment_date = data.get("appointmentDate")
        appointment_time = data.get("appointmentTime")

        if not all([patient_id, dentist_id, appointment_date, appointment_time]):
            return Response({"error": "patientId, dentistId, appointmentDate, appointmentTime are required"}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == "dentist":
            dentist_id = request.user.pk

        conflict = Appointment.objects.filter(
            dentist_id=int(dentist_id),
            appointment_date=appointment_date,
            appointment_time=appointment_time,
        ).exclude(status__in=["cancelled", "no_show"]).exists()

        if conflict:
            return Response({"error": "Conflict", "message": "Time slot already booked for this dentist"}, status=status.HTTP_409_CONFLICT)

        appt = Appointment.objects.create(
            patient_id=int(patient_id),
            dentist_id=int(dentist_id),
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            duration_minutes=data.get("durationMinutes", 30),
            reason=data.get("reason"),
            notes=data.get("notes"),
            status=data.get("status", "pending"),
        )
        appt = Appointment.objects.select_related("patient", "dentist").get(pk=appt.pk)
        return Response(_appt_dict(appt), status=status.HTTP_201_CREATED)


class AppointmentDetailView(APIView):
    def _get(self, pk):
        try:
            return Appointment.objects.select_related("patient", "dentist").get(pk=pk)
        except Appointment.DoesNotExist:
            return None

    def get(self, request, pk):
        a = self._get(pk)
        if not a:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_appt_dict(a))

    def put(self, request, pk):
        a = self._get(pk)
        if not a:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        field_map = {
            "appointmentDate": "appointment_date",
            "appointmentTime": "appointment_time",
            "durationMinutes": "duration_minutes",
            "dentistId": "dentist_id",
        }
        for json_key, model_field in field_map.items():
            if json_key in data:
                setattr(a, model_field, data[json_key])
        for field in ["status", "reason", "notes"]:
            if field in data:
                setattr(a, field, data[field])
        a.save()
        a = Appointment.objects.select_related("patient", "dentist").get(pk=pk)
        return Response(_appt_dict(a))

    def delete(self, request, pk):
        a = self._get(pk)
        if not a:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        a.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

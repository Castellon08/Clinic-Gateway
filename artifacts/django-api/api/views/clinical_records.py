import base64

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from ..models import ClinicalRecord, ClinicalRecordAttachment

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _user_dict(u):
    if not u:
        return None
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role}


def _patient_dict(p):
    if not p:
        return None
    return {"id": p.id, "firstName": p.first_name, "lastName": p.last_name, "phone": p.phone, "email": p.email, "cedula": p.cedula}


def _record_dict(r):
    return {
        "id": r.id,
        "patientId": r.patient_id,
        "dentistId": r.dentist_id,
        "appointmentId": r.appointment_id,
        "patient": _patient_dict(r.patient),
        "dentist": _user_dict(r.dentist),
        "visitDate": str(r.visit_date),
        "chiefComplaint": r.chief_complaint,
        "diagnosis": r.diagnosis,
        "treatment": r.treatment,
        "toothNumbers": r.tooth_numbers,
        "observations": r.observations,
        "nextVisitNotes": r.next_visit_notes,
        "createdAt": r.created_at,
        "updatedAt": r.updated_at,
    }


class ClinicalRecordListView(APIView):
    def get(self, request):
        qs = ClinicalRecord.objects.select_related("patient", "dentist").all()
        user = request.user

        if user.role == "dentist":
            qs = qs.filter(dentist_id=user.pk)
        elif request.query_params.get("dentistId"):
            qs = qs.filter(dentist_id=int(request.query_params["dentistId"]))

        if request.query_params.get("patientId"):
            qs = qs.filter(patient_id=int(request.query_params["patientId"]))

        return Response([_record_dict(r) for r in qs.order_by("visit_date")])

    def post(self, request):
        data = request.data
        patient_id = data.get("patientId")
        dentist_id = data.get("dentistId")
        visit_date = data.get("visitDate")
        diagnosis = data.get("diagnosis")
        treatment = data.get("treatment")

        if not all([patient_id, visit_date, diagnosis, treatment]):
            return Response({"error": "patientId, visitDate, diagnosis, treatment are required"}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == "dentist":
            dentist_id = request.user.pk

        if not dentist_id:
            return Response({"error": "dentistId is required"}, status=status.HTTP_400_BAD_REQUEST)

        record = ClinicalRecord.objects.create(
            patient_id=int(patient_id),
            dentist_id=int(dentist_id),
            appointment_id=data.get("appointmentId"),
            visit_date=visit_date,
            chief_complaint=data.get("chiefComplaint"),
            diagnosis=diagnosis,
            treatment=treatment,
            tooth_numbers=data.get("toothNumbers"),
            observations=data.get("observations"),
            next_visit_notes=data.get("nextVisitNotes"),
        )
        record = ClinicalRecord.objects.select_related("patient", "dentist").get(pk=record.pk)
        return Response(_record_dict(record), status=status.HTTP_201_CREATED)


class ClinicalRecordDetailView(APIView):
    def _get(self, pk):
        try:
            return ClinicalRecord.objects.select_related("patient", "dentist").get(pk=pk)
        except ClinicalRecord.DoesNotExist:
            return None

    def get(self, request, pk):
        r = self._get(pk)
        if not r:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_record_dict(r))

    def put(self, request, pk):
        r = self._get(pk)
        if not r:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        field_map = {
            "visitDate": "visit_date",
            "chiefComplaint": "chief_complaint",
            "toothNumbers": "tooth_numbers",
            "nextVisitNotes": "next_visit_notes",
        }
        for json_key, model_field in field_map.items():
            if json_key in data:
                setattr(r, model_field, data[json_key])
        for field in ["diagnosis", "treatment", "observations"]:
            if field in data:
                setattr(r, field, data[field])
        r.save()
        r = ClinicalRecord.objects.select_related("patient", "dentist").get(pk=pk)
        return Response(_record_dict(r))

    def delete(self, request, pk):
        r = self._get(pk)
        if not r:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        r.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AttachmentListView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, record_id):
        attachments = ClinicalRecordAttachment.objects.filter(clinical_record_id=record_id).order_by("uploaded_at")
        return Response([{
            "id": a.id,
            "clinicalRecordId": a.clinical_record_id,
            "originalName": a.original_name,
            "mimeType": a.mime_type,
            "fileSize": a.file_size,
            "uploadedAt": a.uploaded_at,
        } for a in attachments])

    def post(self, request, record_id):
        try:
            record = ClinicalRecord.objects.get(pk=record_id)
        except ClinicalRecord.DoesNotExist:
            return Response({"error": "Expediente no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == "dentist" and record.dentist_id != request.user.pk:
            return Response({"error": "No tiene permiso"}, status=status.HTTP_403_FORBIDDEN)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No se recibió ningún archivo"}, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_file.content_type not in ALLOWED_MIME_TYPES:
            return Response({"error": "Tipo de archivo no permitido"}, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_file.size > 20 * 1024 * 1024:
            return Response({"error": "Archivo demasiado grande (máx. 20 MB)"}, status=status.HTTP_400_BAD_REQUEST)

        file_data = base64.b64encode(uploaded_file.read()).decode("utf-8")
        attachment = ClinicalRecordAttachment.objects.create(
            clinical_record_id=record_id,
            original_name=uploaded_file.name,
            mime_type=uploaded_file.content_type,
            file_size=uploaded_file.size,
            file_data=file_data,
        )
        return Response({
            "id": attachment.id,
            "clinicalRecordId": attachment.clinical_record_id,
            "originalName": attachment.original_name,
            "mimeType": attachment.mime_type,
            "fileSize": attachment.file_size,
            "uploadedAt": attachment.uploaded_at,
        }, status=status.HTTP_201_CREATED)


class AttachmentDownloadView(APIView):
    def get(self, request, record_id, attachment_id):
        try:
            attachment = ClinicalRecordAttachment.objects.get(pk=attachment_id, clinical_record_id=record_id)
        except ClinicalRecordAttachment.DoesNotExist:
            return Response({"error": "Adjunto no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        from django.http import HttpResponse
        file_bytes = base64.b64decode(attachment.file_data)
        response = HttpResponse(file_bytes, content_type=attachment.mime_type)
        response["Content-Disposition"] = f'attachment; filename="{attachment.original_name}"'
        response["Content-Length"] = len(file_bytes)
        return response


class AttachmentDeleteView(APIView):
    def delete(self, request, record_id, attachment_id):
        if request.user.role == "dentist":
            try:
                record = ClinicalRecord.objects.get(pk=record_id)
                if record.dentist_id != request.user.pk:
                    return Response({"error": "No tiene permiso"}, status=status.HTTP_403_FORBIDDEN)
            except ClinicalRecord.DoesNotExist:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            attachment = ClinicalRecordAttachment.objects.get(pk=attachment_id, clinical_record_id=record_id)
        except ClinicalRecordAttachment.DoesNotExist:
            return Response({"error": "Adjunto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

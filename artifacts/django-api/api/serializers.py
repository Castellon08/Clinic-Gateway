from rest_framework import serializers
from .models import User, Patient, Appointment, ClinicalRecord, ClinicalRecordAttachment, Invoice, Inventory


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "is_active", "created_at"]


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = "__all__"


class PatientMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ["id", "first_name", "last_name", "phone", "email", "cedula"]


class UserMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "role"]


class AppointmentSerializer(serializers.ModelSerializer):
    patient = PatientMinSerializer(read_only=True)
    dentist = UserMinSerializer(read_only=True)
    patient_id = serializers.IntegerField(write_only=True)
    dentist_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Appointment
        fields = ["id", "patient_id", "dentist_id", "patient", "dentist",
                  "appointment_date", "appointment_time", "duration_minutes",
                  "status", "reason", "notes", "created_at", "updated_at"]


class ClinicalRecordSerializer(serializers.ModelSerializer):
    patient = PatientMinSerializer(read_only=True)
    dentist = UserMinSerializer(read_only=True)
    patient_id = serializers.IntegerField(write_only=True)
    dentist_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ClinicalRecord
        fields = ["id", "patient_id", "dentist_id", "appointment_id", "patient", "dentist",
                  "visit_date", "chief_complaint", "diagnosis", "treatment",
                  "tooth_numbers", "observations", "next_visit_notes", "created_at", "updated_at"]


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalRecordAttachment
        fields = ["id", "clinical_record_id", "original_name", "mime_type", "file_size", "uploaded_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    patient = PatientMinSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = ["id", "patient_id", "appointment_id", "invoice_number", "items",
                  "subtotal", "total", "status", "payment_method", "notes",
                  "issued_at", "paid_at", "created_at", "updated_at", "patient"]


class InventorySerializer(serializers.ModelSerializer):
    is_low_stock = serializers.SerializerMethodField()
    quantity = serializers.FloatField()
    min_quantity = serializers.FloatField()
    unit_cost = serializers.FloatField(allow_null=True)

    def get_is_low_stock(self, obj):
        return float(obj.quantity) <= float(obj.min_quantity)

    class Meta:
        model = Inventory
        fields = ["id", "name", "category", "unit", "quantity", "min_quantity",
                  "unit_cost", "supplier", "notes", "created_at", "updated_at", "is_low_stock"]

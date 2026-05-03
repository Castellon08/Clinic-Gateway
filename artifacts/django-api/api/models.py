from django.db import models


class User(models.Model):
    name = models.TextField()
    email = models.TextField(unique=True)
    password_hash = models.TextField()
    role = models.TextField(default="receptionist")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "users"


class Patient(models.Model):
    cedula = models.TextField(unique=True, null=True, blank=True)
    first_name = models.TextField()
    last_name = models.TextField()
    birth_date = models.DateField(null=True, blank=True)
    gender = models.TextField(null=True, blank=True)
    phone = models.TextField(null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    blood_type = models.TextField(null=True, blank=True)
    allergies = models.TextField(null=True, blank=True)
    medical_notes = models.TextField(null=True, blank=True)
    odontogram_data = models.JSONField(default=dict, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "patients"


class Appointment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="patient_id")
    dentist = models.ForeignKey(User, on_delete=models.RESTRICT, db_column="dentist_id")
    appointment_date = models.DateField()
    appointment_time = models.TextField()
    duration_minutes = models.IntegerField(default=30)
    status = models.TextField(default="pending")
    reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "appointments"


class ClinicalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="patient_id")
    dentist = models.ForeignKey(User, on_delete=models.RESTRICT, db_column="dentist_id")
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, db_column="appointment_id")
    visit_date = models.DateField()
    visit_time = models.TextField(null=True, blank=True)
    doctor_name = models.TextField(null=True, blank=True)
    service = models.TextField(null=True, blank=True)
    age = models.TextField(null=True, blank=True)
    birth_place = models.TextField(null=True, blank=True)
    sex = models.TextField(null=True, blank=True)
    procedence = models.TextField(null=True, blank=True)
    escolaridad = models.TextField(null=True, blank=True)
    profession = models.TextField(null=True, blank=True)
    address_habitual = models.TextField(null=True, blank=True)
    father_name = models.TextField(null=True, blank=True)
    mother_name = models.TextField(null=True, blank=True)
    motivo_consulta = models.TextField(null=True, blank=True)
    historia_enfermedad_actual = models.TextField(null=True, blank=True)
    interrogatorio_sistemas = models.TextField(null=True, blank=True)
    antecedentes_familiares = models.TextField(null=True, blank=True)
    enfermedades_infectocontagiosas = models.JSONField(default=list, blank=True)
    enfermedades_hereditarias = models.JSONField(default=list, blank=True)
    otras_infectocontagiosas = models.TextField(null=True, blank=True)
    otras_hereditarias = models.TextField(null=True, blank=True)
    signos_vitales_fc = models.TextField(null=True, blank=True)
    signos_vitales_fr = models.TextField(null=True, blank=True)
    signos_vitales_ta = models.TextField(null=True, blank=True)
    signos_vitales_temp = models.TextField(null=True, blank=True)
    peso = models.TextField(null=True, blank=True)
    talla = models.TextField(null=True, blank=True)
    area_superficie_corporal = models.TextField(null=True, blank=True)
    imc = models.TextField(null=True, blank=True)
    aspecto_general = models.TextField(null=True, blank=True)
    piel_mucosas = models.TextField(null=True, blank=True)
    examen_radiografico = models.TextField(null=True, blank=True)
    fotos = models.TextField(null=True, blank=True)
    diagnosticos = models.TextField(null=True, blank=True)
    plan_tratamiento = models.TextField(null=True, blank=True)
    presupuesto = models.TextField(null=True, blank=True)
    tratamiento_realizado = models.TextField(null=True, blank=True)
    chief_complaint = models.TextField(null=True, blank=True)
    diagnosis = models.TextField()
    treatment = models.TextField()
    tooth_numbers = models.TextField(null=True, blank=True)
    observations = models.TextField(null=True, blank=True)
    next_visit_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "clinical_records"


class ClinicalRecordAttachment(models.Model):
    clinical_record = models.ForeignKey(ClinicalRecord, on_delete=models.CASCADE, db_column="clinical_record_id", related_name="attachments")
    original_name = models.TextField()
    mime_type = models.TextField()
    file_size = models.BigIntegerField()
    file_data = models.TextField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "clinical_record_attachments"


class Invoice(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="patient_id")
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, db_column="appointment_id")
    invoice_number = models.TextField(unique=True)
    items = models.JSONField(default=list)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.TextField(default="pending")
    payment_method = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "invoices"


class Inventory(models.Model):
    name = models.TextField()
    category = models.TextField(null=True, blank=True)
    unit = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    supplier = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "inventory"

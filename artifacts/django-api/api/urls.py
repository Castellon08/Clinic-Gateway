from django.urls import path
from .views.health import HealthView
from .views.auth import LoginView, MeView, LogoutView
from .views.users import UserListView, UserDetailView
from .views.patients import PatientListView, PatientDetailView, PatientOdontogramView
from .views.appointments import AvailabilityView, AppointmentListView, AppointmentDetailView
from .views.clinical_records import (
    ClinicalRecordListView, ClinicalRecordDetailView,
    AttachmentListView, AttachmentDownloadView, AttachmentDeleteView,
)
from .views.invoices import InvoiceListView, InvoiceDetailView
from .views.inventory import InventoryListView, InventoryDetailView, InventoryAdjustView
from .views.dashboard import (
    DashboardSummaryView, AppointmentsTodayView, RecentPatientsView,
    RevenueByMonthView, LowStockAlertsView,
)

urlpatterns = [
    path("healthz", HealthView.as_view()),

    # Auth
    path("auth/login", LoginView.as_view()),
    path("auth/me", MeView.as_view()),
    path("auth/logout", LogoutView.as_view()),

    # Users
    path("users", UserListView.as_view()),
    path("users/<int:pk>", UserDetailView.as_view()),

    # Patients
    path("patients", PatientListView.as_view()),
    path("patients/<int:pk>", PatientDetailView.as_view()),
    path("patients/<int:pk>/odontogram", PatientOdontogramView.as_view()),

    # Appointments
    path("appointments/availability", AvailabilityView.as_view()),
    path("appointments", AppointmentListView.as_view()),
    path("appointments/<int:pk>", AppointmentDetailView.as_view()),

    # Clinical Records
    path("clinical-records", ClinicalRecordListView.as_view()),
    path("clinical-records/<int:pk>", ClinicalRecordDetailView.as_view()),
    path("clinical-records/<int:record_id>/attachments", AttachmentListView.as_view()),
    path("clinical-records/<int:record_id>/attachments/<int:attachment_id>/download", AttachmentDownloadView.as_view()),
    path("clinical-records/<int:record_id>/attachments/<int:attachment_id>", AttachmentDeleteView.as_view()),

    # Invoices
    path("invoices", InvoiceListView.as_view()),
    path("invoices/<int:pk>", InvoiceDetailView.as_view()),

    # Inventory
    path("inventory", InventoryListView.as_view()),
    path("inventory/<int:pk>", InventoryDetailView.as_view()),
    path("inventory/<int:pk>/adjust", InventoryAdjustView.as_view()),

    # Dashboard
    path("dashboard/summary", DashboardSummaryView.as_view()),
    path("dashboard/appointments-today", AppointmentsTodayView.as_view()),
    path("dashboard/recent-patients", RecentPatientsView.as_view()),
    path("dashboard/revenue-by-month", RevenueByMonthView.as_view()),
    path("dashboard/low-stock-alerts", LowStockAlertsView.as_view()),
]

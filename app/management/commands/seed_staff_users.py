from django.core.management.base import BaseCommand

from app.models import UserAccount
from app.models.onboard_models import UserRole


class Command(BaseCommand):
    help = "Create or update one admin user and one manager user for API testing."

    def add_arguments(self, parser):
        parser.add_argument("--admin-email", required=True)
        parser.add_argument("--admin-password", required=True)
        parser.add_argument("--manager-email", required=True)
        parser.add_argument("--manager-password", required=True)
        parser.add_argument("--admin-name", default="Platform Admin")
        parser.add_argument("--manager-name", default="Operations Manager")

    def handle(self, *args, **options):
        admin_user, _ = UserAccount.objects.update_or_create(
            email=options["admin_email"].strip().lower(),
            defaults={
                "name": options["admin_name"].strip(),
                "role": UserRole.ADMIN,
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
                "password_ready": True,
            },
        )
        admin_user.set_password(options["admin_password"])
        admin_user.save(update_fields=["password", "updated_at"])

        manager_user, _ = UserAccount.objects.update_or_create(
            email=options["manager_email"].strip().lower(),
            defaults={
                "name": options["manager_name"].strip(),
                "role": UserRole.MANAGER,
                "is_active": True,
                "is_staff": False,
                "is_superuser": False,
                "password_ready": True,
            },
        )
        manager_user.set_password(options["manager_password"])
        manager_user.save(update_fields=["password", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Admin and manager users are ready."))

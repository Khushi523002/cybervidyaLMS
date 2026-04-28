import secrets
import string

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    MANAGER = "manager", "Manager"
    INTERN = "intern", "Intern"


class UserAccountManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")

        email = self.normalize_email(email)
        role = extra_fields.get("role", UserRole.INTERN)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", role)
        extra_fields.setdefault("is_staff", role == UserRole.ADMIN)

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
            user.password_ready = True
        else:
            user.set_unusable_password()
            user.password_ready = False

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("role") != UserRole.ADMIN:
            raise ValueError("Superusers must have the admin role.")

        return self.create_user(email=email, password=password, **extra_fields)


class UserAccount(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.INTERN)
    education = models.CharField(max_length=255, blank=True)
    certification = models.CharField(max_length=255, blank=True)
    contact_no = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(regex=r"^[0-9+\-\s()]+$", message="Enter a valid contact number.")],
    )
    intern_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    created_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_users",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    password_ready = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    intern_can_edit = models.BooleanField(default=False)
    intern_can_delete = models.BooleanField(default=False)
    last_password_generated_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserAccountManager()

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    @property
    def is_intern(self):
        return self.role == UserRole.INTERN

    def generate_random_password(self, length=12):
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        self.set_password(password)
        self.password_ready = True
        self.must_change_password = True
        self.last_password_generated_at = timezone.now()
        return password


class UserToken(models.Model):
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="tokens")
    key = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} token"

    @classmethod
    def issue_for_user(cls, user):
        cls.objects.filter(user=user).delete()
        return cls.objects.create(user=user, key=secrets.token_hex(32))

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone


class Command(BaseCommand):
    help = 'Delete expired tokens from token_managements table'

    def handle(self, *args, **options):
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM token_managements
                    WHERE expiry < %s
                """, [timezone.now()])
                
                deleted_count = cursor.rowcount
                
                if deleted_count > 0:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully deleted {deleted_count} expired token(s)'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS('No expired tokens to delete')
                    )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error cleaning up expired tokens: {str(e)}')
            )


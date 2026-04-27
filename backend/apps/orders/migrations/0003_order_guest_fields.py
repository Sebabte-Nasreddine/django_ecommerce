from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='guest_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='order',
            name='guest_phone',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='order',
            name='guest_address',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='order',
            name='guest_city',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name='order',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='orders',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]

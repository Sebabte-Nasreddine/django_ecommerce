from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ShippingSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('shipping_price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('free_shipping_threshold', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
            ],
            options={
                'db_table': 'shipping_settings',
            },
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0002_shipping_settings'),
    ]

    operations = [
        migrations.CreateModel(
            name='BannerImage',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('desktop_image', models.CharField(blank=True, default='', max_length=500)),
                ('mobile_image', models.CharField(blank=True, default='', max_length=500)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'db_table': 'banner_image'},
        ),
    ]

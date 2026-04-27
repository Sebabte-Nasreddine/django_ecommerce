from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('products', '0001_initial'),
    ]
    operations = [
        migrations.AddField(
            model_name='category',
            name='featured',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='category',
            name='featured_order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]

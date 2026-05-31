from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Advertisement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=300)),
                ('icon', models.CharField(
                    choices=[
                        ('truck',       'Livraison'),
                        ('credit_card', 'Paiement'),
                        ('tag',         'Promotion'),
                        ('gift',        'Cadeau'),
                        ('phone',       'Téléphone'),
                        ('star',        'Étoile'),
                        ('none',        'Aucune icône'),
                    ],
                    default='none',
                    max_length=20,
                )),
                ('is_active', models.BooleanField(default=True)),
                ('order', models.PositiveIntegerField(default=0, help_text="Ordre d'affichage (0 = en premier)")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Publicité',
                'verbose_name_plural': 'Publicités',
                'db_table': 'advertisements',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]

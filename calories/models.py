from django.db import models
from django.contrib.auth.models import User


class Customer(models.Model):

    user = models.ForeignKey(User)
    max_calories = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)


class Meal(models.Model):

    date = models.DateTimeField()
    time = models.TimeField()
    text = models.TextField(null=True, blank=True)
    calories = models.DecimalField(max_digits=10, decimal_places=2)
    customer = models.ForeignKey(Customer)
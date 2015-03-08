from django.utils import timezone
import simplejson as json

from django.contrib.auth.models import User
from tastypie.test import ResourceTestCase
from django.test import Client

from calories.models import Customer, Meal


class BaseResourceTest(ResourceTestCase):

    def register(self):

        data = {"username": "jmg", "password": "1234", "password_again": "1234"}
        return self.client.post('/api/v1/customer/register/', data)

    def login(self):

        data = {"username": "jmg", "password": "1234"}
        return self.client.post('/api/v1/customer/login/', data)


class CustomerResourceTest(BaseResourceTest):

    def setUp(self):
        self.client = Client()
        super(CustomerResourceTest, self).setUp()

    def test_register_success(self):

        resp = self.register()
        self.assertValidJSONResponse(resp)

        self.assertEqual(self.deserialize(resp)['success'], True)

    def test_register_failure(self):

        data = {"username": "jmg", "password": "1234", "password_again": "12345"}
        resp = self.client.post('/api/v1/customer/register/', data)
        self.assertValidJSONResponse(resp)

        self.assertEqual(self.deserialize(resp)['success'], False)
        self.assertEqual(self.deserialize(resp)['message'], "Passwords don't match")

    def test_login_success(self):

        self.register()
        resp = self.login()
        self.assertValidJSONResponse(resp)

        self.assertEqual(self.deserialize(resp)['success'], True)

    def test_login_session(self):

        self.register()
        self.login()

        resp = self.client.post('/api/v1/customer/is_logged_in/', {})
        self.assertEqual(self.deserialize(resp), True)

    def test_login_failure(self):

        self.register()

        data = {"username": "jmg", "password": "12345"}
        resp = self.client.post('/api/v1/customer/login/', data)
        self.assertValidJSONResponse(resp)

        self.assertEqual(self.deserialize(resp)['success'], False)

    def test_logout(self):

        self.register()
        self.login()
        resp = self.client.post('/api/v1/customer/logout/', {})
        self.assertValidJSONResponse(resp)

        self.assertEqual(self.deserialize(resp)['success'], True)


class MealResourceTest(BaseResourceTest):

    def setUp(self):
        self.client = Client()
        super(MealResourceTest, self).setUp()

    def create_meal(self):

        self.customer = Customer.objects.all()[0]
        self.date_time = timezone.now()

        self.post_data = {
            "date": self.date_time.isoformat(),
            "time": self.date_time.time().isoformat(),
            "text": "This is my first meal",
            "calories": 100,
            "customer": "/api/v1/customer/%s/" % self.customer.id,
        }
        return self.client.post('/api/v1/meal/', json.dumps(self.post_data), content_type='application/json')

    def test_create_meal(self):

        self.register()
        self.login()
        resp = self.create_meal()

        self.assertHttpCreated(resp)

        self.post_data["customer"] = self.customer.id
        self.post_data.pop("time")

        meal = Meal.objects.get(**self.post_data)
        self.assertEqual(meal.calories, self.post_data["calories"])
        self.assertEqual(meal.date, self.date_time)
        self.assertEqual(meal.text, self.post_data["text"])

    def test_get_meals(self):

        self.register()
        self.login()
        for x in range(3):
            self.create_meal()

        resp = self.client.get("/api/v1/meal/")
        self.assertEqual(len(self.deserialize(resp)['objects']), 3)

        for meal in self.deserialize(resp)['objects']:
            self.assertEqual(int(meal["calories"]), self.post_data["calories"])
            self.assertEqual(meal["text"], self.post_data["text"])

    def test_delete_meal(self):

        self.register()
        self.login()
        self.create_meal()

        self.assertEqual(Meal.objects.count(), 1)
        resp = self.client.delete("/api/v1/meal/1/")
        self.assertEqual(Meal.objects.count(), 0)

    def test_create_meal_without_login(self):

        self.register()
        self.login()
        resp = self.client.post('/api/v1/customer/logout/', {})

        self.create_meal()

        self.assertEqual(Meal.objects.count(), 0)
        resp = self.create_meal()

        self.assertEqual(resp.status_code, 401)
        self.assertEqual(Meal.objects.count(), 0)
from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie.authorization import Authorization
from tastypie.authentication import SessionAuthentication
from tastypie import fields
from calories.models import Customer, Meal
from django.conf.urls import url
from services import CustomerService


class BaseApiResource(ModelResource):

    def response_success(self, request, data=None):

        response = {"success": True}
        if data is not None:
            response.update(data)

        return self.create_response(request, response)

    def response_failure(self, request, message):

        response = {"success": False, "message": message}
        return self.create_response(request, response)


class CustomerResource(BaseApiResource):

    service = CustomerService()

    class Meta:
        queryset = Customer.objects.all()
        resource_name = "customer"
        #authentication = SessionAuthentication()

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/login/$" % (self._meta.resource_name, ), self.wrap_view('login'), name="api_login"),
            url(r"^(?P<resource_name>%s)/logout/$" % (self._meta.resource_name, ), self.wrap_view('logout'), name="api_logout"),
            url(r"^(?P<resource_name>%s)/register/$" % (self._meta.resource_name, ), self.wrap_view('register'), name="api_register"),
        ]

    def login(self, request, **kwargs):

        username = request.POST.get("username")
        password = request.POST.get("password")

        try:
            customer = self.service.login(request, username, password)
            return self.response_success(request, data={"id": customer.id})
        except Exception, e:
            return self.response_failure(request, str(e))

    def logout(self, request, **kwargs):

        self.service.logout(request)
        return self.response_success(request)

    def register(self, request, **kwargs):

        username = request.POST.get("username")
        password = request.POST.get("password")
        password_again = request.POST.get("password_again")

        try:
            customer = self.service.register(request, username, password, password_again)
            return self.response_success(request, data={"id": customer.id})
        except Exception, e:
            return self.response_failure(request, str(e))


class MealResource(BaseApiResource):

    customer = fields.ForeignKey(CustomerResource, 'customer')

    class Meta:
        queryset = Meal.objects.all()
        resource_name = "meal"
        authorization = Authorization()
        #authentication = SessionAuthentication()

    filtering = {
        'customer': ALL_WITH_RELATIONS,
        'date_time': ['exact', 'lt', 'lte', 'gte', 'gt']
    }
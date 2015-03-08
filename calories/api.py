from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie.authorization import Authorization
from tastypie.authentication import SessionAuthentication, BasicAuthentication, Authentication
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
        authorization = Authorization()
        always_return_data = True

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/login/$" % (self._meta.resource_name, ), self.wrap_view('login'), name="api_login"),
            url(r"^(?P<resource_name>%s)/logout/$" % (self._meta.resource_name, ), self.wrap_view('logout'), name="api_logout"),
            url(r"^(?P<resource_name>%s)/register/$" % (self._meta.resource_name, ), self.wrap_view('register'), name="api_register"),
            url(r"^(?P<resource_name>%s)/is_logged_in/$" % (self._meta.resource_name, ), self.wrap_view('is_logged_in'), name="api_is_logged_in"),
        ]

    def login(self, request, **kwargs):

        username = request.POST.get("username")
        password = request.POST.get("password")

        try:
            customer = self.service.login(request, username, password)
            return self.response_success(request, data={"id": customer.id})
        except Exception, e:
            return self.response_failure(request, str(e))

    def is_logged_in(self, request, **kwargs):

        return self.create_response(request, request.user.is_authenticated())

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


class SillyAuthentication(Authentication):

    def is_authenticated(self, request, **kwargs):
        return request.user.is_authenticated()

    def get_identifier(self, request):
        return request.user.username


class MealResource(BaseApiResource):

    customer = fields.ForeignKey(CustomerResource, 'customer')

    class Meta:
        queryset = Meal.objects.all()
        resource_name = "meal"
        authorization = Authorization()
        always_return_data = True
        authentication = SillyAuthentication()

        filtering = {
            'customer': ALL_WITH_RELATIONS,
            'date': ['exact', 'lt', 'lte', 'gte', 'gt'],
            'time': ['exact', 'lt', 'lte', 'gte', 'gt'],
        }

    def dehydrate(self, bundle):
        bundle.data['date'] = bundle.data['date'].strftime("%m-%d-%Y")
        bundle.data['time'] = bundle.data['time'].strftime("%I:%M %p")
        return bundle
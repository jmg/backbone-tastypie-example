from tastypie.authentication import Authentication
from tastypie.authorization import Authorization


class CustomerAuthorization(Authorization):

    def read_list(self, object_list, bundle):
        return object_list.filter(customer=bundle.request.user.get_profile())


class BasicSessionAuthentication(Authentication):

    def is_authenticated(self, request, **kwargs):
        return request.user.is_authenticated()

    def get_identifier(self, request):
        return request.user.username
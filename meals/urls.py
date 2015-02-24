from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

from tastypie.api import Api
from calories.api import CustomerResource, MealResource

v1_api = Api(api_name='v1')
v1_api.register(CustomerResource())
v1_api.register(MealResource())


urlpatterns = patterns('',

    url(r'^$', "calories.views.index"),
    url(r'^admin/', include(admin.site.urls)),
    (r'^api/', include(v1_api.urls))
)

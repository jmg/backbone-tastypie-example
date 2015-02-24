from django.shortcuts import render, render_to_response
from django.http import HttpResponse
from django.conf import settings
from django.template import RequestContext


def index(request):
    return render_to_response("index.html", {"user": request.user})
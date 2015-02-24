from django.contrib.auth import authenticate, logout, login
from models import Customer, User


class CustomerService(object):

    def login(self, request, username, password):

        user = authenticate(username=username, password=password)
        if user is None or not user.is_active:
            raise Exception("User or password invalid")
        login(request, user)

        return user.get_profile()

    def logout(self, request):

        logout(request)

    def register(self, request, username, password, password_again):

        if password_again != password:
            raise Exception("Passwords don't match")

        user = User(username=username)
        user.set_password(password)
        user.save()

        customer = Customer(user=user)
        customer.save()

        self.login(request, username, password)

        return customer
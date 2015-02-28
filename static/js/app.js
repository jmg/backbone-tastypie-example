var API_URL = "/api/v1/"

var Customer = Backbone.Model.extend({

    urlRoot: API_URL + 'customer/',

    getApiUri: function() {
        return API_URL + "customer/" + this.get("id") + "/";
    }
});

var Meal = Backbone.Model.extend({

    urlRoot: API_URL + 'meal/'
});

var Meals = Backbone.Collection.extend({

    urlRoot: API_URL + 'meal/',
    model: Meal
});

var LoginView = Backbone.View.extend({

    events: {
        "submit form": "login",
        "click #create-account": "showRegister"
    },

    login: function(event) {

        event.preventDefault();
        var email = this.$(".email").val();
        var password = this.$(".password").val();

        $.post(API_URL + "customer/login/", {"username": email, "password": password}, function(response) {
            if (response.success) {
                app.showMealsPanel();
                app.currentUser = new Customer({id: response.id, username: email});
            } else {
                alert("Error")
            }
        });
    },

    showRegister: function(event) {

        app.showView(app.views.registrationView);
    }
});

var MenuView = Backbone.View.extend({

    events: {
        "click #logout": "logout",
        "click #settings": "settings",
        "click #create-new-meal": "newMeal"
    },

    logout: function() {
        $.post(API_URL + "customer/logout/", {}, function() {
            app.showView(app.views.loginView);
            this.currentUser = false;
        });
    },

    newMeal: function() {
        $("#new-meal-modal").modal();
    },

    settings: function() {

    }
});

var RegistrationView = Backbone.View.extend({

    events: {
        "submit form": "register",
        "click #show-login": "showLogin"
    },

    register: function(event) {

        event.preventDefault();
        var email = this.$(".email").val();
        var password = this.$(".password").val();
        var password_again = this.$(".password_again").val();

        $.post("/api/v1/customer/register/", {"username": email, "password": password, "password_again": password_again}, function(response) {
            if (response.success) {
                app.showMealsPanel();
                app.currentUser = new Customer({id: response.id, username: email});
            } else {
                alert("Error")
            }
        });
    },

    showLogin: function(event) {

        app.showView(app.views.loginView);
    }
});

var MealCreateView = Backbone.View.extend({

    model: Meal,
    events: {
        'submit form': 'createMeal'
    },

    createMeal: function(event) {

        event.preventDefault();
        var model = new this.model;

        var data = {}
        this.$el.find('input').each(function() {
            data[this.name] = this.value;
            if (this.value != "Save") {
                this.value = "";
            }
        });

        model.set("text", data.text);
        model.set("calories", data.calories);
        model.set("date_time", data.date + " " + data.time);
        model.set("customer", app.currentUser.getApiUri());

        model.save();
        meals.add(model);

        $("#new-meal-modal").modal("hide");
    }
});

var MealItemView = Backbone.View.extend({

    tagName : 'tr',

    events : {
        "click .glyphicon-remove": "removeMeal"
    },

    template : _.template("<td><%- text %></td><td><%- calories %></td><td><%- date_time %></td><td class='right'><span class='glyphicon glyphicon-edit' aria-hidden='true'></span> <span class='glyphicon glyphicon-remove' aria-hidden='true'></span> </td>"),

    initialize : function(model) {

        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'destroy', this.remove);
    },

    removeMeal: function() {
        this.model.destroy();
    },

    render : function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

var meals = new Meals();

var MealsListView = Backbone.View.extend({

    collection: meals,

    events: {

    },

    initialize: function(){

        this.listenTo(this.collection, 'reset', this.addAll, this);
        this.listenTo(this.collection, 'add', this.addOne);

        this.views = [];

        this.collection.fetch();
    },

    addAll: function() {
        this.views = [];
        this.collection.each(this.addOne);
    },

    addOne: function(meal) {

        var view = new MealItemView({
            model: meal
        });
        this.$("table").append(view.render().el);
        this.views.push(view);
    },

    render: function() {
        this.collection.each(this.addOne, this);
        return this;
    }

});

var MealsApp = Backbone.Router.extend({

    views: {},

    routes: {
        "login": "login",
    },

    initialize: function() {

        this.views.loginView = new LoginView({el: $("#login")});
        this.views.menuView = new MenuView({el: $("#menu")});
        this.views.mealListView = new MealsListView({el: $("#meals")});
        this.views.mealCreateView = new MealCreateView({el: $("#create-meal")});
        this.views.registrationView = new RegistrationView({el: $("#registration")});

        if (window.currentUser) {
            this.currentUser = window.currentUser;
        } else {
            this.currentUser = false;
        }

        if (!this.currentUser) {
            this.showView(this.views.loginView);
        } else {
            this.showMealsPanel();
        }
    },

    showMealsPanel: function() {
        this.showView([this.views.mealListView, this.views.mealCreateView, this.views.menuView]);
    },

    showView: function(views) {

        if (!$.isArray(views)) {
            views = [views];
        }

        if (this.views.current != undefined) {
            _.each(this.views.current, function(view, i) {
                $(view.el).hide();
            });
        }

        _.each(views, function(view, i) {
            $(view.el).show();
        });
        this.views.current = views;
    }
})

$(document).ready(function() {

    window.app = new MealsApp();
});

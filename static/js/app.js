$(document).ready(function() {

var API_URL = "/api/v1/";

var Customer = Backbone.Model.extend({

    urlRoot: API_URL + 'customer/',
    idAttribute: "id",

    getApiUri: function() {
        return this.urlRoot + this.get("id") + "/";
    }
});

var Meal = Backbone.Model.extend({

    idAttribute: "id",
    urlRoot: API_URL + 'meal/'
});

var Meals = Backbone.Collection.extend({

    urlRoot: API_URL + 'meal/',
    model: Meal
});

var Utils = {
    formatTime: function(time) {
        var formattedTime = (time < 10) ? "0" : "";
        return formattedTime + time;
    },

    getDate: function(date) {
        return date.getUTCFullYear() + "-" + this.formatTime((date.getUTCMonth()+1)) + "-" + this.formatTime(date.getUTCDate());
    },

    getTime: function(date) {
        var hours = date.getUTCHours();
        var mins = date.getUTCMinutes();
        var secs = date.getUTCSeconds();
        return this.formatTime(hours) + ":" + this.formatTime(mins) + ":" + this.formatTime(secs);
    }
}

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
                bootbox.alert("Incorrect user or password");
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

    cleanModal: function(mealModal) {
        mealModal.find('form input').each(function() {
            if (this.value != "Save") {
                this.value = "";
            }
        });
    },

    newMeal: function() {
        var mealModal = $("#new-meal-modal");
        mealModal.find(".modal-title").text("Enter a new meal");
        this.cleanModal(mealModal);
        mealModal.modal();
    },

    settings: function() {
        var modal = $("#user-settings-modal");
        modal.find("#calories-results").hide();
        modal.modal();
    },
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
                bootbox.alert("Passwords don't match");
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

        var data = {};
        this.$el.find('input').each(function() {
            data[this.name] = this.value;
            if (this.value != "Save") {
                this.value = "";
            }
        });

        if (!!data.id) {
            var model = app.meals.get(data.id);
        } else {
            var model = new this.model;
        }
        model.set("text", data.text);
        model.set("calories", data.calories);
        model.set("date", data.date);
        model.set("time", data.time);
        model.set("customer", app.currentUser.getApiUri());

        model.save();
        if (model.isNew()) {
            app.meals.add(model);
        }

        $("#new-meal-modal").modal("hide");
    }
});

var UserSettingsView = Backbone.View.extend({

    events: {
        'submit form': 'checkCalories'
    },

    checkCalories: function(event) {

        event.preventDefault();

        var max_calories = this.$('input[name=max_calories]').val();
        var date = this.$('input[name=date]').val();

        this.$("#calories-results").show();

        if (this.calculateRightCalories(date, max_calories) === true) {
            this.$(".metric-failure").hide();
            this.$(".metric-success").show();
        } else {
            this.$(".metric-success").hide();
            this.$(".metric-failure").show();
        }

        app.currentUser.set("max_calories", max_calories);
        app.currentUser.save();
    },

    calculateRightCalories: function(date, max_calories) {

        var compareDate = Utils.getDate(new Date(date));
        var calories = 0;

        app.meals.each(function(meal, i) {
            var date = Utils.getDate(new Date(meal.get("date")));
            if (compareDate == date) {
                calories += parseInt(meal.get("calories"));
            }
        });

        this.$("#calories-total").text(calories);
        return calories < max_calories;
    }
});

var MealItemView = Backbone.View.extend({

    tagName : 'tr',

    events : {
        "click .glyphicon-remove": "removeMeal",
        "click .glyphicon-edit": "editMeal"
    },

    template : _.template($("#meal-row-template").html()),

    initialize: function(model) {

        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'destroy', this.remove);
    },

    removeMeal: function() {

        var model = this.model;
        bootbox.confirm({
            message: "Are you sure you want to delete this meal?",
            callback: function(result) {
                if (result === true) {
                    model.destroy();
                }
            }
        });
    },

    editMeal: function() {

        var mealModal = $("#new-meal-modal");
        mealModal.find(".modal-title").text("Edit Meal");

        mealModal.find('input[name=text]').val(this.model.get("text"));
        mealModal.find('input[name=calories]').val(this.model.get("calories"));
        mealModal.find('input[name=id]').val(this.model.get("id"));

        var date = new Date(this.model.get("date"));
        var time = new Date(this.model.get("date") + " " + this.model.get("time"));
        mealModal.find('input[name=date]').val(Utils.getDate(date));
        mealModal.find('input[name=time]').val(Utils.getTime(time));

        mealModal.modal();
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

var MealsListView = Backbone.View.extend({

    events: {
        "submit #search-form": "searchMeals"
    },

    initialize: function(){

        this.listenTo(this.collection, 'reset', this.addAll, this);
        this.listenTo(this.collection, 'add', this.addOne, this);
        this.listenTo(this.collection, 'all', this.render, this);

        this.collection.fetch();
    },

    addAll: function() {
        this.collection.each(this.addOne);
    },

    addOne: function(meal) {

        var view = new MealItemView({model: meal});
        this.$("table tbody").append(view.render().el);
    },

    render: function() {
        return this;
    },

    reset: function() {
        this.$("table tbody").html("");
    },

    searchMeals: function(event) {
        event.preventDefault();

        var form = $("#search-form");

        var dateParams = ["date_from", "date_to", "time_from", "time_to"];
        var filters = {};
        var apiFilters = {};

        for (var i=0; i < dateParams.length; i++) {
            var value = form.find("input[name=" + dateParams[i] + "]").val();
            if (value) {
                filters[dateParams[i]] = value;
            }
        }

        if (filters.date_from) {
            apiFilters.date__gte = filters.date_from;
        }
        if (filters.date_to) {
            apiFilters.date__lte = filters.date_to;
        }
        if (filters.time_from) {
            apiFilters.time__gte = filters.time_from;
        }
        if (filters.time_to) {
            apiFilters.time__lte = filters.time_to;
        }

        this.reset();
        this.collection.reset();

        this.collection.fetch({ data: apiFilters });

    }
});

var MealsApp = Backbone.Router.extend({

    views: {},

    routes: {
        "login": "login",
    },

    initialize: function() {

        this.meals = new Meals();

        this.views.loginView = new LoginView({el: $("#login")});
        this.views.registrationView = new RegistrationView({el: $("#registration")});
        this.views.menuView = new MenuView({el: $("#menu")});
        this.views.mealListView = new MealsListView({el: $("#meals"), collection: this.meals});
        this.views.mealCreateView = new MealCreateView({el: $("#create-meal")});
        this.views.userSettingsView = new UserSettingsView({el: $("#user-settings")});

        if (window.currentUser) {
            this.currentUser = new Customer(window.currentUser);
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

window.app = new MealsApp();

});

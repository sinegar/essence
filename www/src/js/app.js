// Essence client side MVC.
//
// Dependencies: 
// * zepto.js
// * underscore.js
// * backbone.js
// 
// Author: Peter Perenyi
//
// Credits: 
// * https://github.com/documentcloud/backbone/blob/master/examples/todos/todos.js  
// 

// Start processing when DOM is ready. 
$(function (){

// **Document** the content holder. The model has the following attributes: 
// * `title`
// * `content`
// * `id`
window.Document = Backbone.Model.extend({
	url: function (){
		return "data/document/" + this.id;
	},

	fetchNstore: function (options){
		options || (options = {});
		if (!(options.quick && localStorage.getItem(this.id))) {
			
			this.set(JSON.parse(localStorage.getItem(this.id)));
			
			// TODO don't override options but extend...
			this.fetch({
				success: function(model, response) {
					localStorage.setItem(model.id, JSON.stringify(model.toJSON()));
				},
				error: function(model, response) {
					model.set(JSON.parse(localStorage.getItem(model.id)));
				}, 
				silent: options.silent || options.quick
			});
		}
	}
});


// **Favourite** a reference to a document. The model has the following attributes: 
// * `title`
// * `id`
window.Favourite = Backbone.Model.extend({
	isCached: function (){
		return localStorage.getItem(this.id) != null;
	}
});

// **Folder** a collection of favourites. 
window.Folder= Backbone.Collection.extend({
	model: Favourite,
	// ?os_authType=basic will force user to be authenticated for all requests
	url: 'data/favourites', 
	parse: function(response){
		return response;
	} 
});

// Create new favourite container
window.folder = new Folder;
window.doco = new Document;

// Views
// -----

// Document view
window.DocumentView = Backbone.View.extend({
	el: $('#document'),

	// Template is defined by #tmpl-page. 
	template: _.template($("#document-template").html()),
	loading: _.template($("#loading-template").html()),

	initialize: function() {
		_.bindAll(this, 'render');
		this.model = doco;
		this.model.bind('change', this.render);
	},
	
	// Render this view - apply template on the current model. 
	render: function () {
		if (!this.model.toJSON().title) {
			this.el.html(this.loading(this.model.toJSON()));
		} else {
			this.el.html(this.template(this.model.toJSON()));
			new Parse.Simple.Confluence({}).parse(document.getElementById("wiki"), this.model.get('content'));
		}
		return this;
	}
});

window.FavouriteView = Backbone.View.extend({
	tagName: 'li', 
	template: _.template($("#favourite-item-template").html()),
	
	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},
	render: function () {
		var data = this.model.toJSON();
		// TODO move isCahced to toJSON
		data.isCached = this.model.isCached();
		$(this.el).html(this.template(data));
		return this;
	} 
});
window.FolderView = Backbone.View.extend({
	
	el: $("#folder"), 

	initialize: function() {
		_.bindAll(this, 'add', 'refresh');

		folder.bind('refresh', this.refresh);
		// fetch all favourites at init this will also authenticate
		folder.fetch();
	},

	add: function(favourite){ 
		// TODO move pre-fetch somewhere else
		new Document({id:favourite.id}).fetchNstore({quick:true});
		
		var v = new FavouriteView({model:favourite});
		this.$("#favourite-list").append(v.render().el);
	},
	
	refresh: function(folder){
		this.$(".loading").show().siblings().remove();
		folder.each(this.add); 
		this.$(".loading").hide();
	}

});

// The application
window.Essence = Backbone.Controller.extend({

	routes: {
		"refresh":"refresh", 
		"favourite":"favourite", 
		"":"index", 
		"document/:id":"document"
	},

	initialize: function() {
		this.f = new FolderView;
		this.d = new DocumentView;
	}, 

	refresh: function() {
		if(confirm("Are you sure to delete all offline content (" 
				+ localStorage.length + ")?")) {
			if (window.applicationCache && window.applicationCache.status 
						== window.applicationCache.UPDATEREADY) {
				window.applicationCache.swapCache();
			}
			localStorage.clear();
			folder.fetch();
		}
		location.hash = "#favourite";
	}, 

	index: function() {
		$("section").hide();
		$("#index").show();
	},

	favourite: function() {
		$("section").hide();
		$("#folder").show();
	},
	
	document: function (id) {
		// clear previous content this will call the change event
		doco.clear();
		doco.id = id;
		doco.fetchNstore();
		$("section").hide();
		$("#document").show();
	}
});

essence = new Essence;

Backbone.history.start();

// end of DOM wait 
});

if (!navigator.userAgent.match(/WebKit\/([\d.]+)/)) {
	document.getElementById('message').innerHTML = "Unsupported browser."
			+ " Please try a webkit browser like Safari, Chrome or your mobile.";
}

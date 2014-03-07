(function(w) {

	var baseURL = "http://10.48.4.62:8888";

	var T = {
		article: "<article class='item' data-id='{{id}}'><img class='image' src='{{photo_url}}'><p class='title'>{{title}}</p><div class='data'><span>{{price}}</span><span class='mileage'>{{mileage}} Km</span><span class='build-year'>{{build_year}}</span></div></article>",
		favorites: "{{#favorites}}<article class='fav-item'><img src='{{photo_url}}'><div class='data'><p class='title'>{{title}}</p><span class='price'>{{price}}</span></div></article>"
	};

	var M = {
		view: {
			active: "main"
		}
	};

	var V = {
		container: $("#main-container"),
		voteContainer: $("#vote"),
		voteButtons: $(".btn-vote"),
		voteResult: $(".vote-result"),
		view: {
			all: $(".view"),
			menu: $(".view-menu"),
			main: $(".view-main"),
			fav: $(".view-favorites"),
			login: $(".view-login")
		},
		headerButtons: $(".header-button"),
		renderArticle: function(item) {
			var html = Mustache.to_html(T.article, item);
			V.container.empty().append(html);
			V.voteResult.removeClass("fav rm");
			V.container.removeClass("slide-left slide-right");
		},
		renderFavorites: function(data) {
			var html = Mustache.to_html(T.favorites, data);
			V.view.favorites.append(html);
		},
		Anim: {
			favorite: function() {
				V.voteResult.removeClass("fav rm");		
				V.container.addClass("slide-left");
				V.voteResult.addClass("fav");
			},
			remove: function() {
				V.voteResult.removeClass("fav rm");	
				V.container.addClass("slide-right");
				V.voteResult.addClass("rm");
			}
		},
		switchMenu: function(view) {
			$(".view-in").removeClass("view-in");
			view.addClass("view-in");
		},
		initHeaderButtons: function() {
			V.headerButtons.on("tap", function() {
				var choice = $(this).data("opt");
				
				if (M.view.active === choice) {
					V.switchMenu(V.view.main);
					M.view.active = "main";					
				} else {
					switch (choice) {
						case "menu":						
							V.switchMenu(V.view.menu);
							C.getFavorites();
							break;
						case "fav":
							V.switchMenu(V.view.fav);
							break;
					};
					M.view.active = choice;
				}
			});
		}
	};

	var C = {
		getNextItem: function() {
			$.ajax({
				url: baseURL + "/next",
				dataType: "jsonp",
				success: function(data) {
					var item = data.cars[0];
					V.renderArticle(item);
					C.setIDvote(item.id);
				}
			});
		},
		likeCurrentItem: function() {
			$.ajax({
				url: baseURL + "/like",
				dataType: "jsonp",
				success: function(data) {
					var item = data.cars[0];
					V.renderArticle(item);
					C.setIDvote(item.id);
				}
			});
		},
		setIDvote: function(id) {
			V.voteButtons.data("id", id);
		},
		initSwipes: function() {
			V.container.on("swipeLeft", ".item", function() {
				var item = $(this);
				item.data("vote", "rm");
				C.makeVote(item);
			});
			V.container.on("swipeRight", ".item", function() {
				var item = $(this);
				item.data("vote", "fav");
				C.makeVote(item);
			});
		},
		initVoteButtons: function() {
			V.voteContainer.on("tap", ".btn-vote", function() {
				var item = $(this);
				C.makeVote(item);
			});
		},
		makeVote: function(item) {
			var btn = $(this),
					vote = item.data("vote"),
					id = item.data("id");
			switch(vote) {
				case "fav":
					V.Anim.favorite();
					setTimeout(C.likeCurrentItem, 350);
					break;
				case "rm":
					V.Anim.remove();
					setTimeout(C.getNextItem, 350);
					break;
			};
		},
		getFavorites: function() {
			$.ajax({
				url: baseURL + "/favorites",
				dataType: "jsonp",
				success: function(data) {
					V.renderFavorites(data);
				}
			});
		},
		resetList: function() {
			$.ajax({
				url: baseURL + "/reset",
				dataType: "jsonp",
				success: function(data) {
					console.log(data);
				}
			});
		}
	};

	// Init
	C.resetList();
	C.getNextItem();
	C.initSwipes();
	C.initVoteButtons();
	V.initHeaderButtons();

})(window);
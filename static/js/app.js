(function(w) {

	var T = {
		article: "<article class='item' data-id='{{id}}'><img class='image' src='{{photo_url}}'><p class='title'>{{title}}</p><div class='data'><span>{{price}}</span><span>{{mileage}} Km</span><span>{{build_year}}</span></div></article>"
	};

	var M = {

	};

	var V = {
		container: $("#main-container"),
		renderArticle: function(item) {
			var html = Mustache.to_html(T.article, item);
			V.container.append(html);
		},
		voteContainer: $("#vote"),
		voteButtons: $("#vote img")
	};

	var C = {
		getNextItem: function() {
			$.ajax({
				url: "http://10.48.4.62:8888/next",
				dataType: "jsonp",
				success: function(data) {
					var item = data.cars[0];
					console.log(item);
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
				alert(item.data("id") + " Removed!");
			});
			V.container.on("swipeRight", ".item", function() {
				var item = $(this);
				alert(item.data("id") + " Favorited!");
			});
		},
		initVoteButtons: function() {
			V.voteContainer.on("click", "#vote img", function() {
				var btn = $(this),
					vote = btn.data("vote"),
					id = btn.data("id");

				C.makeVote(vote, id);
				
			});
		},
		makeVote: function(vote, id) {
			switch(vote) {
				case "fav":
					alert("Favorited " + id)
				case "rm":
					alert("Removed " + id);
			};
		}
	};

	// Init
	C.getNextItem();
	C.initSwipes();
	C.initVoteButtons();

})(window);
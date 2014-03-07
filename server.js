var start = function(portnumber){
	
	var express = require('express'); 
	var fs = require('fs'); 
	var mustache = require('mustache');
	var RedisStore = require('connect-redis')(express);
	var redisClient = require("redis").createClient();
	var mysql = require('mysql');
	
	var Config = require('./config.js');
	var config = new Config();
	var Position = require('./position.js');

	var mysql_connection = mysql.createConnection(config.mysqlconfig);

	mysql_connection.connect();

	
	var redisStore = new RedisStore({ host: 'localhost', port: 6379, client: redisClient});
	var sessionSecret = '1234567890QWERTY';
	
	var app = express();
	
	var sslportnumber = portnumber + 363;	
	
	//set up session	
	app.use(express.cookieParser());
	app.use(express.session({
	    	secret: sessionSecret,
	    	store: redisStore
	    }));
	
	app.use(express.bodyParser());

	var jsonize = function(rows, tablename, request){
		var json = "{";
		json += "\"" + tablename +  "\": ";
		json += JSON.stringify(rows);
		json += "}";
		return dynamicCallbackName(json, request);
		
	};
	
	var calcDistance = function(position1,position2) {
		var lat1 = position1.latitude;
		var lat2 = position2.latitude;
		var lon1 = position1.longitude;
		var lon2 = position2.longitude;
		console.log();
		var R = 6371; // km (change this constant to get miles)
		var dLat = (lat2-lat1) * Math.PI / 180;
		var dLon = (lon2-lon1) * Math.PI / 180;
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) *
			Math.sin(dLon/2) * Math.sin(dLon/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		if (d>1) return Math.round(d)+"km";
		else if (d<=1) return Math.round(d*1000)+"m";
		return d;
	};


	
	var dynamicCallbackName = function(json, request){
		var callbackname = "";
		if(typeof request.query !== 'undefined'){
			var callbackname = request.query.callback;
			if(typeof request.query.callback === 'undefined'){ 
				callbackname = "callback"; 
			}
		}
		var result = callbackname + "(";
		result += json;
		result += ");";
		return result;
	};
	
	app.post('/location', function(request, response){
		if(typeof request.body.latitude !== 'undefined' && typeof request.body.longitude !== 'undefined'){
			request.session.position = new Position (request.body.latitude, request.body.longitude);
			response.send(dynamicCallbackName("{\"status\" : \"ok\"}", response));
		}else{
			response.send(dynamicCallbackName("{\"status\" : \"error\"}", response));
		}
	});
	
	app.get('/location', function(request, response){
		var position = new Position("","");
		if(typeof request.session.position !== 'undefined'){
			position = request.session.position;
		}
		console.log(position);
		console.log(JSON.stringify(position));
		response.send( dynamicCallbackName(JSON.stringify(position), request));
		
	});
	
	var reset = function(request, response){
		request.session.lastId = 0;
		response.send(dynamicCallbackName("{\"success\" : \"ok\"}", response));
	};
	
	app.get('/reset', reset);
	
	app.post('/reset', reset);
	
	var remove
	
	app.post('/favorites/delete', function(request, response){
		var status = new Object();
		if(typeof request.body.id !== 'undefined' ){
			console.log(request.session.likes);
			var index = request.session.likes.indexOf(parseInt(request.body.id));
			console.log(index);
			if(index > 0){
				request.session.likes.splice(index,1);
				status.newfavorites = request.session.likes;
				status.status = "ok";
			}else{
				status.status = "error";
				status.message = "car with id " + request.body.id + " was not favorited..."
				response.status(500);
			}
			response.send(dynamicCallbackName(JSON.stringify(status), response));
		}else{
			status.status = "error";
			status.message = "you should provide an id";
			response.status(500);
		}
		response.send(dynamicCallbackName(JSON.stringify(status), response));
	});
	
	app.post('/name', function(request, response){
		var value = request.body.value;
		request.session.username = value;
		response.send(dynamicCallbackName("{\"success\" : \"ok\"}", response));
	});
	
	app.get('/name', function(request, response){
		if (typeof request.session.username === 'undefined'){
			response.send(dynamicCallbackName("{\"status\" : \"error\"}", response));
		}else{
			response.send(dynamicCallbackName("{\"username\" : \"" +  + "\"}", response));
		}
	});
	
	var next = function(request, response){
		var lastId = 1;
		if (request.session.lastId != null){
			lastId = request.session.lastId;
		}
		var query = 'select nr as id, concat(merk, \' \', model, \' \', uitvoering) as title, fotogroot as photo_url, bouwjaar as build_year, plaats as city, kilometerstand as mileage, prijs as price, lat as latitude, lng as longitude, url as deeplink from occimport where nr > ' + lastId + ' and not fotogroot = \'\' limit 1;'
		mysql_connection.query(query, function(err, rows, fields) {
			if(typeof request.session.latitude !== 'undefined' && typeof request.session.longitude !== 'undefined' && typeof rows[0].latitude !== 'undefined' && typeof rows[0].longitude !== 'undefined'){
				var distance = calcDistance(request.session.latitude, request.session.longitude, rows[0].latitude, rows[0].longitude);
				if(distance != null){
					rows[0].distance = distance;
				}else{
					rows[0].distance = "";
				}
			}else{
				rows[0].distance = "";
			}
			request.session.lastId = rows[0].id;
			response.send(jsonize(rows, 'cars', request));
		});
		
		
	}
	
	app.get('/next', next);
	
	app.get('/like', function(request, response){
		if (typeof request.session.likes === 'undefined'){
			request.session.likes = new Array();
		}
		console.log(request.session.lastId);
		request.session.likes.push(request.session.lastId);
		next(request, response);
	});
	
	
	app.get('/favorites', function(request, response){
		console.log(request.session.likes);
		var query = 'select nr as id, concat(merk, \' \', model, \' \', uitvoering) as title, fotoklein as photo_url, bouwjaar as build_year, plaats as city, kilometerstand as mileage, prijs as price, lat as latitude, lng as longitude, url as deeplink from occimport'
			+ ' where nr in (' + request.session.likes.join() + ')'
			+ ';'
		console.log(query);
		mysql_connection.query(query, function(err, rows, fields) {
			for( key in rows){
				if(typeof request.session.latitude !== 'undefined' && typeof request.session.longitude !== 'undefined' && typeof rows[0].latitude !== 'undefined' && typeof rows[0].longitude !== 'undefined'){
					var distance = calcDistance(request.session.latitude, request.session.longitude, rows[0].latitude, rows[0].longitude);
					if(distance != null){
						rows[key].distance = distance;
					}else{
						rows[key].distance = "";
					}
				}else{
					rows[key].distance = "";
				}
			}
			console.log(rows);
			response.send(jsonize(rows, 'cars', request));
		});		
	});

	//the main template matching
	var mainroute = function(request, response){ // get the url and slug info
		var page = fs.readFileSync("static/index.html", "utf8"); // bring in the HTML file
		
		response.send(page); // send to client
	};
	
	process.on('SIGTERM', function () {
	  console.log("Closing");
	  redisClient.quit();
	  sql_connection.close();
	  app.close();
	});
	
	app.get('/app/:slug', mainroute);
	app.get('/', mainroute);
	
	//statics
	app.use("/static", express.static(__dirname + "/static"));
	
	//set up http server
	var http = require('http');
	http.createServer(app).listen(portnumber);
	console.log('Server running at http://127.0.0.1:' + portnumber + '/'); // server start up message
	
	//set up https server
	var https = require('https');
	var httpsOptions = {
			  key: fs.readFileSync("ssl/key.pem"),
			  cert: fs.readFileSync("ssl/cert.pem")
			};
	https.createServer(httpsOptions, app).listen(sslportnumber);
	console.log('Server running at https://127.0.0.1:' + sslportnumber + '/'); // server start up message

};

exports.start = start;
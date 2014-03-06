var start = function(portnumber){
	

	
	
	var express = require('express'); 
	var fs = require('fs'); 
	var mustache = require('mustache');
	var RedisStore = require('connect-redis')(express);
	var redisClient = require("redis").createClient();
	var mysql      = require('mysql');

	var mysql_connection = mysql.createConnection({
	  host     : 'localhost',
	  user     : 'root',
	  password : '',
	  database : 'gaspedaal2'
	});

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
	
	var calcDistance = function(lat1, lon1, lat2, lon2) {
	    //Radius of the earth in:  1.609344 miles,  6371 km  | var R = (6371 / 1.609344);
	    console.log("latitude1 = " + lat1);
	    console.log("latitude2 = " + lat2);
	    console.log("longitude1 = " + lon1);
	    console.log("longitude2 = " + lon2);
		
		var R = 3958.7558657440545; // Radius of earth in Miles 
	    var dLat = toRad(lat2-lat1);
	    var dLon = toRad(lon2-lon1);
	    
	    console.log("dLat = " + dLat);
	    console.log("dLon = " + dLon);
	    
	    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
	            Math.sin(dLon/2) * Math.sin(dLon/2); 
	    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	    var d = R * c;
	    console.log("distance = " + d);
	    return d;
	}

	var toRad = function(Value) {
	    /** Converts numeric degrees to radians */
	    return Value * Math.PI / 180;
	}
	
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
			request.session.latitude = request.body.latitude;
			request.session.longitude = request.body.longitude;
			response.send(dynamicCallbackName("{\"status\" : \"ok\"}", response))
		}else{
			response.send(dynamicCallbackName("{\"status\" : \"error\"}", response));
		}
	});
	
	app.post('/name', function(request, response){
		var value = request.body.value;
		request.session.username = value;
		response.send(dynamicCallbackName("{\"success\" : \"ok\"}", response));
	});
	
	app.get('/name', function(request, response){
		if (typeof request.session.username == 'undevined'){
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
	
	app.post('/favorite', function(request, response){
		var favorite_id = request.body.id;
		console.log(favorite_id);
		next(request, response);
	});

	//the main template matching
	var mainroute = function(request, response){ // get the url and slug info
		var page = fs.readFileSync("static/index.html", "utf8"); // bring in the HTML file
		
		response.send(page); // send to client
	};
	
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
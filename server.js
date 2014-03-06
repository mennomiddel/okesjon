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
	  password : ''
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

	app.get('/next', function(request, response){
		var query = 'select nr as id, concat(merk, \' \', model, \' \', uitvoering) as title from occimport where nr > 1 limit 1;'
		mysql_connection.query(query, function(err, rows, fields) {
			//nothing
			
		});
	})
	
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
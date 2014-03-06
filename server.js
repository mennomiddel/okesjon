var start = function(portnumber){
	

	
	var express = require('express'); 
	var fs = require('fs'); 
	var mustache = require('mustache');
	var RedisStore = require('connect-redis')(express);
	var redisClient = require("redis").createClient();
	var mysql      = require('mysql');

	var connection = mysql.createConnection({
	  host     : 'localhost',
	  user     : 'root',
	  password : ''
	});

	connection.connect();

	
	var redisStore = new RedisStore({ host: 'localhost', port: 6379, client: redisClient});
	var sessionSecret = '1234567890QWERTY';
	
	var AccessControl = require('./accesscontrol');
	
	var app = express();
	
	var sslportnumber = portnumber + 363;	
	
	
	
	//set up session	
	app.use(express.cookieParser());
	app.use(express.session({
	    	secret: sessionSecret,
	    	store: redisStore
	    }));
	
	app.use(express.bodyParser());

	
	// login calls
	app.post('/login', function(request, response) {
		var accessControl = new AccessControl();

		var username = request.body.username,
	        password = request.body.password;
	        
	    
	    accessControl.login(username, password, function(success){
	    	request.session.accesscontrol = accessControl;
		    if(success){
		    	response.redirect(location);
		    }else{
		    	response.send("login failed...");
		    }
	    });
	});
	
	app.get('/logout', function(request, response){
		var accessControl = null;
		if (request.session.accesscontrol){
			accessControl = new AccessControl(request.session.accesscontrol);
		}else{
			accessControl = new AccessControl();
		}
		accessControl.logout();
		
		
		request.session.accesscontrol = accessControl;
		response.redirect('/');
	});
	
	//the main template matching
	var mainroute = function(request, response){ // get the url and slug info
		if (!request.session.accesscontrol){
			request.session.accesscontrol = new AccessControl();
		}
		
		var filename;
		if(request.params.slug){
			filename =[request.params.slug][0]; // grab the page slug
		}else{
			filename = "index";
		}
		
		var page = fs.readFileSync("templates/" + filename + ".mustache", "utf8"); // bring in the HTML file
		var loginpage = "<div class=\"hello\">HELLO</div>";
		
		var localVars = {
				title: "The menno toolkit",
				session: "page visited " + request.session.pagecount + " times",
				user: request.session.accesscontrol
		};
		var partials = {
				login: loginpage
		};

		var html = mustache.to_html(page, localVars, partials); // replace all of the data
		response.send(html); // send to client
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
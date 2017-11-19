"use strict"
const express = require("express");
const https = require("https");
const async = require("async");
const cluster = require("cluster");
const url = require("url");
const querystring = require("querystring");
const path = require("path");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
var cheerio = require('cheerio'); //jquery implementation for server
const fs = require("fs");
const ObjectID = mongodb.ObjectID;

var app = express();
//app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname, "/public/views"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;
process.env.MONGODB_URI = "mongodb://localhost/yourthing";//firstsite-dev
/*
  var server = app.listen(process.env.PORT || 3000, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
*/
// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get("/", function(req, res) {
    console.log("GET root / called");
	/*res.send({
	"NOTE":"Just go ahead and create this in Mongo - it's pretty easy",
	"desc":"post 1",
	"img":"http://www.cooltanarts.org.uk/wp-content/uploads/2013/10/robot.jpg"
});*/
  //  res.status(200).json({"Hello":"World"});
	res.render('index');
});
app.get("/news",function(req, res) {
	res.render('add_news');
});
app.post("/news",function(req, res) {
	//res.end(JSON.stringify(req.body));//.send({"post":req.body.image_url});
	var promise = db.collection('news').insert(req.body,{},function(err,doc){
		if(err)console.err("Error");
		if(doc) console.log(doc);
		var promise2 = db.collection('news').find(function(err,docCursor){
			docCursor.each(function(d){console.log(d);});
			res.end("Did it work?");
		});		
	});	
});
app.get("/mame",function(req, res){
	fs.readFile('server.js', function(err, data) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(data);
    res.end();
  });
});
/*
Things to build (just for the h of it):
Forum engine
Controller (physical computing) some device accesses url and receives commands - control it over internet.
*/
app.get("/rebuild/database",function(req, res){
    
	db.dropCollection("forum")
	.then(function(rslt){
		console.log("dropCollection:forum. result="+rslt);
		db.createCollection("forum")
		.then(function(collection){
			collection.insert([
			{user:"Tom Hardy",text:"hello world"},
			{user:"Cindy Lauper",text:"goodbye Tom"}
			])
			.then(function(){
				return collection.find({})//.toArray()
			})
			.then(function(cursor){
				cursor.each(function(err,item){
					console.log(item);
				});				
				res.end();
				});
			})
			.catch(function (err) {
				console.log(err);
				process.exit(1);
			})
	//res.end();			
		})
	.catch(function (err) {
		console.log(err);
		process.exit(1);
	})
		
	//})
	.catch(function (err) {
		console.log(err);
		process.exit(1);
	})
});
/*
app.get("/rebuild/database",function(req, res){
    
	db.dropCollection("forum", function(err,rslt){
		console.log("dropCollection:forum. result="+rslt);
		db.createCollection("forum",function(err,collection){
			collection.insert([
			{user:"Tom Hardy",text:"hello world"},
			{user:"Cindy Lauper",text:"goodbye Tom"}
			],function(){
				collection.find({},function(err,cursor){
				cursor.each(function(err,item){
					console.log(item);
				});				
				res.end();
			});
			});	
	//res.end();			
		});
		
	});
});
*/
/*	//add database user
app.get("/add_user",function(req,res){
	var u = db.createUser(
   {
     user: "admin",
     pwd: "password",
     roles: [ "readWrite", "dbAdmin" ]
   });
   console.log("created user admin");
   console.log(u);
});
*/
/*
User enters url, server requests site and finds all images so user can choose image to use. Need no-copywrite infringement in Terms and Conditions.
*/
app.get("/image_search",function(req, res){
	
	var buffer = [];
	var urlstring = req.query.url;
	var parsed_url = url.parse(urlstring);
	//console.log(parsed_url);
	getContent(parsed_url.href)
		.then((html) => {
			console.log(parsed_url.href); 
			//res.write(html); 
			var $ = cheerio.load(html);	//Odd dashes (replaced below) interfering with URL retrieval. TODO: Create separate Clean() function
			var images = $('img').map(function(){ return ($(this).attr('src')||"").replace("-","-"); }).get();//.join();
			res.json({
				phost:parsed_url.protocol+"//"+parsed_url.host,
				images:images
			});
			res.end(); 
			})
		.catch((err) => {console.error(err); res.end();} );
	/*
	https.get('https://encrypted.google.com/', (response) => { // 'https://encrypted.google.com/'
	 // console.log('statusCode:', response.statusCode);
	 // console.log('headers:', response.headers);

	  response.on('data', (d) => {
		  res.write(d);
		  buffer.push(d);
		//process.stdout.write(d);
	  }).on('end',(e) =>{
		  
		  var $ = cheerio.load(buffer.join(""));
		  var images = $('img').map(function(){ return $(this).attr('src'); }).get().join();
		 
console.log("IMAGES");
		 console.log(images);
		res.end();
	});

	}).on('error', (e) => {
	  console.error(e);
	});*/
});
app.get("/cube",function(req, res) {
	res.render('cube');
});
app.get("/plans",function(req, res) {
	res.render('plans');
});
/*******************************
Wildcard Route!!!
********************************/
/*
app.get("*", function(req, res) {
	res.redirect("/");
});
*/
/*************************************************************************
	UTILITY FUNCTIONS
**************************************************************************/
//https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
// getContent() makes either http or https request for content and returns result as Promise
const getContent = function(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
    })
};
// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI) //using Promise here instead of callback (see below)
  .then(function (database) {
  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 3000, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
})
  .catch(function (err) {
		console.log(err);
		process.exit(1);
  })
/*
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) { //using callback instead of Promise
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 3000, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});
*/
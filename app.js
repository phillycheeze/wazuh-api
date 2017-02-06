/**
 * API RESTful for OSSEC
 * Copyright (C) 2015-2016 Wazuh, Inc.All rights reserved.
 * Wazuh.com
 *
 * This program is a free software; you can redistribute it
 * and/or modify it under the terms of the GNU General Public
 * License (version 2) as published by the FSF - Free Software
 * Foundation.
 */

// Modules
var express = require('express');
var bodyParser = require('body-parser');
var auth = require("http-auth");
var fs = require('fs');
var cors = require('cors')
var config = require('./config.js');
var logger = require('./helpers/logger');
var res_h = require('./helpers/response_handler');

/********************************************/
/* Config APP
/********************************************/
var current_version = "v1.2";

port = process.env.PORT || config.port;

var app = express();
// Certs
var options;
if (config.https.toLowerCase() == "yes"){
    options = {
      key: fs.readFileSync(__dirname + '/ssl/server.key'),
      cert: fs.readFileSync(__dirname + '/ssl/server.crt')
    };
}

// CORS
if (config.cors.toLowerCase() == "yes"){
    app.use(cors());
}

// Basic authentication
if (config.basic_auth.toLowerCase() == "yes"){
    var auth_secure = auth.basic({
        realm: "OSSEC API",
        file: __dirname + "/ssl/htpasswd"
    });
    app.use(auth.connect(auth_secure));
}


// Body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

/**
 * Versioning
 * Using: Header: "api-version: vX.Y" or URL: /v1.2/
 */
app.use(function(req, res, next) {
    var api_version_header = req.get('api-version');
    var api_version_url = req.path.split('/')[1];
    var regex_version = /^v\d+(?:\.\d+){0,1}$/i;
    var new_url = "";

    if (api_version_url && regex_version.test(api_version_url))
        new_url = req.url;
    else if (api_version_header && regex_version.test(api_version_header))
        new_url = "/" + api_version_header + req.url;
    else 
        new_url = "/" + current_version + req.url;

    req.url = new_url;

    next();
});


// Controllers
app.use("/" + current_version, require('./controllers'));
//Example: app.use("/v1.2", require('./versions/v1.2/controllers'));


// APP Errors
app.use (function (err, req, res, next){
    if ( err == "Error: invalid json" ){
        logger.log(req.connection.remoteAddress + " " + req.method + " " + req.path);
        res_h.bad_request("607", "", res);
    }
    else{
        logger.log("Internal Error");
        if(err.stack)
            logger.log(err.stack);
        logger.log("Exiting...");
        process.exit(1);
    }
});

/********************************************/


// Create server
if (config.https.toLowerCase() == "yes"){
    var https = require('https');
    var server = https.createServer(options, app).listen(port, function(){
        logger.log("Listening on: https://" + server.address().address + ":" + port);
    });
}
else{
    var http = require('http');
    var server = http.createServer(app).listen(port, function(){
        logger.log("Listening on: http://" + server.address().address + ":" + port);
    });
}


// Event Handler
process.on('uncaughtException', function(err) {
    logger.log("Internal Error: uncaughtException");
    if(err.stack)
        logger.log(err.stack);
    logger.log("Exiting...");
    process.exit(1);
});

process.on('SIGTERM', function() {
    logger.log("Exiting... (SIGTERM)");
    process.exit(1);
});

process.on('SIGINT', function() {
    logger.log("Exiting... (SIGINT)");
    process.exit(1);
}); 

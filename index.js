#!/usr/bin/env node

// simple HTTP proxy
// powered by tarquas
// based on source code from: http://ejz.ru/63/node-js-http-https-proxy

var http = require('http');
var net = require('net');
var url = require('url');

var port = process.argv[2] | 0 || 8080;
var authData = process.argv[3];

var auth = authData && 'Basic ' + new Buffer(authData).toString('base64');

var server = http.createServer(function(request, response) {
    console.log(request.url)
    var ph = url.parse(request.url)
    var options = {
        port: ph.port,
        hostname: ph.hostname,
        method: request.method,
        path: ph.path,
        headers: request.headers
    }
    var proxyRequest = http.request(options)
    proxyRequest.on('response', function(proxyResponse) {
        proxyResponse.on('data', function(chunk) {
            response.write(chunk, 'binary')
        })
        proxyResponse.on('end', function() { response.end() })
        response.writeHead(proxyResponse.statusCode, proxyResponse.headers)
    })
    request.on('data', function(chunk) {
        proxyRequest.write(chunk, 'binary')
    })
    request.on('end', function() { proxyRequest.end() })
}).on('connect', function(request, socketRequest, head) {
    console.log(request.url);

    if (auth && request.headers.authorization !== auth) {
      socketRequest.write("HTTP/" + request.httpVersion + " 401 Not Authorized\r\n\r\n");
      socketRequest.end();
      return;
    };

    var ph = url.parse('http://' + request.url)
    var socket = net.connect(ph.port, ph.hostname, function() {
        socket.write(head)
        // report established connection to client
        socketRequest.write("HTTP/" + request.httpVersion + " 200 Connection established\r\n\r\n")
    })
    // tunneling to host
    socket.on('data', function(chunk) { socketRequest.write(chunk) })
    socket.on('end', function() { socketRequest.end() })
    socket.on('error', function() {
        // report error to client
        socketRequest.write("HTTP/" + request.httpVersion + " 500 Connection error\r\n\r\n")
        socketRequest.end()
    })
    // tunneling to client
    socketRequest.on('data', function(chunk) { socket.write(chunk) })
    socketRequest.on('end', function() { socket.end() })
    socketRequest.on('error', function() { socket.end() })
}).listen(port);

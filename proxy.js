var http = require('http');
var crypto = require('crypto');
var log = require('./log');

var config = {
  listen_address: null,
  listen_port: 1338,

  target_server: 'localhost',
  target_port: 1339
};

function httpOptions(request) {
  headers = request.headers;
  delete headers['host'];
  return {
    host: config.target_server,
    port: config.target_port,
    path: request.url,
    headers: headers
  };
}

function logServerRequest(request) {
  log.info('---- sending request to server');
  log.info2('method: ' + request.method);
  log.info2('path: ' + request.url);
  log.info2('version: ' + request.httpVersion);
  for (var key in request.headers) {
    log.info2(key + ': ' + request.headers[key]);
  }
}

function logClientResponse(response) {
  log.info('---- receiving response from server');
  log.info2('status: ' + response.statusCode);
  log.info2('version: ' + response.httpVersion);
  for (var key in response.headers) {
    log.info2(key + ': ' + response.headers[key]);
  }  
}

var server = http.createServer(function(server_request, server_response) {
  logServerRequest(server_request);
  var client_request = http.request(httpOptions(server_request), function(client_response) {
    logClientResponse(client_response);
    var length = 0;
    var md5sum = crypto.createHash('md5');
    client_response.on('data', function(chunk) {
      server_response.write(chunk);
      md5sum.update(chunk);
      log.info('received data from server, for resource ' + server_request.url + ', size of (bytes) ' + chunk.length);
      length += chunk.length;
    });
    client_response.on('end', function() {
      log.info("totally received size of bytes " + length + ', md5 is ' + md5sum.digest('hex') + ' for resource ' + server_request.url);
      server_response.end();
    })
  });

  var length = 0;
  var md5sum = crypto.createHash('md5');

  server_request.on('data', function(chunk) {
    client_request.write(chunk);
    md5sum.update(chunk);
    log.info("sent data to server, size of (bytes) " + chunk.length);
    length += chunk.length;
  });
  server_request.on('end', function() {
    log.info("totally sent size of bytes " + length + ' md5 is ' + md5sum.digest('hex'));
    client_request.end();
  });
});

server.listen(config.listen_port, config.listen_address, function() {
  log.info('Server running at http://' + config.listen_address + ':' + config.listen_port);
});

/*global exports,require,console,module,assert */
/*
 * Copyright (C) 2013 KO GmbH <copyright@kogmbh.com>
 */

var Utils = require('./utils'),
assert = require('assert'),
fs = require('fs'),
UUID = require('uuid');

exports.httpd = function() {
	"use strict";
	var self=this,
		http = require('http'),
		url = require('url'),
		stomp = require('stomp'),
		config = require('./config.js'),
		options = {port:16080},
		qClient_post = new stomp.Stomp(config.broker_args),
		qClient_reply = new stomp.Stomp(config.broker_args),
		httpServer = http.createServer(function (request, response) { }),
		conversionContexts = {};


	
	function fail(resp, message) {
		resp.writeHead(400, {"Content-Type": "text/plain"});
		resp.write(message);
		resp.end("\n");
	}

	httpServer.on('request', function (req, resp) {
		var convId, convContext;
		console.log('got request from: '+req.socket.remoteAddress);
		if (req.method === 'POST') {
			// create conversion process uuid
			convId = UUID.v4();
			convContext = {};
			convContext.id = convId;
			convContext.httpRequest = req;
			convContext.httpReponse = resp;
			convContext.conversionDir = config.tmpDirBase+convId;
			fs.mkdir(convContext.conversionDir, function(err) {
				if (err) {
					fail(resp, 'basedir creation failed for: '+convId);
				} else {
					conversionContexts[convId] = convContext;
					qClient_post.send({
						'destination': '/queue/ffs_http_post',
						'body': JSON.stringify({id:convId}),
						'persistent': 'true'
					});
					console.log('['+convId+'] -> prepared.');
				}
			});
		} else {
			fail(resp, 'invalid request.method');
		}
	});

	function httpReply(response) {
	}

	function messageHandler(qClient, message, queue) {
		var message_id = message.headers["message-id"],
			convContext, strm, k, outputFile;

		convContext = JSON.parse(message.body);
		console.log('['+convContext.id+'] '+queue+' ...');

		// annotate convContext by previously stored context
		if (conversionContexts.hasOwnProperty(convContext.id)) {
			for (k in conversionContexts[convContext.id]) {
				if (conversionContexts[convContext.id].hasOwnProperty(k)) {
					if (!convContext.hasOwnProperty(k)) {
						convContext[k] = conversionContexts[convContext.id][k];
					}
				}
			}
		} else { // no previously stored context
			console.log("missing previously stored convContext for convId ["+convContext.id+"]");
			qClient.ack(message_id);
			// we cannot even send a HTTP-failure without context
			return;
		}

		if (queue === "post") {
			// we need to handle the http request by writing
			// from POST-body to the filesystem
			strm = fs.createWriteStream(convContext.conversionDir + "/" + "input");
			convContext.httpRequest.on('end', function() {
				strm.on('finish', function() {
					var target_format = "odt",
						query = url.parse(convContext.httpRequest.url, true).query;

					if (query) {
						if (query.hasOwnProperty("target_format")) {
							target_format = query.target_format;
						}
					}

					// input stored, enqueue in ffs_conversion ...
					console.log("input stored");
					qClient.send({
						'destination': '/queue/ffs_conversion',
						'body': JSON.stringify({
							id: convContext.id,
							target_format: target_format,
							conversionDir: convContext.conversionDir
						}),
						'persistent': 'true'
					});
					qClient.ack(message_id);
				});
			});
			convContext.httpRequest.pipe(strm);
		} else if (queue === "reply") {
			if (config.alwaysDummyOutput) {
				outputFile = config.staticDummyResult;
			} else if (convContext.result === "success") {
				outputFile = convContext.output;
			} else {
				console.log('failure: '+JSON.stringify(convContext));
			}
			if (outputFile) {
				fs.readFile(outputFile, function(err, data) {
					if (err || (data.length === 0)) {
						fail(convContext.httpReponse, 'invalid or no output generated');
						console.log("invalid or no output generated:");
						console.log("result: "+convContext.result);
						console.log("output: "+convContext.output);
					} else {
						convContext.httpReponse.writeHead(200, {
							"Content-Type": convContext.result_mimetype || "application/octet-stream",
							"Content-Length": data.length
						});
						convContext.httpReponse.write(data);
						convContext.httpReponse.end();
					}
					qClient_reply.send({
						'destination': '/queue/ffs_cleanup',
						'body': JSON.stringify({
							id: convContext.id,
							conversionDir: convContext.conversionDir
						}),
						'persistent': 'true'
					});
					console.log('['+convContext.id+'] -> cleanup');
					delete(conversionContexts[convContext.id]);
					qClient.ack(message_id);
				});
			} else {
				// failure
				fail(convContext.httpReponse, 'no output generated');
				qClient_reply.send({
					'destination': '/queue/ffs_cleanup',
					'body': JSON.stringify({
						id: convContext.id,
						conversionDir: convContext.conversionDir
					}),
					'persistent': 'true'
				});
				console.log('['+convContext.id+'] -> cleanup');
				delete(conversionContexts[convContext.id]);
				qClient.ack(message_id);
			}
		}
	}

	function listen(callbacks) {
		callbacks = Utils.annotateCbs(callbacks, ["done", "error"]);

		qClient_post.on('message', function(message) {
			messageHandler(qClient_post, message, "post");
		});

		qClient_reply.on('message', function(message) {
			messageHandler(qClient_reply, message, "reply");
		});

		qClient_post.on('connected', function() {
			qClient_post.subscribe({
				destination: '/queue/ffs_http_post',
				ack: 'client-individual',
				'activemq.prefetchSize': config.parallelism
			});
			console.log('http post worker connected to broker.');
			httpServer.listen(options.port, function(err) {
				if (err !== undefined) {
					console.log("listen failed: " + err);
					callbacks.error();
					return;
				}
				console.log("listening on http://127.0.0.1:" + options.port + "/");
					callbacks.done();
			});
			console.log('httpd listening.');
		});

		qClient_reply.on('connected', function() {
			qClient_reply.subscribe({
				destination: '/queue/ffs_http_reply',
				ack: 'client-individual',
				'activemq.prefetchSize': config.parallelism
			});
			console.log('http reply worker connected to broker.');
		});
		
		qClient_reply.connect();
		qClient_post.connect();
	}
	return {
		listen: listen
	};
};

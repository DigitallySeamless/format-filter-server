/*global exports,require,console,module */
/*
 * Copyright (C) 2013 KO GmbH <copyright@kogmbh.com>
 */

exports.Handler = function() {
	"use strict";
	var self=this,
		http = require('http'),
		stomp = require('stomp'),
		timers = require('timers'),
		spawn = require('child_process').spawn,
		utils = require('./utils'),
		config = require('./config.js'),
		options = {port:16080},
		target_formats = {
			'odt':{'lo_format':'odt:writer8',"mimetype": "application/vnd.oasis.opendocument.text"},
			'docx':{'lo_format':'docx:MS Word 2007 XML',"mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
			'doc':{'lo_format':'doc:MS Word 97',"mimetype": "application/msword"},
			'pdf':{'lo_format':'pdf',"mimetype": "application/pdf"}
		},
		qClient = new stomp.Stomp(config.broker_args);

	function messageHandler(message, doneCB) {
		var message_id = message.headers["message-id"],
			convContext, subprocess, timer, target_format = 'odt';

		convContext = JSON.parse(message.body);
		if (convContext.hasOwnProperty('target_format')) {
			// stringify, lowercase, scrub characters
			target_format = String(convContext.target_format).toLowerCase().match(/[a-z0-9]/g).join('');
		}
		if (!target_formats.hasOwnProperty(target_format)) {
			console.log('['+convContext.id+'] conversion target format "'+target_format+'" is not supported.');
			convContext.result = 'failed:target_format_unsupported';
			doneCB(convContext);
		} else {
			console.log('['+convContext.id+'] conversion to '+target_format+'...');

			// create subprocess
			subprocess = spawn(config.libreoffice_binary,
				['--headless',
				'--convert-to', target_formats[target_format].lo_format,
				'--outdir', convContext.conversionDir,
				'--writer',
				convContext.conversionDir+"/"+"input"]);
			convContext.result_mimetype = target_formats[target_format].mimetype;

			subprocess.on('exit', function(code) {
				console.log("subprocess exit: "+code);
				if (timer) {
					timers.clearTimeout(timer);
				}
				if (code !== 0) {
					// something went wrong
					convContext.result = 'failed:nonzero';
				} else {
					convContext.result = 'success';
					convContext.output = convContext.conversionDir+"/"+'input.'+target_format;
				}
				doneCB(convContext);
			});

			// set timeout
			timer = timers.setTimeout(function() {
				console.log("conversion timeout hit in ["+convContext.conversionDir+"]");
				subprocess.kill('SIGKILL'); // SIGKILL
				convContext.result = 'failed:timeout';
				doneCB(convContext);
			}, config.conversionTimeout);
		}
		console.log('['+convContext.id+'] -> http_reply.');
		qClient.ack(message_id);
	}

	function start() {
		qClient.on('message', function(message) {
			messageHandler(message, function(convContext) {
				qClient.send({
					'destination': '/queue/ffs_http_reply',
					'body': JSON.stringify(convContext),
					'persistent': 'true'
				});
			});
		});

		qClient.on('connected', function() {
			qClient.subscribe({
				destination: '/queue/ffs_conversion',
				ack: 'client-individual',
				'activemq.prefetchSize': config.parallelism
			});
			console.log('conversion worker connected to broker.');
		});
		qClient.connect();
	}

	return { start: start };
};

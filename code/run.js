/*global require,console,process */
/*
 * Copyright (C) 2013 KO GmbH <copyright@kogmbh.com>
 */

(function() {
"use strict";
var last_argv = process.argv[process.argv.length - 1];

require('./reqcheck.js');

if (last_argv === "conversion") {
	(new (require('./conversion.js').Handler)()).start();
} else if (last_argv === "httpd") {
	(function() {
		var Httpd = require('./httpd.js').httpd,
		httpd = new Httpd();
		httpd.listen({
			done: function() { }
		});
	} ());
}

}());

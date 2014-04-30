/*global console,module,Buffer */
/*
 * Copyright (C) 2013 KO GmbH <copyright@kogmbh.com>
 */
function annotateCbs(callbackDict, cbList) {
	"use strict";
	var i;

	function createAnnotatedNoop(name) {
		return function() {
			console.log("callback missing ["+name+"]:");
			console.trace();
		};
	}

	if (callbackDict === undefined) {
		callbackDict = {};
	}

	for (i=0; i<cbList.length; i+=1) {
		if (!callbackDict.hasOwnProperty(cbList[i])) {
			if (typeof(cbList[i]) === 'string') {
				callbackDict[cbList[i]] = createAnnotatedNoop(cbList[i]);
			} else {
				console.log("CRITICAL: annotateCbs: non-string cb-name: "+JSON.stringify(cbList));
			}
		}
	}
	return callbackDict;
}

Buffer.prototype.match = function(x) {
	"use strict";
	return this.toString().match(x);
};

module.exports.annotateCbs = annotateCbs;

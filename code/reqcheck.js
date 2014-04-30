/*global require,console */
/*
 * Copyright (C) 2013 KO GmbH <copyright@kogmbh.com>
 */

(function() {
"use strict";

var reqs = [
'stomp',
'uuid'],
i, m;

try {
	for (i in reqs) {
		if (reqs.hasOwnProperty(i)) {
			m = reqs[i];
			console.log('requirement checking: '+m);
			require(m);
		}
	}
	return true;
} catch (e) {
	console.log(e);
}
return false;

}());


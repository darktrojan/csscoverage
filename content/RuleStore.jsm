/* globals Components, Services */
Components.utils.import('resource://gre/modules/Services.jsm');

/* exported EXPORTED_SYMBOLS, RuleStore */
var EXPORTED_SYMBOLS = ['RuleStore'];
var rules = new Map();

var RuleStore = {
	addRules: function({location, result}) {
		for (let [href, {used, unused}] of result.entries()) {
			if (rules.has(href)) {
				let existing = rules.get(href);
				existing.locations.add(location);
				existing.used = union(existing.used, used);
				existing.unused = subtract(unused, existing.used);
				rules.set(href, existing);
			} else {
				rules.set(href, {
					locations: new Set([location]), used, unused
				});
			}
		}
		Services.obs.notifyObservers(null, 'CSSCoverage:rulesAdded', null);
	},
	getAllRules: function() {
		// Clone the Map so that this one is not editable.
		return new Map(rules);
	},
	forget: function(url) {
		rules.delete(url);
	}
};

function equal(a, b) {
	return a.selectorText == b.selectorText && a.media == b.media;
}

function union(array1, array2) {
	let result = array1.slice();
	array2.filter(function(a) {
		return !result.some(function(b) {
			return equal(a, b);
		});
	}).forEach(function(a) {
		result.push(a);
	});
	return result;
}

function subtract(array1, array2) {
	return array1.filter(function(a) {
		return !array2.some(function(b) {
			return equal(a, b);
		});
	});
}

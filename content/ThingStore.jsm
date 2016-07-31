/* globals Components, Services */
Components.utils.import('resource://gre/modules/Services.jsm');

/* exported EXPORTED_SYMBOLS, ThingStore */
var EXPORTED_SYMBOLS = ['ThingStore'];
var mapOfAllTheThingsOMG = new Map();

var ThingStore = {
	addThings: function({location, result}) {
		for (let [href, {used, unused}] of result.entries()) {
			if (mapOfAllTheThingsOMG.has(href)) {
				let existing = mapOfAllTheThingsOMG.get(href);
				existing.locations.add(location);
				existing.used = union(existing.used, used);
				existing.unused = subtract(unused, existing.used);
				mapOfAllTheThingsOMG.set(href, existing);
			} else {
				mapOfAllTheThingsOMG.set(href, {
					locations: new Set([location]), used, unused
				});
			}
		}
		Services.obs.notifyObservers(null, 'thingsAdded', null);
	},
	getThings: function() {
		// Clone the Map so that this one is not editable.
		return new Map(mapOfAllTheThingsOMG);
	},
	forget: function(url) {
		mapOfAllTheThingsOMG.delete(url);
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

/* globals Components, Services */
Components.utils.import('resource://gre/modules/Services.jsm');

/* exported EXPORTED_SYMBOLS, addThings, getThings */
var EXPORTED_SYMBOLS = ['addThings', 'getThings'];
var mapOfAllTheThingsOMG = new Map();

function addThings({location, result}) {
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
}

function getThings() {
	return mapOfAllTheThingsOMG;
}

function equal(a, b) {
	// Are line and column number even relevant for comparison?
	return a.line == b.line && a.column == b.column && a.selectorText == b.selectorText;
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

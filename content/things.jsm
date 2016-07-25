Components.utils.import('resource://gre/modules/Services.jsm');

var EXPORTED_SYMBOLS = ['addThings', 'getThings'];
var mapOfAllTheThingsOMG = new Map();

function addThings({location, result}) {
	for (let [href, unused] of result.entries()) {
		if (mapOfAllTheThingsOMG.has(href)) {
			let existing = mapOfAllTheThingsOMG.get(href);
			existing.locations.add(location);
			existing.unused = existing.unused.filter(function(e) {
				return unused.some(function(u) {
					return u.line == e.line && u.column == e.column && u.selectorText == e.selectorText;
				});
			});
			mapOfAllTheThingsOMG.set(href, existing);
		} else {
			mapOfAllTheThingsOMG.set(href, {
				locations: new Set([location]),
				unused
			});
		}
	}
	Services.obs.notifyObservers(null, 'thingsAdded', null);
}

function getThings() {
	return mapOfAllTheThingsOMG;
}

/* globals addEventListener, addMessageListener, content, removeEventListener, removeMessageListener, sendAsyncMessage */

/* globals Components, DOMUtils, Preferences, XPCOMUtils */
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Preferences', 'resource://gre/modules/Preferences.jsm');
XPCOMUtils.defineLazyServiceGetter(this, 'DOMUtils', '@mozilla.org/inspector/dom-utils;1', 'inIDOMUtils');

let listOfDomains = Preferences.get('extensions.css.domains', '').split(/\s+/).filter(d => d);

let listener = {
	_events: [
		'DOMContentLoaded',
		'doItNow'
	],
	_messages: [
		'CSS:doItNow',
		'CSS:disable',
		'CSS:listOfDomainsChanged'
	],
	init: function() {
		for (let e of this._events) {
			addEventListener(e, this, false, true);
		}
		for (let m of this._messages) {
			addMessageListener(m, this);
		}
	},
	destroy: function() {
		for (let e of this._events) {
			removeEventListener(e, this, false, true);
		}
		for (let m of this._messages) {
			removeMessageListener(m, this);
		}
	},
	handleEvent: function(event) {
		switch (event.type) {
		case 'DOMContentLoaded':
			if (listOfDomains.includes(content.document.location.host)) {
				testContent();
			}
			break;
		case 'doItNow':
			testContent();
			break;
		}
	},
	receiveMessage: function(message) {
		switch (message.name) {
		case 'CSS:listOfDomainsChanged':
			listOfDomains = message.data;
			break;
		case 'CSS:doItNow':
			testContent();
			break;
		case 'CSS:disable':
			this.destroy();
			break;
		}
	}
};
listener.init();

function testContent() {
	let result = new Map();
	for (let ss of content.document.styleSheets) {
		if (content.matchMedia(ss.media.mediaText).matches) {
			let used = new Set();
			let unused = new Set();
			for (let r of ss.cssRules) {
				testRule(r, used, unused);
			}
			result.set(ss.href, {
				used: Array.from(used),
				unused: Array.from(unused)
			});
		}
	}
	sendAsyncMessage('CSS:result', {
		location: content.document.location.href,
		result
	});
}

function testRule(r, used, unused) {
	if (r.selectorText) {
		try {
			let count = DOMUtils.getSelectorCount(r);
			for (var i = 0; i < count; i++) {
				let s = DOMUtils.getSelectorText(r, i);
				let t = s.replace(/:(active|checked|hover|visited|:after|:before)/g, '');
				let selector = {
					line: DOMUtils.getRuleLine(r),
					column: DOMUtils.getRuleColumn(r),
					selectorText: s.trim()
				};
				if (content.document.querySelector(t)) {
					used.add(selector);
				} else {
					unused.add(selector);
				}
			}
		} catch (ex) {
			Components.utils.reportError(ex);
		}
	} else if (r instanceof content.CSSMediaRule && content.matchMedia(r.conditionText).matches) {
		for (let rr of r.cssRules) {
			testRule(rr, used, unused);
		}
	}
}

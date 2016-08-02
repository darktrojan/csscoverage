/* globals addEventListener, addMessageListener, content, removeEventListener, removeMessageListener, sendAsyncMessage */

/* globals Components, DOMUtils, Preferences, XPCOMUtils */
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Preferences', 'resource://gre/modules/Preferences.jsm');
XPCOMUtils.defineLazyServiceGetter(this, 'DOMUtils', '@mozilla.org/inspector/dom-utils;1', 'inIDOMUtils');

let listOfDomains = Preferences.get('extensions.csscoverage.domains', '').split(/\s+/).filter(d => d);

let listener = {
	_events: [
		'DOMContentLoaded',
		'CSSCoverage:scanPage'
	],
	_messages: [
		'CSSCoverage:scanPage',
		'CSSCoverage:disable',
		'CSSCoverage:listOfDomainsChanged'
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
		case 'CSSCoverage:scanPage':
			testContent();
			break;
		}
	},
	receiveMessage: function(message) {
		switch (message.name) {
		case 'CSSCoverage:listOfDomainsChanged':
			listOfDomains = message.data;
			break;
		case 'CSSCoverage:scanPage':
			testContent();
			break;
		case 'CSSCoverage:disable':
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
	sendAsyncMessage('CSSCoverage:result', {
		location: content.document.location.href,
		result
	});
}

function testRule(r, used, unused, media = null) {
	if (r.selectorText) {
		try {
			let count = DOMUtils.getSelectorCount(r);
			for (var i = 0; i < count; i++) {
				let s = DOMUtils.getSelectorText(r, i);
				let t = s.replace(/:(active|checked|hover|visited|:after|:before)/g, '');
				let selector = {
					line: DOMUtils.getRuleLine(r),
					column: DOMUtils.getRuleColumn(r),
					selectorText: s.trim(),
					media: media ? media.condition : null
				};
				if (content.document.querySelector(t) && (!media || media.matches)) {
					used.add(selector);
				} else {
					unused.add(selector);
				}
			}
		} catch (ex) {
			Components.utils.reportError(ex);
		}
	} else if (r instanceof content.CSSMediaRule) {
		let ruleMedia = {
			condition: r.conditionText,
			matches: content.matchMedia(r.conditionText).matches
		};
		for (let rr of r.cssRules) {
			testRule(rr, used, unused, ruleMedia);
		}
	}
}

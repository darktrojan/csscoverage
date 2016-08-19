/* globals APP_STARTUP, APP_SHUTDOWN, Components, Services, XPCOMUtils */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

/* globals strings, CustomizableUI, Preferences, RuleStore */
XPCOMUtils.defineLazyGetter(this, 'strings', function() {
	return Services.strings.createBundle('chrome://csscoverage/locale/csscoverage.properties');
});
XPCOMUtils.defineLazyModuleGetter(this, 'CustomizableUI', 'resource:///modules/CustomizableUI.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Preferences', 'resource://gre/modules/Preferences.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'RuleStore', 'chrome://csscoverage/content/RuleStore.jsm');

/* exported install, uninstall, startup, shutdown */
function install() {
}
function uninstall() {
}
function startup(params, reason) {
	if (reason == APP_STARTUP) {
		Services.obs.addObserver({
			observe: function() {
				Services.obs.removeObserver(this, 'browser-delayed-startup-finished');
				realStartup();
			}
		}, 'browser-delayed-startup-finished', false);
	} else {
		realStartup();
	}
}
function realStartup() {
	Services.prefs.getDefaultBranch('extensions.csscoverage.').setCharPref('domains', '');

	messageListener.init();
	prefObserver.init();
	windowObserver.init();

	CustomizableUI.createWidget({
		id: 'css-widget',
		label: strings.GetStringFromName('toolbarbutton.label'),
		tooltiptext: strings.GetStringFromName('toolbarbutton.label'),
		type: 'button',
		removable: true,
		defaultArea: CustomizableUI.AREA_NAVBAR,
		onCommand: function(event) {
			event.view.SidebarUI.toggle('cssSidebar');
		}
	});
}
function shutdown(params, reason) {
	if (reason == APP_SHUTDOWN) {
		return;
	}
	messageListener.destroy();
	prefObserver.destroy();
	windowObserver.destroy();

	CustomizableUI.destroyWidget('css-widget');

	Components.utils.unload('chrome://csscoverage/content/RuleStore.jsm');
}

var messageListener = {
	// Work around bug 1051238.
	_frameScriptURL: 'chrome://csscoverage/content/frame.js?' + Math.random(),
	_frameMessages: [
		'CSSCoverage:result'
	],
	init: function() {
		for (let m of this._frameMessages) {
			Services.mm.addMessageListener(m, this);
		}
		Services.mm.loadFrameScript(this._frameScriptURL, true);
		this.broadcast('CSSCoverage:enable');
	},
	destroy: function() {
		Services.mm.removeDelayedFrameScript(this._frameScriptURL, true);
		this.broadcast('CSSCoverage:disable');
		for (let m of this._frameMessages) {
			Services.mm.removeMessageListener(m, this);
		}
	},
	receiveMessage: function(message) {
		switch (message.name) {
		case 'CSSCoverage:result':
			RuleStore.addRules(message.data);
			break;
		}
	},
	broadcast: function(name, data) {
		Services.mm.broadcastAsyncMessage(name, data);
	}
};

var prefObserver = {
	init: function() {
		Services.prefs.addObserver('extensions.csscoverage.domains', this, false);
	},
	destroy: function() {
		Services.prefs.removeObserver('extensions.csscoverage.domains', this);
	},
	observe: function(subject, topic, data) {
		switch (data) {
		case 'extensions.csscoverage.domains':
			let list = Preferences.get('extensions.csscoverage.domains', '').split(/\s+/).filter(d => d);
			messageListener.broadcast('CSSCoverage:listOfDomainsChanged', list);
			break;
		}
	}
};

var windowObserver = {
	ICON_CSS_PIDATA: 'href="chrome://csscoverage/content/icon.css" type="text/css"',
	init: function() {
		this.enumerate(this.paint);
		Services.ww.registerNotification(this);
	},
	destroy: function() {
		this.enumerate(this.unpaint);
		Services.ww.unregisterNotification(this);
	},
	enumerate: function(callback) {
		let windowEnum = Services.wm.getEnumerator('navigator:browser');
		while (windowEnum.hasMoreElements()) {
			callback.call(this, windowEnum.getNext());
		}
	},
	observe: function(subject) {
		subject.addEventListener('load', function onload() {
			subject.removeEventListener('load', onload);
			windowObserver.paint(subject);
		}, false);
	},
	paint: function(win) {
		const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
		if (win.location == 'chrome://browser/content/browser.xul') {
			let doc = win.document;

			let menuitem = doc.createElementNS(XUL_NS, 'menuitem');
			menuitem.id = 'menu_cssSidebar';
			menuitem.setAttribute('label', strings.GetStringFromName('sidebar.title'));
			menuitem.setAttribute('observes', 'cssSidebar');
			doc.getElementById('viewSidebarMenu').appendChild(menuitem);

			let broadcaster = doc.createElementNS(XUL_NS, 'broadcaster');
			broadcaster.id = 'cssSidebar';
			broadcaster.setAttribute('autocheck', 'false');
			broadcaster.setAttribute('sidebartitle', strings.GetStringFromName('sidebar.title'));
			broadcaster.setAttribute('type', 'checkbox');
			broadcaster.setAttribute('group', 'sidebar');
			broadcaster.setAttribute('sidebarurl', 'chrome://csscoverage/content/sidebar.xhtml');
			broadcaster.oncommand = function() {
				win.SidebarUI.toggle('cssSidebar');
			};
			doc.getElementById('mainBroadcasterSet').appendChild(broadcaster);

			let pi = doc.createProcessingInstruction('xml-stylesheet', windowObserver.ICON_CSS_PIDATA);
			doc.insertBefore(pi, doc.getElementById('main-window'));
		}
	},
	unpaint: function(win) {
		if (win.location == 'chrome://browser/content/browser.xul') {
			let doc = win.document;

			doc.getElementById('menu_cssSidebar').remove();
			doc.getElementById('cssSidebar').remove();

			for (let node of doc.childNodes) {
				if (node.nodeType == doc.PROCESSING_INSTRUCTION_NODE && node.data == windowObserver.ICON_CSS_PIDATA) {
					doc.removeChild(node);
					break;
				}
			}
		}
	},
};

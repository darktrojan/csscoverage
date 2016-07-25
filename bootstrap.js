/* globals addThings, APP_STARTUP, APP_SHUTDOWN, Components, Services, XPCOMUtils */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'addThings', 'chrome://css/content/things.jsm');

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
	messageListener.init();
	windowObserver.init();
}
function shutdown(params, reason) {
	if (reason == APP_SHUTDOWN) {
		return;
	}
	messageListener.destroy();
	windowObserver.destroy();
	Components.utils.unload('chrome://css/content/things.jsm');
}

var messageListener = {
	// Work around bug 1051238.
	_frameScriptURL: 'chrome://css/content/frame.js?' + Math.random(),
	_frameMessages: [
		'CSS:result'
	],
	init: function() {
		for (let m of this._frameMessages) {
			Services.mm.addMessageListener(m, this);
		}
		Services.mm.loadFrameScript(this._frameScriptURL, true);
	},
	destroy: function() {
		Services.mm.removeDelayedFrameScript(this._frameScriptURL, true);
		Services.mm.broadcastAsyncMessage('CSS:disable');
		for (let m of this._frameMessages) {
			Services.mm.removeMessageListener(m, this);
		}
	},
	receiveMessage: function(message) {
		switch (message.name) {
		case 'CSS:result':
			addThings(message.data);
			break;
		}
	}
};

var windowObserver = {
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
			menuitem.setAttribute('label', 'Things');
			menuitem.setAttribute('observes', 'cssSidebar');
			doc.getElementById('viewSidebarMenu').appendChild(menuitem);

			let broadcaster = doc.createElementNS(XUL_NS, 'broadcaster');
			broadcaster.id = 'cssSidebar';
			broadcaster.setAttribute('autocheck', 'false');
			broadcaster.setAttribute('sidebartitle', 'Things');
			broadcaster.setAttribute('type', 'checkbox');
			broadcaster.setAttribute('group', 'sidebar');
			broadcaster.setAttribute('sidebarurl', 'chrome://css/content/things.xhtml');
			broadcaster.setAttribute('oncommand', 'SidebarUI.toggle(\'cssSidebar\');');
			doc.getElementById('mainBroadcasterSet').appendChild(broadcaster);
		}
	},
	unpaint: function(win) {
		if (win.location == 'chrome://browser/content/browser.xul') {
			let doc = win.document;

			doc.getElementById('menu_cssSidebar').remove();
			doc.getElementById('cssSidebar').remove();
		}
	},
};

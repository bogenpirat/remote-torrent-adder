///////////////////////////////////////////////////////
// TAKE CARE OF EXTENSION SETTINGS. VIRGIN/OLD INSTALL?
///////////////////////////////////////////////////////
var contextMenuInitialized = false;

chrome.storage.local.get(null, function(data) {
	if(data.servers == undefined) {
		var servers = [];

		// check if there's an old configuration, convert it to the new style
		if(data.host != undefined &&
		   data.port != undefined &&
		   data.login != undefined &&
		   data.password != undefined &&
		   data.client != undefined) {
			servers.push({
				"name": "primary host",
				"host": data.host,
				"port": parseInt(data.port),
				"hostsecure": data.hostsecure === "true",
				"login": data.login,
				"password": data.password
			});
		} else { // otherwise, use standard values
			servers.push({
				"name": "PRIMARY SERVER",
				"host": "127.0.0.1",
				"port": 6883,
				"hostsecure": "",
				"login": "login",
				"password": "password",
				"client": "Vuze SwingUI"
			});
			chrome.storage.local.set({
				"linksfoundindicator": "true",
				"showpopups": "true",
				"popupduration": "2000",
				"catchfromcontextmenu": "true",
				"catchfrompage": "true",
				"linkmatches": "([\\]\\[]|\\b|\\.)\\.torrent\\b([^\\-]|$)~torrents\\.php\\?action=download"
			});
		}
		chrome.storage.local.set({"servers": JSON.stringify(servers)}, function() {
			// Initialize context menu after storage is set up
			if (!contextMenuInitialized) {
				RTA.constructContextMenu();
				contextMenuInitialized = true;
			}
			registerReferrerHeaderListeners();
			registerAuthenticationListeners();
		});
	} else {
		// Storage already exists, initialize context menu
		if (!contextMenuInitialized) {
			RTA.constructContextMenu();
			contextMenuInitialized = true;
		}
		registerReferrerHeaderListeners();
		registerAuthenticationListeners();
	}
});



//////////////////////////////////////////////////////
// REGISTER CONTEXT (RIGHT-CLICK) MENU ITEMS FOR LINKS
//////////////////////////////////////////////////////
// Context menu will be constructed after storage is initialized

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
	RTA.genericOnClick(info, tab);
});


////////////////////
// GRAB FROM NEW TAB
////////////////////
chrome.tabs.onCreated.addListener(function(tab) {
	chrome.storage.local.get(["servers", "catchfromnewtab", "linkmatches"], function(data) {
		if(data.catchfromnewtab != "true") return;
		var servers = data.servers ? JSON.parse(data.servers) : [];
		if(servers.length === 0) return;
		var server = servers[0]; // primary server
		var res = data.linkmatches ? data.linkmatches.split('~') : [];
		for(mkey in res) {
			if (tab.url.match(new RegExp(res[mkey], "g"))) {
				RTA.getTorrent(server, tab.url);
				break;
			}
		}
	});
});



/////////////////////////////////////////////////////
// OVERWRITE THE CLICK-EVENT OF LINKS WE WANT TO GRAB
/////////////////////////////////////////////////////
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	chrome.storage.local.get("servers", function(result) {
		var server = result.servers ? JSON.parse(result.servers)[0] : null; // primary server
		if(request.action == "addTorrent") {
			if(request.server) {
				server = request.server;
			}
			RTA.getTorrent(server, request.url, request.label, request.dir, request.referer);
			sendResponse({});
		} else if(request.action == "getStorageData") {
			chrome.storage.local.get(null, function(data) {
				sendResponse(data);
			});
			return true; // Keep message channel open for async response
		} else if(request.action == "setStorageData") {
			chrome.storage.local.set(request.data, function() {
				sendResponse({});
			});
			return true; // Keep message channel open for async response
		} else if(request.action == "pageActionToggle") {
			chrome.action.setIcon({path: {"16":"icons/BitTorrent16.png", "48":"icons/BitTorrent48.png", "128":"icons/BitTorrent128.png"}, tabId: sender.tab.id });
			sendResponse({});
		} else if(request.action == "constructContextMenu") {
			if (!contextMenuInitialized) {
				RTA.constructContextMenu();
				contextMenuInitialized = true;
			}
			sendResponse({});
		} else if(request.action == "registerRefererListeners") {
			registerReferrerHeaderListeners();
		} else if(request.action == "registerAuthenticationListeners") {
			registerAuthenticationListeners();
		} 
	});
});

///////////////////////////////////////////////////////////////////
// CATCH WEBUI REQUESTS WHOSE CSRF PROTECTION WE NEED TO CIRCUMVENT
///////////////////////////////////////////////////////////////////
var listeners = [];
function registerReferrerHeaderListeners() {
	// unregister old listeners
	while(listeners.length > 0) {
		chrome.webRequest.onBeforeSendHeaders.removeListener(listeners.pop());
	}
	
	// register new listeners
	chrome.storage.local.get("servers", function(result) {
		var servers = result.servers ? JSON.parse(result.servers) : [];
		for(var i in servers) {
			var server = servers[i];
			const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
			
			const listener = (function(arg) {
				const myUrl = arg;

							return function(details) {
				// In Manifest V3, we can't modify headers directly
				// This listener is kept for compatibility but doesn't modify headers
			};
			})(url);
			
			if(server.host && server.port) {
				chrome.webRequest.onBeforeSendHeaders.addListener(listener, {urls: [ url + "*" ]}, ["requestHeaders", "extraHeaders"]);
			}
			
			listeners.push(listener);
		}
	});
}

// WebRequest listeners are now initialized after storage setup
RTA.getTorrentLink = "";
RTA.getTorrentLinkReferer = "";
const headersListener = function(details) {
	// In Manifest V3, we can't modify headers directly
	// This listener is kept for compatibility but doesn't modify headers
	if(details.url == RTA.getTorrentLink) {
		RTA.getTorrentLink = "";
		RTA.getTorrentLinkReferer = "";
	}
};

chrome.webRequest.onBeforeSendHeaders.addListener(headersListener, {urls: [ "<all_urls>" ]}, ["requestHeaders", "extraHeaders"]);


////////////////////////////////////////////////////
// SUPPLY DIGEST AUTHENTICATION TO WEB UIS WE MANAGE
////////////////////////////////////////////////////
var onAuthListeners = [];
var triedRequestIds = new Set();
function registerAuthenticationListeners() {
	// unregister old listeners
	while(onAuthListeners.length > 0) {
		chrome.webRequest.onAuthRequired.removeListener(onAuthListeners.pop());
	}
	
	// register new listeners
	chrome.storage.local.get("servers", function(result) {
		var servers = result.servers ? JSON.parse(result.servers) : [];
		for(var i in servers) {
			var server = servers[i];
			const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
			
			const listener = (function(user, pass, url) {
							return function(details) {
				// In Manifest V3, we can't provide auth credentials directly
				// This listener is kept for compatibility but doesn't provide auth
			};
			})(server.login, server.password, url);
			
			if(server.host && server.port) {
				chrome.webRequest.onAuthRequired.addListener(listener, { urls: [ url + "*" ], tabId: -1 }, []);
			}
			
			onAuthListeners.push(listener);
		}
	});
}

/////////////////////////////////////////////////////////
// register browser action for opening a tab to the webui
/////////////////////////////////////////////////////////
chrome.action.onClicked.addListener(function(tab) {
	chrome.storage.local.get("servers", function(result) {
		const servers = result.servers ? JSON.parse(result.servers) : [];
		if(servers.length > 0) {
			const server = servers[0];
			const relativePath = server.ruTorrentrelativepath || server.utorrentrelativepath || server.delugerelativepath || server.rtorrentxmlrpcrelativepath || "/";
			const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + relativePath;
			chrome.tabs.create({ url: url });
		}
	});
});

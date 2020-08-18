///////////////////////////////////////////////////////
// TAKE CARE OF EXTENSION SETTINGS. VIRGIN/OLD INSTALL?
///////////////////////////////////////////////////////
if(localStorage.getItem("servers") == undefined) {
	var servers = [];

	// check if there's an old configuration, convert it to the new style
	if(localStorage.getItem("host") != undefined &&
	   localStorage.getItem("port") != undefined &&
	   localStorage.getItem("login") != undefined &&
	   localStorage.getItem("password") != undefined &&
	   localStorage.getItem("client") != undefined) {
		servers.push({
			"name": "primary host",
			"host": localStorage.getItem("host"),
			"port": parseInt(localStorage.getItem("port")),
			"hostsecure": localStorage.getItem("hostsecure") === "true",
			"login": localStorage.getItem("login"),
			"password": localStorage.getItem("password")
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
		localStorage.setItem("linksfoundindicator", "true");
		localStorage.setItem("showpopups", "true");
		localStorage.setItem("popupduration", "2000");
		localStorage.setItem("catchfromcontextmenu", "true");
		localStorage.setItem("catchfrompage", "true");
		localStorage.setItem("linkmatches", "([\\]\\[]|\\b|\\.)\\.torrent\\b([^\\-]|$)~torrents\\.php\\?action=download");
	}
	localStorage.setItem("servers", JSON.stringify(servers));
}



//////////////////////////////////////////////////////
// REGISTER CONTEXT (RIGHT-CLICK) MENU ITEMS FOR LINKS
//////////////////////////////////////////////////////
RTA.constructContextMenu();



////////////////////
// GRAB FROM NEW TAB
////////////////////
chrome.tabs.onCreated.addListener(function(tab) {
	var server = JSON.parse(localStorage.getItem("servers"))[0]; // primary server
	if(localStorage.getItem("catchfromnewtab") != "true") return;
	res = localStorage.getItem('linkmatches').split('~');
	for(mkey in res) {
		if (tab.url.match(new RegExp(res[mkey], "g"))) {
			RTA.getTorrent(server, tab.url);
			break;
		}
	}
});



/////////////////////////////////////////////////////
// OVERWRITE THE CLICK-EVENT OF LINKS WE WANT TO GRAB
/////////////////////////////////////////////////////
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	var server = JSON.parse(localStorage.getItem("servers"))[0]; // primary server
	if(request.action == "addTorrent") {
		if(request.server) {
			server = request.server;
		}
		RTA.getTorrent(server, request.url, request.label, request.dir);
		sendResponse({});
	} else if(request.action == "getStorageData") {
		sendResponse(localStorage);
	} else if(request.action == "setStorageData") {
		for(x in request.data)
			localStorage.setItem(x, request.data[x]);
		sendResponse({});
	} else if(request.action == "pageActionToggle") {
		chrome.pageAction.show(sender.tab.id);
		sendResponse({});
	} else if(request.action == "constructContextMenu") {
		RTA.constructContextMenu();
		sendResponse({});
	} else if(request.action == "registerRefererListeners") {
		registerReferrerHeaderListeners();
	} else if(request.action == "registerAuthenticationListeners") {
		registerAuthenticationListeners();
	} 
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
	var servers = JSON.parse(localStorage.getItem("servers"));
	for(var i in servers) {
		var server = servers[i];
		const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
		
		const listener = (function(arg) {
			const myUrl = arg;

			return function(details) {
				var foundReferer = false;
				var foundOrigin = false;
				for (var j = 0; j < details.requestHeaders.length; ++j) {
					if (details.requestHeaders[j].name === 'Referer') {
						foundReferer = true;
						details.requestHeaders[j].value = myUrl;
					}
					
					if (details.requestHeaders[j].name === 'Origin') {
						foundOrigin = true;
						details.requestHeaders[j].value = myUrl;
					}
					
					if(foundReferer && foundOrigin) {
						break;
					}
				}
				
				if(!foundReferer) {
					details.requestHeaders.push({'name': 'Referer', 'value': myUrl});
				}
				
				if(!foundOrigin) {
					details.requestHeaders.push({'name': 'Origin', 'value': myUrl});
				}

				return {requestHeaders: details.requestHeaders};
			};
		})(url);
		
		if(server.host && server.port) {
			chrome.webRequest.onBeforeSendHeaders.addListener(listener, {urls: [ url + "*" ]}, ["blocking", "requestHeaders", "extraHeaders"]);
		}
		
		listeners.push(listener);
	}
}

registerReferrerHeaderListeners();

/////////////////////////////////////////////////////
// CATCH TORRENT LINKS AND ALTER THEIR REFERER/ORIGIN
/////////////////////////////////////////////////////
RTA.getTorrentLink = "";
const headersListener = function(details) {
	var output = { };
	console.log("details:", details.url);
	console.log("getTorrentLink:", RTA.getTorrentLink);
	if(details.url == RTA.getTorrentLink) {
		var foundReferer = false;
		var foundOrigin = false;
		for (var j = 0; j < details.requestHeaders.length; ++j) {
			if (details.requestHeaders[j].name === 'Referer') {
				foundReferer = true;
				details.requestHeaders[j].value = details.url;
			}
			
			if (details.requestHeaders[j].name === 'Origin') {
				foundOrigin = true;
				details.requestHeaders[j].value = details.url;
			}
			
			if(foundReferer && foundOrigin) {
				break;
			}
		}
		
		if(!foundReferer) {
			details.requestHeaders.push({'name': 'Referer', 'value': details.url});
		}
		
		if(!foundOrigin) {
			details.requestHeaders.push({'name': 'Origin', 'value': details.url});
		}

		output = { requestHeaders: details.requestHeaders };

		RTA.getTorrentLink = "";
	}

	return output;
};

chrome.webRequest.onBeforeSendHeaders.addListener(headersListener, {urls: [ "<all_urls>" ]}, ["blocking", "requestHeaders", "extraHeaders"]);


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
	var servers = JSON.parse(localStorage.getItem("servers"));
	for(var i in servers) {
		var server = servers[i];
		const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
		
		const listener = (function(user, pass, url) {
			return function(details) {
				var authStuff;
				
				if(triedRequestIds.has(details.requestId)) {
					authStuff = {  }; // cause the browser to resume default behavior
					triedRequestIds.delete(details.requestId);
				} else if(details.tabId != -1) {
					authStuff = {  };
				} else {
					authStuff = { authCredentials: { username: user, password: pass } };
					triedRequestIds.add(details.requestId);
				}
				
				return authStuff;
			};
		})(server.login, server.password, url);
		
		if(server.host && server.port) {
			chrome.webRequest.onAuthRequired.addListener(listener, { urls: [ url + "*" ], tabId: -1 }, ["blocking"]);
		}
		
		onAuthListeners.push(listener);
	}
}

registerAuthenticationListeners();

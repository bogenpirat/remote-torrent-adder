///////////////////////////////////////////////////////
// TAKE CARE OF EXTENSION SETTINGS. VIRGIN/OLD INSTALL?
///////////////////////////////////////////////////////


function checkStorage() {
	let temp;
	let i;
	let brokenflag = false;

	temp = JSON.parse(localStorage.getItem("servers"));

	//legacy 
	if(localStorage.getItem("host") != undefined &&
		localStorage.getItem("port") != undefined &&
		localStorage.getItem("login") != undefined &&
		localStorage.getItem("password") != undefined &&
		localStorage.getItem("client") != undefined) {
		return 1;
	}
	//current
	else if(localStorage.getItem("servers") != undefined){
		for(num in temp){
			for(key in temp[num]){
				if(key == undefined)
					if(!brokenflag)
						brokenflag = true}
				}
			if(!brokenflag)
				return 2;
		}
}

chrome.storage.sync.get(['servers'], (result) => {
	var servers = [];
	switch(checkStorage()){
		case 1:
		servers.push({
			"name": "primary host",
			"host": localStorage.getItem("host"),
			"port": parseInt(localStorage.getItem("port")),
			"hostsecure": localStorage.getItem("hostsecure") === "true",
			"login": localStorage.getItem("login"),
			"password": localStorage.getItem("password")
		});
		for(key in servers[0])
			localStorage.removeItem(key);
		chrome.storage.sync.set({"servers":servers});
		break;

		case 2:
		let temp = JSON.parse(localStorage.getItem("servers"));
		if(!result.servers.length)
			servers = temp
		else
			for(i in result.servers)
				for(num in temp)
					if(temp[num].name != result.servers[i].name)
						servers = temp[num];
		localStorage.removeItem("servers");
		chrome.storage.sync.set({"servers":servers});
		break;

		default:
		if(!servers.length && !Array.isArray(result.servers) || !result.servers.length){
			servers.push({
				"name": "Default",
				"host": "127.0.0.1",
				"port": 80,
				"hostsecure": "true",
				"login": "user",
				"password": "password",
				"client": "ruTorrent WebUI"
			});
			chrome.storage.sync.set({"servers":servers});
		}
		break;
	}
});

chrome.storage.sync.get(['global'], (result) => {
	let global = result.global;

	if(!global || Object.keys(global).length === 0){
		global = {
			linksfoundindicator:"true",
			showpopups: "true",
			popupduration: "2000",
			catchfromcontextmenu:"true",
			catchfrompage: "true",
			linkmatches: "([\\]\\[]|\\b|\\.)\\.torrent\\b([^\\-]|$)~torrents\\.php\\?action=download"
		};
		chrome.storage.sync.set({'global':global});
	}
});

//////////////////////////////////////////////////////
// REGISTER CONTEXT (RIGHT-CLICK) MENU ITEMS FOR LINKS
//////////////////////////////////////////////////////
RTA.constructContextMenu();


////////////////////
// GRAB FROM NEW TAB
////////////////////
chrome.tabs.onCreated.addListener(function(tab) {
	chrome.storage.sync.get(['servers'], (result) => {
		server = result.servers[0]; // primary server
		chrome.storage.sync.get(['global'], (result) => {
			global = result.global
			if(global["catchfromnewtab"] != "true") return;
			res = global['linkmatches'].split('~');
			for(mkey in res) {
				if (tab.url.match(new RegExp(res[mkey], "g"))) {
					RTA.getTorrent(server, tab.url);
					break;
				}
			}
		});
	});
});



/////////////////////////////////////////////////////
// OVERWRITE THE CLICK-EVENT OF LINKS WE WANT TO GRAB
/////////////////////////////////////////////////////
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	chrome.storage.sync.get(['servers'], (result) => {
		server = result.servers[0]; // primary server
		var servers = result.servers;
		if(request.action == "addTorrent") {
			if(request.server) {
				server = request.server;
			}
			RTA.getTorrent(server, request.url, request.label, request.dir);
			sendResponse({});
		} else if(request.action == "getStorageData") {
			chrome.storage.sync.get(['global'], (result) => {
				let settings = result.global;
				settings.servers = servers;
				sendResponse(settings);
			});
		} else if(request.action == "setStorageData") {
			for(let x in request.data)
				chrome.storage.sync.set({x:request.data[x]});
			sendResponse({});
		} else if(request.action == "pageActionToggle") {
			chrome.pageAction.show(sender.tab.id);
			sendResponse({});
		} else if(request.action == "constructContextMenu") {
			RTA.constructContextMenu();
			sendResponse({});
		} else if(request.action == "registerRefererListeners") {
			registerReferrerHeaderListeners();
		} 
	});
});

//////////////////////////////////////////////////////////
// CATCH LINKS WHOSE CSRF PROTECTION WE NEED TO CIRCUMVENT
//////////////////////////////////////////////////////////
var listeners = [];
function registerReferrerHeaderListeners() {
	// unregister old listeners
	while(listeners.length > 0) {
		chrome.webRequest.onBeforeSendHeaders.removeListener(listeners.pop());
	}
	
	// register new listeners
	chrome.storage.sync.get(['servers'], (result) => {
		servers = result.servers;
		for(var i in servers) {
			var server = servers[i];
			if(server && server.client && server.client == "qBittorrent WebUI") {
				var url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";

				var listener = function(details) {
					var foundReferer = false;
					var foundOrigin = false;
					for (var i = 0; i < details.requestHeaders.length; ++i) {
						if (details.requestHeaders[i].name === 'Referer') {
							foundReferer = true;
							details.requestHeaders[i].value = url;
						}

						if (details.requestHeaders[i].name === 'Origin') {
							foundOrigin = true;
							details.requestHeaders[i].value = url;
						}

						if(foundReferer && foundOrigin) {
							break;
						}
					}

					if(!foundReferer) {
						details.requestHeaders.push({'name': 'Referer', 'value': url});
					}

					if(!foundOrigin) {
						details.requestHeaders.push({'name': 'Origin', 'value': url});
					}

				console.log(details); // TODO
				return {requestHeaders: details.requestHeaders};
			}
			
			chrome.webRequest.onBeforeSendHeaders.addListener(listener, {urls: [
				"http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/*"
				]}, ["blocking", "requestHeaders"]);
			
			listeners.push(listener);
		}
	}
});

}

registerReferrerHeaderListeners();
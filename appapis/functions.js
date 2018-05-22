var menuItemIndexToServerIndex = [];

XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
	function byteValue(x) {
		return x.charCodeAt(0) & 0xff;
	}
	var ords = Array.prototype.map.call(datastr, byteValue);
	var ui8a = new Uint8Array(ords);
	this.send(ui8a.buffer);
}


RTA.dispatchTorrent = function(server, data, name, label, dir) {
	switch (server.client) {
		case "Vuze SwingUI":
		RTA.clients.vuzeSwingAdder(server, data); break;
		case "Torrentflux WebUI":
		RTA.clients.torrentfluxAdder(server, data, name); break;
		case "Transmission WebUI":
		RTA.clients.transmissionAdder(server, data); break;
		case "uTorrent WebUI":
		RTA.clients.uTorrentAdder(server, data); break;
		case "ruTorrent WebUI":
		RTA.clients.ruTorrentAdder(server, data, label, dir); break;
		case "Vuze HTML WebUI":
		RTA.clients.vuzeHtmlAdder(server, data); break;
		case "Vuze Remote WebUI":
		RTA.clients.vuzeRemoteAdder(server, data); break;
		case "Buffalo WebUI":
		case "Buffalo WebUI (OLD!)":
		RTA.clients.buffaloAdder(server, data, name); break;
		case "qBittorrent WebUI":
		RTA.clients.qBittorrentAdder(server, data, name, label, dir); break;
		case "Deluge WebUI":
		RTA.clients.delugeAdder(server, data, name); break;
		case "pyrt WebUI":
		RTA.clients.pyrtAdder(server, data, name); break;
		case "Tixati WebUI":
		RTA.clients.tixatiAdder(server, data, name); break;
		case "Hadouken WebUI":
		RTA.clients.hadoukenAdder(server, data, name); break;
		case "NodeJS-rTorrent WebUI":
		RTA.clients.nodeJSrTorrentAdder(server, data, name); break;
		case "Synology WebUI":
		RTA.clients.synologyAdder(server, data, name); break;
		case "flood WebUI":
		RTA.clients.floodAdder(server, data, name); break;
		case "QNAP DownloadStation":
		RTA.clients.qnapDownloadStationAdder(server, data, name); break;
		case "tTorrent WebUI":
		RTA.clients.tTorrentAdder(server, data, name); break;
	}
}


RTA.getTorrent = function(server, url, label, dir) {
	if(url.substring(0,7) == "magnet:") {
		RTA.dispatchTorrent(server, url, "", label, dir);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.overrideMimeType("text/plain; charset=x-user-defined");
		xhr.onreadystatechange = function(data) {
			if(xhr.readyState == 4 && xhr.status == 200) {
				if(this.responseURL.match(/\/([^\/]+.torrent)$/)) {
					name = this.responseURL.match(/\/([^\/]+.torrent)$/)[1];
				} else {
					name = "file.torrent";
				}
				
				RTA.dispatchTorrent(server, xhr.responseText, name, label, dir);
			} else if(xhr.readyState == 4 && xhr.status < 99) {
				RTA.displayResponse("Connection failed", "The server sent an irregular HTTP error code: " + xhr.status, true);
			} else if(xhr.readyState == 4 && xhr.status != 200) {
				RTA.displayResponse("Connection failed", "The server sent the following HTTP error code: " + xhr.status, true);
			}
		};
		xhr.send(null);
	}
}


RTA.displayResponse = function(title, message, error) {
	var opts = { 
		type: "basic", 
		iconUrl: (error === true) ? "icons/BitTorrent128-red.png" : "icons/BitTorrent128.png", 
		title: title,
		priority: 0,
		message: message
	};

	chrome.storage.sync.get(['global'], (result) => {
		let popupflag = result.global.showpopups;
		let duration = result.global.popupduration;
		if(popupflag){
			var id = Math.floor(Math.random() * 99999) + "";			
			chrome.notifications.create(id, opts, function(myId) { id = myId });
			setTimeout(function(){chrome.notifications.clear(id, function() {});}, duration);

		}
	});
}


RTA.constructContextMenu = function() {
	chrome.contextMenus.removeAll();

	chrome.storage.sync.get(['global'], (result) => {
		let global = result.global;
		if(global.catchfromcontextmenu) {
		// for if there's only one entry
		var contextMenuId = chrome.contextMenus.create({
			"title": "Add to Remote WebUI",
			"contexts": [ "link" ],
			"onclick": RTA.genericOnClick
		});
		menuItemIndexToServerIndex[contextMenuId] = 0;

		// check if there's more than one entry and add them as sub-entries in the context menu
		chrome.storage.sync.get(["servers"], (result) => {
			let servers = result.servers;
			var numServers = servers.length;

			if(numServers > 1) {
				for(var i = 0; i < numServers; i++) {
					var thisId = chrome.contextMenus.create({
						"title": servers[i].name,
						"contexts": [ "link" ],
						"parentId": contextMenuId,
						"onclick": RTA.genericOnClick
					});
					menuItemIndexToServerIndex[thisId] = i;
				}
				chrome.contextMenus.create({"type" : "separator", "contexts": [ "link" ], "parentId": contextMenuId});
				var allId = chrome.contextMenus.create({
					"title": "send to all",
					"contexts": [ "link" ],
					"parentId": contextMenuId,
					"onclick": RTA.genericOnClick
				});
				menuItemIndexToServerIndex[allId] = -1;
			}
		});
	}
})
}

RTA.genericOnClick = function(info, tab) {
	chrome.storage.sync.get(["servers"], (result) => {
		let servers = result.servers;
		let serverId = menuItemIndexToServerIndex[info.menuItemId];

	if(serverId === -1) { // send to all servers
		for(let i in servers) {
			RTA.getTorrent(servers[i], info.linkUrl);
		}
	} else { // only one server specified
		let server = servers[serverId];
		chrome.storage.sync.get(['global'], (result) => {
		let settings = result.global;
		settings.servers = servers;
		if(server.rutorrentdirlabelask == true && server.client == "ruTorrent WebUI") {
			chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": settings, "server": server});
		}
		else if (server.qbittorrentlabelask == true && server.client == "qBittorrent WebUI") {
			chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": settings, "server": server});
		} 
		else {
			RTA.getTorrent(server, info.linkUrl);
		}
		})
	}
});
}

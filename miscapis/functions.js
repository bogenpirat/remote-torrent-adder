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
		case "Bigly/Vuze Remote WebUI":
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
		case "flood-jesec WebUI":
			RTA.clients.floodJesecAdder(server, data, name); break;
		case "QNAP DownloadStation":
			RTA.clients.qnapDownloadStationAdder(server, data, name); break;
		case "tTorrent WebUI":
			RTA.clients.tTorrentAdder(server, data, name); break;
		case "qBittorrent v4.1+ WebUI":
			RTA.clients.qBittorrentV2Adder(server, data, name, label, dir); break;
		case "rTorrent XML-RPC":
			RTA.clients.rtorrentXmlRpcAdder(server, data); break;
		case "Elementum WebUI":
			RTA.clients.elementumAdder(server, data, name); break;
	}
}


RTA.getTorrent = function(server, url, label, dir, referer) {
	if(url.substring(0,7) == "magnet:" || server.rutorrentalwaysurl) {
		RTA.dispatchTorrent(server, url, "", label, dir);
	} else {
		RTA.getTorrentLink = url;
		RTA.getTorrentLinkReferer = referer;
		
		fetch(url)
		.then(RTA.handleFetchError)
		.then(async function(response) {
			var name = "file.torrent";
			if(response.url.match(/\/([^\/]+.torrent)$/)) {
				name = response.url.match(/\/([^\/]+.torrent)$/)[1];
			}

			// mangling it as text so it works with the older (xhr-reliant) code.
			// could probably modernize the webui parts at some point.
			const fileDataBlob = await response.blob();
			const buf = await fileDataBlob.arrayBuffer();
			const ui8a = new Uint8Array(buf);
			const chunksize = 0x8000;
			const chunks = [];
			for(let i = 0; i < ui8a.length; i += chunksize) {
				chunks.push(String.fromCharCode.apply(null, ui8a.subarray(i, i + chunksize)));
			}
			const fileData = chunks.join("");

			// Real .torrent files will start "d8:announce" and no whitepace
			const peek = fileData.slice(0, 11);

			if (!peek || !peek.startsWith("d8:announce")) {
				let contentType = response.headers.get("Content-Type");
				if (contentType) {
					const semicolonPos = contentType.indexOf(";");
					contentType = contentType.slice(0, semicolonPos).trim();
				} else {
					contentType = "unknown"
				}
				throw new Error("Received " + contentType + " content instead of a .torrent file");
			}
			
			RTA.dispatchTorrent(server, fileData, name, label, dir);
		})
		.catch(error => {
			RTA.displayResponse("Failure", "Could not download torrent file.\nError: " + error.message, true);
		});
	}
}


RTA.audioNotification = function(error) {
	var sound = new Audio();

	switch(error) {
		case false:
			sound = new Audio('sounds/success.ogg');
			break;
		case true:
			sound = new Audio('sounds/failure.ogg');
			break;
	}

	sound.play();
}


RTA.displayResponse = function(title, message, error=false) {
	if(localStorage.getItem("showpopups") == "true") {
		var opts = { 
					type: "basic", 
					iconUrl: (error === true) ? "icons/BitTorrent128-red.png" : "icons/BitTorrent128.png", 
					title: title,
					priority: 0,
					message: message
					};
		var id = Math.floor(Math.random() * 99999) + "";
		
		chrome.notifications.create(id, opts, function(myId) { 
			setTimeout(function() {
				chrome.notifications.clear(myId, function() {});
			}, localStorage.getItem('popupduration'));
		});
		
		
		
		if(localStorage.getItem("hearpopups") == "true") {
			RTA.audioNotification(error);
		}
	}
}


RTA.constructContextMenu = function() {
	chrome.contextMenus.removeAll();

	if(localStorage.getItem("catchfromcontextmenu") == "true") {
		// for if there's only one entry
		var contextMenuId = chrome.contextMenus.create({
			"title": "Add to Remote WebUI",
			"contexts": [ "link" ],
			"onclick": RTA.genericOnClick
		});
		menuItemIndexToServerIndex[contextMenuId] = 0;

		// check if there's more than one entry and add them as sub-entries in the context menu
		var servers = localStorage.getItem("servers") ? JSON.parse(localStorage.getItem("servers")) : [];
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
	}
}


RTA.genericOnClick = function(info, tab) {
	var servers = JSON.parse(localStorage.getItem("servers"));
	var serverId = menuItemIndexToServerIndex[info.menuItemId];

	if(serverId === -1) { // send to all servers
		for(var i in servers) {
			RTA.getTorrent(servers[i], info.linkUrl, null, null, tab.url);
		}
	} else { // only one server specified
		var server = JSON.parse(localStorage.getItem("servers"))[serverId];

		if(server.rutorrentdirlabelask == true && server.client == "ruTorrent WebUI") {
			chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": localStorage, "server": server});
		}
		else if (server.qbittorrentdirlabelask == true && server.client == "qBittorrent WebUI") {
			chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": localStorage, "server": server});
		} 
		else if (server.qbittorrentv2dirlabelask == true && server.client == "qBittorrent v4.1+ WebUI") {
			chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": localStorage, "server": server});
		} 
		else {
			RTA.getTorrent(server, info.linkUrl, null, null, tab.url);
		}
	}
}


RTA.extractTorrentInfo = function(data) {
	var info = {};

	var buf = Buffer.Buffer.from(data, 'ascii');
	var decoded = Bencode.decode(buf, 'utf8');

	info.trackers = new Set();
	info.trackers.add(decoded["announce"]);
	if(!!decoded["announce-list"] && !!decoded["announce-list"].length > 0) {
		for(var i = 0; i < decoded["announce-list"].length; i++) {
			if(Array.isArray(decoded["announce-list"][i])) {
				for(var j = 0; j < decoded["announce-list"][i].length; j++) {
					info.trackers.add(decoded["announce-list"][i][j]);
				}
			}
		}
	}

	info.name = decoded["info"]["name"];
	info.files = [];
	if(decoded["info"]["files"]) {
		for(var i = 0; i < decoded["info"]["files"].length; i++) {
			var thisFilePath = decoded["info"]["files"][i]["path"];
			info.files.push(thisFilePath[thisFilePath.length - 1]);
		}
	} else {
		info.files.push(info.name);
	}

	info.private = decoded["info"]["private"] === 1 ? true : false;

	return info;
}


RTA.handleFetchError = function(response) {
	if(!response.ok) {
		throw Error(response.statusText);
	}
	return response;
};


RTA.convertToBlob = function(data, myType="text/plain") {
	const ords = Array.prototype.map.call(data, function byteValue(x) {
		return x.charCodeAt(0) & 0xff;
	});
	const ui8a = new Uint8Array(ords);
	const dataBlob = new Blob([ui8a.buffer], {type: myType});

	return dataBlob;
};


RTA.blobToBase64 = function(blob) {
	const reader = new FileReader();
	reader.readAsDataURL(blob);
	return new Promise(resolve => {
		reader.onloadend = () => {
			resolve(reader.result);
		};
	});
};

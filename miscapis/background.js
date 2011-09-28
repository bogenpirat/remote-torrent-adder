XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
	var bb;
	// workaround to get the extension working in old & new chrome versions: http://googlechromereleases.blogspot.com/2011/04/beta-channel-update_18.html
	try { bb = new BlobBuilder(); }
	catch(e) { bb = new WebKitBlobBuilder(); }
	
	var data = new ArrayBuffer(datastr.length);
	var ui8a = new Uint8Array(data, 0);
	for (var i=0; i<datastr.length; i++) {
		ui8a[i] = (datastr.charCodeAt(i) & 0xff);
	}
	bb.append(data);
	var blob = bb.getBlob();
	this.send(blob);
}

function genericOnClick(info, tab) {
	getTorrent(info.linkUrl);
}

function dispatchTorrent(data, name) {
	switch (localStorage["client"]) {
		case "Vuze SwingUI":
			addTorrentToVuzeSwingUI(data); break;
		case "Torrentflux WebUI":
			addTorrentToTorrentfluxWebUI(data); break;
		case "Transmission WebUI":
			addTorrentToTransmissionWebUI(data, name); break;
		case "uTorrent WebUI":
			addTorrentTouTorrentWebUI(data); break;
		case "ruTorrent WebUI":
			addTorrentToruTorrentWebUI(data); break;
	}
}

function getTorrent(url) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.overrideMimeType("text/plain; charset=x-user-defined");
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(url.match(/\/([^\/]+.torrent)/)) {
				name = url.match(/\/([^\/]+.torrent)/)[1];
			} else {
				name = "torrent";
			}
			
			dispatchTorrent(xhr.responseText, name);
		} else if(xhr.readyState == 4 && xhr.status < 99) {
			displayResponse(-3);
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse(-1);
		}
	};
	xhr.send(null);
}

function displayResponse(code) {
	var message; var title;
	switch(code) {
		case 0: title = "Torrent added"; message = "adding the torrent succeeded!"; break;
		case -1: title = "Torrent fail"; message = "getting the torrent failed!"; break;
		case -2: title = "Torrent fail"; message = "sending the torrent failed!"; break;
		case -3: title = "Torrent fail"; message = "network error occurred!"; break;
		case -4: title = "Torrent fail"; message = "failed to log in!"; break;
		default: title = "hurr durr derp?"; message = code; break;
	}
	
	if(localStorage["showpopups"] == "true") {
		var notification = webkitNotifications.createNotification('icons/BitTorrent48.png', title, message);
		notification.show();
		setTimeout(function(){notification.cancel();}, localStorage["popupduration"]);
	}
}

function initialConfigValues() {
	localStorage["host"] = "127.0.0.1";
	localStorage["port"] = "6883";
	localStorage["hostsecure"] = "";
	localStorage["relativepath"] = "/rutorrent";
	localStorage["login"] = "login";
	localStorage["password"] = "password";
	localStorage["linksfoundindicator"] = "true";
	localStorage["showpopups"] = "true";
	localStorage["popupduration"] = 2000;
	localStorage["catchfromcontextmenu"] = "true";
	localStorage["catchfrompage"] = "true";
	localStorage["linkmatches"] = "([\\]\\[]|\\b)\\.torrent\\b~torrents\\.php\\?action=download";
	localStorage["client"] = "Vuze SwingUI";
}

// overwrite the click-event of links we want to grab
chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if(request.action == "addTorrent") {
			getTorrent(request.url);
			sendResponse({});
		} else if(request.action == "getStorageData") {
			sendResponse(localStorage);
		} else if(request.action == "pageActionToggle") {
			chrome.pageAction.show(sender.tab.id);
			sendResponse({});
		} else {
			sendResponse({});
		}
	}
);

// register a context menu on links
if(localStorage["catchfromcontextmenu"] == "true")
	chrome.contextMenus.create({"title": "Add to Remote WebUI", "contexts": ["link"], "onclick": genericOnClick});

// if this is the first usage of the extension, register initial values
if(localStorage["host"] == undefined && 
   localStorage["port"] == undefined && 
   localStorage["relativepath"] == undefined &&
   localStorage["login"] == undefined && 
   localStorage["password"] == undefined && 
   localStorage["showpopups"] == undefined && 
   localStorage["popupduration"] == undefined &&
   localStorage["catchfrompage"] == undefined &&
   localStorage["catchfromcontextmenu"] == undefined &&
   localStorage["linkmatches"] == undefined &&
   localStorage["client"] == undefined &&
   localStorage["linksfoundindicator"] == undefined && 
   localStorage["hostsecure"] == undefined) {
	initialConfigValues();
}



// version-specific migration data
if(localStorage["relativepath"] != undefined &&
   localStorage["torrentfluxrelativepath"] == undefined &&
   localStorage["ruTorrentrelativepath"] == undefined) {
	localStorage["torrentfluxrelativepath"] = localStorage["relativepath"];
	localStorage["ruTorrentrelativepath"] = localStorage["relativepath"];
	localStorage.removeItem("relativepath");
}
RTA.clients.delugeAdder = function(server, torrentdata, filename) {
	var rnd = Math.floor(Math.random()*999999);
	
	var relPath = (server.delugerelativepath == undefined) ? "" : server.delugerelativepath;
	
	var xhr = new XMLHttpRequest();
	var scheme = server.hostsecure ? "https" : "http";
	xhr.open("POST", scheme + "://" + server.host + ":" + server.port + relPath + "/json", false);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({"id": rnd, "method": "auth.login", "params": [server.password]}));
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", scheme + "://" + server.host + ":" + server.port + relPath + "/json", true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(JSON.parse(xhr.responseText)["error"] == null) {
				RTA.displayResponse("Success", "Torrent added successfully.");
			} else {
				RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + " (" + xhr.statusText + "): " + xhr.responseText, true);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + " (" + xhr.statusText + "): " + xhr.responseText, true);
		}
	};
	
	var message;
	
	if(torrentdata.substring(0,7) == "magnet:") {
		message = JSON.stringify({"id": rnd + 1, "method": "core.add_torrent_magnet", "params": [torrentdata, {}]});
	} else {
		// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
		var data = new ArrayBuffer(torrentdata.length);
		var ui8a = new Uint8Array(data, 0);
		for (var i=0; i<torrentdata.length; i++) {
			ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
		}
		message = JSON.stringify({"id": rnd + 2, "method": "core.add_torrent_file", "params": [filename, b64_encode(ui8a), {}]});
	}
	xhr.send(message)
}
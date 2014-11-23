RTA.clients.hadoukenAdder = function(server, torrentdata, name) {
	var xhr = new XMLHttpRequest();
	
	xhr.open("POST", "http://" + server.host + ":" + server.port + "/jsonrpc", false);
	xhr.setRequestHeader("Authorization", "Token " + server.hadoukentoken);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(JSON.parse(xhr.responseText).result == null) {
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
		message = JSON.stringify({
			"id": 1,
			"jsonrpc": "2.0",
			"method": "torrents.addUrl",
			"params": [
				torrentdata,
				{
					"savePath": server.hadoukendir == "" ? undefined : server.hadoukendir,
					"label": server.hadoukenlabel
				}
			]
		});
	} else {
		// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
		var data = new ArrayBuffer(torrentdata.length);
		var ui8a = new Uint8Array(data, 0);
		for (var i=0; i<torrentdata.length; i++) {
			ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
		}
		message = JSON.stringify({
			"id": 1,
			"jsonrpc": "2.0",
			"method": "torrents.addFile",
			"params": [
				b64_encode(ui8a),
				{
					"savePath": server.hadoukendir == "" ? undefined : server.hadoukendir,
					"label": server.hadoukenlabel
				}
			]
		});
	}console.debug(message);
	xhr.send(message)
}
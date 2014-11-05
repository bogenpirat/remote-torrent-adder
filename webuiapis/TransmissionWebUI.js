RTA.clients.transmissionAdder = function(server, torrentdata) {
	sendXHRTransmissionWebUI(server, torrentdata, "");
}

function sendXHRTransmissionWebUI(server, torrentdata, sessionid) {
	// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
	var data = new ArrayBuffer(torrentdata.length);
	var ui8a = new Uint8Array(data, 0);
	for (var i=0; i<torrentdata.length; i++) {
		ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
	}
	
	var message;
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transmission/rpc", true, server.login, server.password);
	xhr.setRequestHeader("X-Transmission-Session-Id", sessionid);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*"result":"success".*/.exec(xhr.responseText)) {
				RTA.displayResponse("Success", "Torrent added successfully.");
			} else {
				RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
			}
		} else if(xhr.readyState == 4 && xhr.status == 409) {
			sendXHRTransmissionWebUI(server, torrentdata, xhr.getResponseHeader('X-Transmission-Session-Id'));
		} else if(xhr.readyState == 4 && xhr.status != 200 && xhr.status != 409) {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
	
	if(torrentdata.substring(0,7) == "magnet:") {
		message = JSON.stringify({"method": "torrent-add", "arguments": {"paused": "false", "filename": torrentdata}});
	} else {
		message = JSON.stringify({"method": "torrent-add", "arguments": {"metainfo": b64_encode(ui8a)}});
	}
	xhr.send(message);
}
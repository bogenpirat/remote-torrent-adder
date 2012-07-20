function addTorrentToTransmissionWebUI(torrentdata) {
	sendXHRTransmissionWebUI(torrentdata, "");
}

function sendXHRTransmissionWebUI(torrentdata, sessionid) {
	// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
	var data = new ArrayBuffer(torrentdata.length);
	var ui8a = new Uint8Array(data, 0);
	for (var i=0; i<torrentdata.length; i++) {
		ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
	}
	
	var message;
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http"+((localStorage["hostsecure"]=='true')?"s":"")+"://"+localStorage["host"]+":"+localStorage["port"]+"/transmission/rpc", true, localStorage["login"], localStorage["password"]);
	xhr.setRequestHeader("X-Transmission-Session-Id", sessionid);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*"result":"success".*/.exec(xhr.responseText)) {
				displayResponse("Success", "Torrent added successfully.");
			} else {
				displayResponse("Failure", "Server didn't accept data:\n"+xhr.status+": "+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status == 409) {
			sendXHRTransmissionWebUI(torrentdata, xhr.getResponseHeader('X-Transmission-Session-Id'));
		} else if(xhr.readyState == 4 && xhr.status != 200 && xhr.status != 409) {
			displayResponse("Failure", "Server didn't accept data:\n"+xhr.status+": "+xhr.responseText);
		}
	};
	
	if(torrentdata.substring(0,7) == "magnet:") {
		message = JSON.stringify({"method":"torrent-add","arguments":{"paused":"false","filename":torrentdata}});
	} else {
		message = JSON.stringify({"method":"torrent-add","arguments":{"metainfo":b64_encode(ui8a)}});
	}
	xhr.send(message);
}
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
	
	var message = '{"method": "torrent-add",'
		+'"arguments": {'
		+'"metainfo":"'+b64_encode(ui8a)+'"'
		+' }'
		+' }';
	var sessionid;
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://"+localStorage["host"]+":"+localStorage["port"]+"/transmission/rpc", true, localStorage["login"], localStorage["password"]);
	xhr.setRequestHeader("X-Transmission-Session-Id", sessionid);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*"result":"success".*/.exec(xhr.responseText)) {
				displayResponse(0);
			} else {
				displayResponse("server didn't accept data:\n"+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status == 409) {
			sendXHRTransmissionWebUI(torrentdata, xhr.getResponseHeader('X-Transmission-Session-Id'));
		} else if(xhr.readyState == 4 && xhr.status != 200 && xhr.status != 409) {
			displayResponse(-2);
		}
	};
	xhr.send(message);
}
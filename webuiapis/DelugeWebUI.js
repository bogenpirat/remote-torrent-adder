function addTorrentToDelugeWebUI(torrentdata, filename) {
	var rnd = Math.floor(Math.random()*999999);
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://"+localStorage["host"]+":"+localStorage["port"]+"/json", false);
	xhr.send(JSON.stringify({"id":rnd,"method": "auth.login", "params":["deluge"]}));
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://"+localStorage["host"]+":"+localStorage["port"]+"/json", true);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(JSON.parse(xhr.responseText)["error"] == null) {
				displayResponse("Success", "Torrent added successfully.");
			} else {
				displayResponse("Failure", "Server didn't accept data:\n"+xhr.status+" ("+xhr.statusText+"): "+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse("Failure", "Server responded with an irregular HTTP error code:\n"+xhr.status+" ("+xhr.statusText+"): "+xhr.responseText);
		}
	};
	
	var message;
	
	if(torrentdata.substring(0,7) == "magnet:") {
		message = JSON.stringify({"id":rnd+1,"method":"core.add_torrent_magnet","params":[torrentdata,{}]});
	} else {
		// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
		var data = new ArrayBuffer(torrentdata.length);
		var ui8a = new Uint8Array(data, 0);
		for (var i=0; i<torrentdata.length; i++) {
			ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
		}
		message = JSON.stringify({"id":rnd+2,"method":"core.add_torrent_file","params":[filename,b64_encode(ui8a),{}]});
	}
	xhr.send(message)
}
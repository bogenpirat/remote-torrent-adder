RTA.clients.rtorrentXmlRpcAdder = function(server, torrentdata) {
	sendXhrRtorrentXmlRpc(server, torrentdata);
}

function sendXhrRtorrentXmlRpc(server, torrentdata) {
	// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
	var data = new ArrayBuffer(torrentdata.length);
	var ui8a = new Uint8Array(data, 0);
	for (var i=0; i<torrentdata.length; i++) {
		ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
	}

	var message;

	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/RPC2", true);
	xhr.onreadystatechange = function(data) {
		if (xhr.readyState != 4) {
			return;
		}
		if (xhr.status == 200) {
			if(!/.*fault.*/.exec(xhr.responseText)) {
				RTA.displayResponse("Success", "Torrent added successfully.");
			} else {
				const members = new DOMParser().parseFromString(xhr.responseText, 'text/xml').getElementsByTagName('member');
				RTA.displayResponse("Failure", "Server didn't accept data:\n"
					+ members[0].lastChild.firstChild.textContent + ": "
					+ members[1].lastChild.firstChild.textContent, true);
			}
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};

	const methodName = server.rtorrentaddpaused ? 'load.raw_verbose' : 'load.raw_start_verbose';
	message = '<?xml version="1.0" encoding="UTF-8"?>';
	message += '<methodCall>';
	message +=  '<methodName>';
	message +=   methodName;
	message +=  '</methodName>';
	message +=  '<params>';
	message +=   '<param><value><string>';
	message +=   '</string></value></param>';
	message +=   '<param><value><base64>';
	message +=    b64_encode(ui8a);
	message +=   '</base64></value></param>';
	message +=  '</params>';
	message += '</methodCall>';
	xhr.send(message);
}

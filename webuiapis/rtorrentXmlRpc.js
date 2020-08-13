RTA.clients.rtorrentXmlRpcAdder = async function(server, torrentdata) {
	var methodName;
	var encodedData;
	if(torrentdata.substring(0,7) == "magnet:") {
		encodedData = '<![CDATA[' + torrentdata + ']]>';
		methodName = server.rtorrentaddpaused ? 'load.normal' : 'load.start';
	} else {
		const data = new Uint8Array(await RTA.convertToBlob(torrentdata).arrayBuffer());
		encodedData = '<base64>' + b64_encode(data) + '</base64>';
		methodName = server.rtorrentaddpaused ? 'load.raw_verbose' : 'load.raw_start_verbose';
	}

	var message;
	message = '<?xml version="1.0" encoding="UTF-8"?>';
	message += '<methodCall>';
	message +=  '<methodName>';
	message +=   methodName;
	message +=  '</methodName>';
	message +=  '<params>';
	message +=   '<param><value><string>';
	message +=   '</string></value></param>';
	message +=   '<param><value>';
	message +=    encodedData;
	message +=   '</value></param>';
	message +=  '</params>';
	message += '</methodCall>';
	
	const relPath = server.rtorrentxmlrpcrelativepath || "";
	const slash = relPath.startsWith("/") ? "" : "/";
	const apiUrl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + slash + relPath;

	fetch(apiUrl, {
		method: 'POST',
		body: message
	})
	.then(RTA.handleFetchError)
	.then(response => response.text())
	.then(text => {
		if(!/.*fault.*/.exec(text)) {
			RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
		} else {
			const members = new DOMParser().parseFromString(text, 'text/xml').getElementsByTagName('member');
			RTA.displayResponse("Failure", "Adding the torrent failed:\n"
				+ members[0].lastChild.firstChild.textContent + ": "
				+ members[1].lastChild.firstChild.textContent, true);
		}
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
	});

};

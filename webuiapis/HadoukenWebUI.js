RTA.clients.hadoukenAdder = async function(server, torrentdata, name) {
	var message;

	if(torrentdata.substring(0,7) == "magnet:") {
		message = JSON.stringify({
			"id": 1,
			"jsonrpc": "2.0",
			"method": "webui.addTorrent",
			"params": [
				torrentdata,
				{
					"savePath": server.hadoukendir == "" ? undefined : server.hadoukendir,
					"label": server.hadoukenlabel
				}
			]
		});
	} else {
		const data = new Uint8Array(await RTA.convertToBlob(torrentdata).arrayBuffer());
		message = JSON.stringify({
			"id": 1,
			"jsonrpc": "2.0",
			"method": "webui.addTorrent",
			"params": [
				b64_encode(data),
				{
					"savePath": server.hadoukendir == "" ? undefined : server.hadoukendir,
					"label": server.hadoukenlabel
				}
			]
		});
	}

	fetch("http://" + server.host + ":" + server.port + "/api", {
		method: 'POST',
		body: message
	}).then(RTA.handleFetchError)
	.then(response => response.json())
	.then(json => {
		RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
	});

};

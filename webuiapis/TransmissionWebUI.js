RTA.clients.transmissionAdder = function(server, torrentdata) {
	const apiUrl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transmission/rpc";

	fetch(apiUrl, {
		method: 'POST',
		body: ""
	})
	.then(async response => {
		if(response.status == 409) {
			const sessionId = response.headers.get("X-Transmission-Session-Id");
			const data = new Uint8Array(await RTA.convertToBlob(torrentdata).arrayBuffer());
			
			var message;
			if(torrentdata.substring(0,7) == "magnet:") {
				message = JSON.stringify({"method": "torrent-add", "arguments": {"paused": "false", "filename": torrentdata}});
			} else {
				message = JSON.stringify({"method": "torrent-add", "arguments": {"metainfo": b64_encode(data)}});
			}
			
			fetch(apiUrl, {
				method: 'POST',
				headers: {
					"X-Transmission-Session-Id": sessionId,
					"Content-Type": "application/json; charset=UTF-8"
				},
				body: message
			})
			.then(RTA.handleFetchError)
			.then(response => response.json())
			.then(json => {
				if(json.result == "success") {
					RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
				} else {
					RTA.displayResponse("Failure", "Adding the torrent failed:\n" + json.result , true);
				}
			})
			.catch(error => {
				RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
			});
		} else {
			throw new Error(response.statusText);
		}
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
	});

};

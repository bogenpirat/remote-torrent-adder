RTA.clients.delugeAdder = function(server, torrentdata, filename) {
	const rnd = Math.floor(Math.random()*999999);
	
	const relPath = (server.delugerelativepath == undefined) ? "" : server.delugerelativepath;
	const scheme = server.hostsecure ? "https" : "http";
	const apiUrl = scheme + "://" + server.host + ":" + server.port + relPath + "/json";

	fetch(apiUrl, {
		method: 'POST',
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({"id": rnd, "method": "auth.login", "params": [server.password]})
	})
	.then(RTA.handleFetchError)
	.then(response => response.json())
	.then(async json => {
		if(!json.result) {
			RTA.displayResponse("Failure", "Login to " + server.name + "'s WebUI failed.", true);
		} else {
			// prepare payload
			var message;
	
			if(torrentdata.substring(0,7) == "magnet:") {
				message = JSON.stringify({"id": rnd + 1, "method": "core.add_torrent_magnet", "params": [torrentdata, {}]});
			} else {
				// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
				const data = new Uint8Array(await RTA.convertToBlob(torrentdata).arrayBuffer());
				message = JSON.stringify({"id": rnd + 2, "method": "core.add_torrent_file", "params": [filename, b64_encode(data), {}]});
			}

			fetch(apiUrl, {
				method: 'POST',
				headers: {
					"Content-Type": "application/json",
				},
				body: message
			})
			.then(RTA.handleFetchError)
			.then(response => response.json())
			.then(json => {
				if(!json.result) {
					RTA.displayResponse("Failure", "Adding the torrent failed:\n" + json.error.message, true);
				} else {
					RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
				}
			})
			.catch(error => {
				RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
			});
		}
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
	});
	
};

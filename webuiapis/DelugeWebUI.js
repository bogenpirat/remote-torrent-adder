RTA.clients.delugeAdder = function (server, torrentdata, filename) {
	const rnd = Math.floor(Math.random() * 999999);

	const relPath = (server.delugerelativepath == undefined) ? "" : server.delugerelativepath;
	const label = (server.delugelabel == undefined) ? "remote-torrent-adder" : (server.delugelabel).toLocaleLowerCase();
	const scheme = server.hostsecure ? "https" : "http";
	const apiUrl = scheme + "://" + server.host + ":" + server.port + relPath + "/json";


		fetch(apiUrl, {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ "id": rnd, "method": "auth.login", "params": [server.password] })
		})
			.then(RTA.handleFetchError)
			.then(response => response.json())
			.then(async json => {
				if (!json.result) {
					RTA.displayResponse("Failure", "Login to " + server.name + "'s WebUI failed.", true);
				} else {
					// prepare payload
					var message;

					if (torrentdata.substring(0, 7) == "magnet:") {
						message = JSON.stringify({ "id": rnd + 1, "method": "core.add_torrent_magnet", "params": [torrentdata, {}] });
					} else {
						// for proper base64 encoding, this needs to be shifted into a 8 byte integer array
						const data = new Uint8Array(await RTA.convertToBlob(torrentdata).arrayBuffer());
						message = JSON.stringify({ "id": rnd + 2, "method": "core.add_torrent_file", "params": [filename, b64_encode(data), {}] });
					}

					var labelAdderToTorrent;
					var labelAdderToDeluge;

					await fetch(apiUrl, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
						},
						body: message
					})
						.then(RTA.handleFetchError)
						.then(response => response.json())
						.then(json => {
							if (!json.result) {
								RTA.displayResponse("Failure", "Adding the torrent failed:\n" + json.error.message, true);
							} else {
								RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
								labelAdderToTorrent = JSON.stringify({
									"id": 1,
									"jsonrpc": "2.0",
									"method": "label.set_torrent",
									"params": [json.result, label]
								});
							}
						})
						.catch(error => {
							RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
						});


					labelAdderToDeluge = JSON.stringify({
						"id": 2,
						"jsonrpc": "2.0",
						"method": "label.add",
						"params": [label.replace("\"", "").replace("\"", "")]
					});

					// add label
					await fetch(apiUrl, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
						},
						body: labelAdderToDeluge
					});

					// add label to torrent
					await fetch(apiUrl, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
						},
						body: labelAdderToTorrent
					})
				}
			})
			.catch(error => {
				RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
			});

};
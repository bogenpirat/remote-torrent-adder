RTA.clients.floodJesecAdder = function(server, torrentdata, tags, dir) {
	if (tags == undefined) tags = server.floodjesectags;
	if (dir == undefined) dir = server.floodjesecdirectory;
	
	var paused = server.floodjesecaddpaused;

	var apiUrl = (server.hostsecure ? "https://" : "http://") + server.host + ":" + server.port;
	
	fetch(apiUrl + "/api/auth/authenticate", {
		method: 'POST',
		headers: {
			"Content-Type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({"username": server.login, "password": server.password})
	})
	.then(RTA.handleFetchError)
	.then(response => response.json())
	.then(async function(json) {
		if(!json.success) {
			RTA.displayResponse("Failure", "Login to " + server.name + "'s WebUI failed.", true);
		} else {
			var fetchOpts = {
				method: 'POST',
				headers : { "Content-Type": "application/json; charset=UTF-8" }
			};
			if(torrentdata.substring(0,7) == "magnet:") {
				apiUrl += "/api/torrents/add-urls";
				fetchOpts.body = JSON.stringify({ "urls": [ torrentdata ], "start": !paused, "tags": (!!tags ? tags.split(',') : []), "destination": (!!dir ? dir : undefined), "isBasePath": false, "isCompleted": false });
			} else {
				const dataBlob = RTA.convertToBlob(torrentdata, "application/x-bittorrent");

				apiUrl += "/api/torrents/add-files";
				
				let b64file = await RTA.blobToBase64(dataBlob);
				b64file = b64file.substr(b64file.lastIndexOf(',') + 1);

				fetchOpts.body = JSON.stringify({
					"start": !paused,
					"tags": (!!tags ? tags.split(',') : []),
					"destination": (!!dir ? dir : undefined), 
					"isBasePath": false, 
					"isCompleted": false,
					"files": [
						b64file
					]
				});
			}

			fetch(apiUrl, fetchOpts)
			.then(RTA.handleFetchError)
			.then(response => {
				if(response.status == 200) {
					RTA.displayResponse("Success", "Torrent added successfully.");
				}
				else if (response.status == 202) {
					RTA.displayResponse("Success", "Torrent added successfully.");
				} else {
					RTA.displayResponse("Failure", "Torrent not added successfully:\n" + text);
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

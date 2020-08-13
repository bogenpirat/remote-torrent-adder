RTA.clients.vuzeRemoteAdder = function(server, data) {
	if(data.substring(0,7) == "magnet:") target = "rpc";
	else target = "upload?paused=false";
	const apiUrl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transmission/" + target;

	// poke it a little so it gives us a sessionid cookie
	fetch(apiUrl)
	.then(response => {
		if(response.status != 200 && response.status != 409) {
			throw new Error("Unexpected status: " + response.statusText);
		}
	})
	.then(() => {
		// construct and run the adding request
		var message;
		if(data.substring(0,7) == "magnet:") {
			message = JSON.stringify({"method": "torrent-add", "arguments": {"paused": "false", "filename": data}});
		} else {
			const blobData = RTA.convertToBlob(data, "application/x-bittorrent");

			message = new FormData();
			message.append("torrent_files[]", blobData, "file.torrent");
		}
		
		fetch(apiUrl, {
			method: 'POST',
			body: message
		})
		.then(RTA.handleFetchError)
		.then(response => response.text())
		.then(text => {
			if(/.*<h1>200: OK<\/h1>.*/.exec(text) || JSON.parse(text)["result"] == "success") {
				RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
			} else {
				RTA.displayResponse("Failure", "Torrent not added successfully.\n" + json.error, true);
			}
		})
		.catch(error => {
			RTA.displayResponse("Failure", "Could not connect to " + server.name + "\nError: " + error.message, true);
		});
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not connect to " + server.name + "\nError: " + error.message, true);
	});

};

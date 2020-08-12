RTA.clients.tTorrentAdder = function(server, data, torrentname) {
	var target;
	if(data.substring(0,7) == "magnet:") {
		target = "downloadFromUrl";
	} else {
		target = "downloadTorrent";
	}
	const apiUrl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/cmd/" + target;

	var message;
	if(data.substring(0,7) == "magnet:") {
		message = "url=" + encodeURIComponent(data);
	} else {
		const filename = ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime());
		const dataBlob = RTA.convertToBlob(data);

		message = new FormData();
		message.append("torrentfile", dataBlob, filename);
	}

	fetch(apiUrl, {
		method: 'POST',
		headers: {
			"Authorization": "Basic " + btoa(server.login + ":" + server.password)
		},
		body: message
	})
	.then(RTA.handleFetchError)
	.then(response => {
		if(response.redirected) {
			RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
		} else {
			RTA.displayResponse("Failure", "Torrent not added successfully.\n" + response.statusText, true);
		}
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
	});

};

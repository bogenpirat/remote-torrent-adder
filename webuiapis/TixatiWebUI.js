RTA.clients.tixatiAdder = function(server, data, torrentname) {
	const apiUrl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transfers/action";
	const filename = ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime());
	const message = new FormData();
	message.append("noautostart", "0");

	if(data.substring(0,7) == "magnet:") {
		message.append("addlinktext", data);
		message.append("addlink", "Add");
	} else {
		const dataBlob = RTA.convertToBlob(data);
		message.append("metafile", dataBlob, filename);
		message.append("addmetafile", "Add");
	}

	fetch(apiUrl, {
		method: 'POST',
		body: message
	})
	.then(RTA.handleFetchError)
	.then(response => response.text())
	.then(text => {
		RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
	});

};

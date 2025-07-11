RTA.clients.vuzeSwingAdder = async function(server, data) {
	if(data.substring(0,7) == "magnet:") {
		RTA.displayResponse("Client Failure", "sorry, no magnet/link adding support from vuze swing ui. try the vuze remote plugin.", true);
		return;
	}

	var boundary = "AJAX-----------------------" + (new Date).getTime();
	var message = "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"upfile\"; filename=\"file.torrent\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += data + "\r\n";
	   message += "--" + boundary + "--\r\n";

	const response = await fetch("http://" + server.host + ":" + server.port + "/upload.cgi", {
		method: "POST",
		headers: {
			"Content-Type": "multipart/form-data; boundary=" + boundary
		},
		body: new TextEncoder().encode(message)
	});

	const text = await response.text();
	if (response.ok) {
		if (/.*Upload OK.*/.exec(text)) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + response.status + ": " + text, true);
		}
	} else {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + response.status + ": " + text, true);
	}
}
function vhtml_handleResponse(response, text) {
	if(response.ok) {
		if(/.*loaded successfully.*/.exec(text)) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + response.status + ": " + text, true);
		}
	} else {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + response.status + ": " + text, true);
	}
}

RTA.clients.vuzeHtmlAdder = async function(server, data) {
	if(data.substring(0,7) == "magnet:") {
		const url = "http://" + server.host + ":" + server.port + "/index.tmpl?d=u&upurl=" + encodeURIComponent(data);
		const response = await fetch(url, { method: "GET" });
		const text = await response.text();
		vhtml_handleResponse(response, text);
	} else {
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"upfile_1\"; filename=\"file.torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += data + "\r\n";
		   message += "--" + boundary + "--\r\n";

		const response = await fetch("http://" + server.host + ":" + server.port + "/index.tmpl?d=u&local=1", {
			method: "POST",
			headers: {
				"Content-Type": "multipart/form-data; boundary=" + boundary
			},
			body: new TextEncoder().encode(message)
		});
		const text = await response.text();
		vhtml_handleResponse(response, text);
	}
}
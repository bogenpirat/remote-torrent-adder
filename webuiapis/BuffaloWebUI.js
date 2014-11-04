RTA.clients.buffaloAdder = function(server, data, torrentname) {
	if(data.substring(0,7) == "magnet:") {
		RTA.displayResponse("Client Failure", "Link sending not implemented (due to lack of testing equipment).", true);
		return;
	}
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://" + server.host + ":" + server.port + "/api/torrent-add?start=yes", true, server.login, server.password);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*apiTorrentAddFinishedOk.*/.exec(xhr.responseText)) {
				RTA.displayResponse("Success", "Torrent added successfully.");
			} else {
				RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------" + (new Date).getTime();
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	var message = "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"fileEl\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += data + "\r\n";
	   message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}
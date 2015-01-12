RTA.clients.vuzeSwingAdder = function(server, data) {
	if(data.substring(0,7) == "magnet:") {
		RTA.displayResponse("Client Failure", "sorry, no magnet/link adding support from vuze swing ui. try the vuze remote plugin.", true);
		return;
	}
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://" + server.host + ":" + server.port + "/upload.cgi", true, server.login, server.password);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*Upload OK.*/.exec(xhr.responseText)) {
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
	   message += "Content-Disposition: form-data; name=\"upfile\"; filename=\"file.torrent\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += data + "\r\n";
	   message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}
RTA.clients.tixatiAdder = function(server, data, torrentname) {
	var target;
	if(data.substring(0,7) == "magnet:")
		target = "download";
	else
		target = "upload";
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transfers/action", true, server.login, server.password);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			displayResponse("Success", "Torrent added successfully.");
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
	
	var boundary = "AJAX-----------------------" + (new Date).getTime();
	if(data.substring(0,7) == "magnet:") {
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"addlinktext\"\r\n\r\n";
			message += data + "\r\n";
			message += "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"addlink\"\r\n\r\n";
			message += "Add\r\n";
			message += "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"noautostart\"\r\n\r\n";
			message += "0\r\n";
		xhr.send(message);
	} else {
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"metafile\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
			message += "Content-Type: application/x-bittorrent\r\n\r\n";
			message += data + "\r\n";
			message += "--" + boundary + "--\r\n";
			message += "Content-Disposition: form-data; name=\"addmetafile\"\r\n\r\n";
			message += "Add\r\n";
			message += "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"noautostart\"\r\n\r\n";
			message += "0\r\n";
			message += "--" + boundary + "\r\n";
		xhr.sendAsBinary(message);
	}
}
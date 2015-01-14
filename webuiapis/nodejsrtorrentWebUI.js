function njs_handleResponse(server, data) {
	if(this.readyState == 4 && this.status == 200) {
		if(this.responseText == "0") {
			RTA.displayResponse("Success", "Torrent added successfully.");
		}
	} else if(this.readyState == 4 && this.status != 200) {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code.\nHTTP: " + this.status + " " + this.statusText + "\nContent:" + this.responseText, true);
	}
}

RTA.clients.nodeJSrTorrentAdder = function(server, torrentdata) {
	var scheme = server.hostsecure ? "https://" : "http://";

	// run the login first
	var xhr = new XMLHttpRequest();
	xhr.open("POST", scheme + server.host + ":" + server.port + "/login", false);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	var loginMsg = JSON.stringify({"email": server.login, "password": server.password});
	xhr.send(loginMsg);

	var loginJson;
	if(xhr.status == 200) {
		loginJson = JSON.parse(xhr.response);
	} else {
		RTA.displayResponse("Failure", "Problem logging into NodeJS-rTorrent. HTTP code " + xhr.status + " " + xhr.statusText + "\nContent:" + xhr.responseText, true);
		return;
	}
	
	if(torrentdata.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("POST", scheme + server.host + ":" + server.port + "/torrents/load", true);
		mxhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		mxhr.setRequestHeader("Authorization", "Bearer " + loginJson._id + ":" + loginJson.expires + ":" + loginJson.token);
		mxhr.onreadystatechange = njs_handleResponse;
		var message = JSON.stringify({ url: torrentdata });
		mxhr.send(message);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", scheme + server.host + ":" + server.port + "/torrents/load", true);
		xhr.setRequestHeader("Authorization", "Bearer " + loginJson._id + ":" + loginJson.expires + ":" + loginJson.token);
		xhr.onreadystatechange = njs_handleResponse;
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"file\"; filename=\"file.torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += torrentdata + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
function flood_handleResponse(server, data) {
	if(this.readyState == 4 && this.status == 200) {
		if(this.responseText == "[[0]]") {
			RTA.displayResponse("Success", "Torrent added successfully.");
		}
	} else if(this.readyState == 4 && this.status != 200) {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code.\nHTTP: " + this.status + " " + this.statusText + "\nContent:" + this.responseText, true);
	}
}

RTA.clients.floodAdder = function(server, torrentdata) {
	var scheme = server.hostsecure ? "https://" : "http://";
	var dir = server.flooddirectory;
	var paused = server.floodaddpaused;

	// run the login first
	var xhr = new XMLHttpRequest();
	xhr.open("POST", scheme + server.host + ":" + server.port + "/auth/authenticate", false);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	var loginMsg = JSON.stringify({"username": server.login, "password": server.password});
	xhr.send(loginMsg);

	var loginJson;
	if(xhr.status == 200) {
		loginJson = JSON.parse(xhr.response);
	} else {
		RTA.displayResponse("Failure", "Problem logging into flood. HTTP code " + xhr.status + " " + xhr.statusText + "\nContent:" + xhr.responseText, true);
		return;
	}
	
	if(torrentdata.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("POST", scheme + server.host + ":" + server.port + "/api/client/add", true);
		mxhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
		mxhr.onreadystatechange = flood_handleResponse;
		var message = JSON.stringify({ "urls": [ torrentdata ], "start": !paused, "destination": (!!dir ? dir: undefined) });
		mxhr.send(message);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", scheme + server.host + ":" + server.port + "/api/client/add-files", true);
		xhr.onreadystatechange = flood_handleResponse;
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"torrents\"; filename=\"file.torrent\"\r\n";
			message += "Content-Type: application/octet-stream\r\n\r\n";
			message += torrentdata + "\r\n";
		
		if(dir != undefined && dir.length > 0) {
			message += "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"destination\"\r\n\r\n";
			message += dir + "\r\n";
		}
		
			message += "--" + boundary + "\r\n";
			message += "Content-Disposition: form-data; name=\"start\"\r\n\r\n";
			message += (!paused) + "\r\n";
		
			message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
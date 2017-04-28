RTA.clients.qnapDownloadStationAdder = function(server, torrentdata, torrentname) {

	var handleResponse = function(server, data) {
		if(this.readyState == 4 && this.status == 200) {
			var json = JSON.parse(this.responseText);
			if(json.error === 0) {
				RTA.displayResponse("Success", "Torrent added successfully.");
			} else if(json.error === 8196) {
				RTA.displayResponse("Success", "Torrent already queued.");
			} else {
				RTA.displayResponse("Failure", "Server didn't accept data: " + JSON.stringify(this.responseText), true);
			}
		} else if(this.readyState == 4 && this.status != 200) {
			RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
		}
	}

	var scheme = server.hostsecure ? "https://" : "http://";

	var xhr = new XMLHttpRequest();
	xhr.open("POST", scheme + server.host + ":" + server.port + "/downloadstation/V4/Misc/Login", false);
	var formData = new FormData();
	formData.append("user", server.login);
	formData.append("pass", btoa(server.password));
	xhr.send(formData);
	var sid;
	var json = JSON.parse(xhr.response);
	if(json && json.sid) {
		sid = json.sid;
	} else {
		RTA.displayResponse("Failure", "Problem getting the QNAP DownloadStation SID. Is the configuration correct?", true);
	}

	if(torrentdata.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("POST", scheme + server.host + ":" + server.port + "/downloadstation/V4/Task/AddUrl", false);
		var formData = new FormData();
		formData.append("url", torrentdata);
		formData.append("temp", server.qnaptemp);
		formData.append("move", server.qnapmove);
		formData.append("sid", sid);
		mxhr.onreadystatechange = handleResponse;
		mxhr.send(formData);
	} else {
		var txhr = new XMLHttpRequest();
		txhr.open("POST", scheme + server.host + ":" + server.port + "/downloadstation/V4/Task/AddTorrent", false);
		txhr.onreadystatechange = handleResponse;
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		txhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"temp\"\r\n\r\n";
		   message += server.qnaptemp + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"move\"\r\n\r\n";
		   message += server.qnapmove + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"sid\"\r\n\r\n";
		   message += sid + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"file\"; filename=\"" + torrentname + "\"\r\n";
		   message += "Content-Type: application/octet-stream\r\n\r\n";
		   message += torrentdata + "\r\n";
		   
		   message += "--" + boundary + "--\r\n";
		
		txhr.sendAsBinary(message);
	}
}

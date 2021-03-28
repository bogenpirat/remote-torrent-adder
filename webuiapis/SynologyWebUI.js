function handleResponse(server, data) {
	if(this.readyState == 4 && this.status == 200) {
		var json = JSON.parse(this.responseText);
		if(json.success) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data: " + JSON.stringify(this.responseText), true);
		}
	} else if(this.readyState == 4 && this.status != 200) {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
	}
}

RTA.clients.synologyAdder = function(server, torrentdata, torrentname) {
	var scheme = server.hostsecure ? "https://" : "http://";

	var xhr = new XMLHttpRequest();
	xhr.open("GET", scheme + server.host + ":" + server.port + "/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=" + server.login + "&passwd=" + server.password + "&session=DownloadStation&format=sid", false);
	xhr.send(null);
	var sid;
	var json = JSON.parse(xhr.response);
	if(json && json.data) {
		sid = json.data.sid;
	} else {
		RTA.displayResponse("Failure", "Problem getting the Synology SID. Is the configuration correct?", true);
	}
	
	if(torrentdata.substring(0,7) == "magnet:") {
		console.log("DATA: " + torrentdata);
		console.log("GET: " + scheme + server.host + ":" + server.port + "/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=3&method=create&_sid=" + sid + "&uri=" + encodeURIComponent(torrentdata));
		var mxhr = new XMLHttpRequest();
		mxhr.open("GET", scheme + server.host + ":" + server.port + "/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=3&method=create&_sid=" + sid + "&uri=" + encodeURIComponent(torrentdata), true);
		mxhr.onreadystatechange = handleResponse;
		mxhr.send(message);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", scheme + server.host + ":" + server.port + "/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=3&method=create&_sid=" + sid, true);
		xhr.onreadystatechange = handleResponse;
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"api\"\r\n\r\n";
		   message += "SYNO.DownloadStation.Task" + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"version\"\r\n\r\n";
		   message += "2" + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"method\"\r\n\r\n";
		   message += "create" + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"_sid\"\r\n\r\n";
		   message += sid + "\r\n";
		   
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"file\"; filename=\"" + torrentname + "\"\r\n";
		   message += "Content-Type: application/octet-stream\r\n\r\n";
		   message += torrentdata + "\r\n";
		   
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}

function vhtml_handleResponse(data) {
	if(this.readyState == 4 && this.status == 200) {
		if(/.*loaded successfully.*/.exec(this.responseText)) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + this.status + ": " + this.responseText, true);
		}
	} else if(this.readyState == 4 && this.status != 200) {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
	}
}

RTA.clients.vuzeHtmlAdder = function(server, data) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://" + server.host + ":" + server.port + "/index.tmpl?d=u&local=1", true, server.login, server.password);
	xhr.onreadystatechange = vhtml_handleResponse;
	
	if(data.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("GET", "http://" + server.host + ":" + server.port + "/index.tmpl?d=u&upurl=" + encodeURIComponent(data), true, server.login, server.password);
		mxhr.onreadystatechange = vhtml_handleResponse;
		mxhr.send(message);
	} else {
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"upfile_1\"; filename=\"file.torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += data + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
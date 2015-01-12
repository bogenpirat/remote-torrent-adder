function ut_handleResponse(server, data) {
	if(this.readyState == 4 && this.status == 200) {
		if(/\{\s*"build":\s*\d+\s*\}/.test(this.responseText)) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + this.status + ": " + this.responseText, true);
		}
	} else if(this.readyState == 4 && this.status != 200) {
		RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
	}
}

RTA.clients.uTorrentAdder = function(server, torrentdata) {
	var relpath = (server.utorrentrelativepath == undefined || server.utorrentrelativepath == "") ? "/gui/" : server.utorrentrelativepath;
	var scheme = server.hostsecure ? "https://" : "http://";

	var xhr = new XMLHttpRequest();
	xhr.open("GET", scheme + server.host + ":" + server.port + relpath + "token.html", false, server.login, server.password);
	xhr.send(null);
	var token;
	if(/<div.*?>(.*?)<\/div>/.exec(xhr.response)) {
		token = /<div.*?>(.*?)<\/div>/.exec(xhr.response)[1];
	} else {
		RTA.displayResponse("Failure", "Problem getting the uTorrent XHR token. Is uTorrent running?", true);
	}
	
	if(torrentdata.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("GET", scheme + server.host + ":" + server.port + relpath + "?token=" + token + "&action=add-url&s=" + encodeURIComponent(torrentdata), true, server.login, server.password);
		mxhr.onreadystatechange = ut_handleResponse;
		mxhr.send(message);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", scheme + server.host + ":" + server.port + relpath + "?token=" + token + "&action=add-file", true, server.login, server.password);
		xhr.onreadystatechange = ut_handleResponse;
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"file.torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += torrentdata + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
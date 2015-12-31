RTA.clients.qBittorrentAdder = function(server, data, torrentname) {
	var target;
	if(data.substring(0,7) == "magnet:")
		target = "download";
	else
		target = "upload";
	
	//check if webui is using cookie auth (v3.2+)
	var xhr = new XMLHttpRequest();
	var rootUrl = (server.hostsecure ? "https" : "http") + "://" + server.host + ":" + server.port;
	xhr.open("GET", rootUrl + "/version/qbittorrent", false, server.login, server.password);
	xhr.send();
	if (xhr.status == 200)
	{
		var xhr = new XMLHttpRequest();
		xhr.open("POST", rootUrl + "/login", false);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
		xhr.send("username=" + encodeURIComponent(server.login) + "&password=" + encodeURIComponent(server.password));
	}

	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/command/" + target, true, server.login, server.password);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
	
	if(data.substring(0,7) == "magnet:") {
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		var message = "urls=" + encodeURIComponent(data);
		xhr.send(message);
	} else {
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"torrentfile\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += data + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
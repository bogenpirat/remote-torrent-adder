RTA.clients.qBittorrentV2Adder = function(server, data, torrentname, label, dir) {

	var rootUrl = (server.hostsecure ? "https" : "http") + "://" + server.host + ":" + server.port;

	var loginXhr = new XMLHttpRequest();
	loginXhr.open("POST", rootUrl + "/api/v2/auth/login", true);
	loginXhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
	loginXhr.send("username=" + encodeURIComponent(server.login) + "&password=" + encodeURIComponent(server.password));
	loginXhr.onreadystatechange = function() {
		if(loginXhr.readyState == 4 && loginXhr.status == 0) {
			RTA.displayResponse("Failure", "Could not contact server at:  " + rootUrl, true);
		}
		else if(loginXhr.readyState == 4 && loginXhr.status == 200) {

			xhr = new XMLHttpRequest();
			xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/api/v2/torrents/add");
			xhr.onreadystatechange = function(data) {
				if(xhr.readyState == 4 && xhr.status == 200) {
					RTA.displayResponse("Success", "Torrent added successfully.");
				} else if(xhr.readyState == 4 && xhr.status != 200) {
					RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
				}
			};

			var boundary = "AJAX-----------------------" + (new Date).getTime();
			xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
			var message = "--" + boundary + "\r\n";

			if(data.substring(0,7) == "magnet:") {
				message += "Content-Disposition: form-data; name=\"urls\"\r\n\r\n";
				message += data + "\r\n";
				message += "--" + boundary + "\r\n";
			} else {
				message += "Content-Disposition: form-data; name=\"fileselect[]\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
				message += "Content-Type: application/x-bittorrent\r\n\r\n";
				message += data + "\r\n";
				message += "--" + boundary + "\r\n";
			}

			if(dir) {
				message += "Content-Disposition: form-data; name=\"savepath\"\r\n\r\n"
				message += dir + "\r\n";
				message += "--" + boundary + "\r\n";
			}

			if(label) {
				message += "Content-Disposition: form-data; name=\"category\"\r\n\r\n"
				message += label + "\r\n";
				message += "--" + boundary + "--\r\n";
			}

			xhr.sendAsBinary(message);
		}
		else if(loginXhr.readyState == 4 && loginXhr.status != 200)
		{
		 	RTA.displayResponse("Failure", "Unable to Authenticate with Server. HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
}

RTA.clients.qBittorrentAdder = function(server, data, torrentname, label, dir) {
	var target;
	if(data.substring(0,7) == "magnet:")
		target = "download";
	else
		target = "upload";
	
	
	var rootUrl = (server.hostsecure ? "https" : "http") + "://" + server.host + ":" + server.port;
	
	var loginXhr = new XMLHttpRequest();
	loginXhr.open("POST", rootUrl + "/login", true);
	loginXhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
	loginXhr.send("username=" + encodeURIComponent(server.login) + "&password=" + encodeURIComponent(server.password));
	loginXhr.onreadystatechange = function() {
		if(loginXhr.readyState == 4) {
			xhr = new XMLHttpRequest();
			xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/command/" + target, true, server.login, server.password);
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
	};
}
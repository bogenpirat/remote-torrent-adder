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
				if(xhr.readyState == 4 && xhr.status == 200 && xhr.responseText == "Ok.") {
					RTA.displayResponse("Success", "Torrent added successfully.");
				} else if(xhr.readyState == 4 && xhr.status != 200) {
					RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
				}
			};

			var message = new FormData();

			if(data.substring(0,7) == "magnet:") {
				message.append("urls", data)
			} else {
				const ords = Array.prototype.map.call(data, function byteValue(x) {
					return x.charCodeAt(0) & 0xff;
				});
				const ui8a = new Uint8Array(ords);
				const dataBlob = new Blob([ui8a.buffer], {type: "application/x-bittorrent"});
				const myName = ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime());
				message.append("fileselect[]", dataBlob, myName);
			}

			if(dir) {
				message.append("savepath", dir);
			}

			if(label) {
				message.append("category", label);
			}
			
			xhr.send(message);
		}
		else if(loginXhr.readyState == 4 && loginXhr.status != 200)
		{
		 	RTA.displayResponse("Failure", "Unable to Authenticate with Server. HTTP error code:\n" + loginXhr.status + ": " + loginXhr.responseText, true);
		}
	};
}

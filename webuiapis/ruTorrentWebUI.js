RTA.clients.ruTorrentAdder = function(server, data, label, dir) {
	if(label == undefined) label = server.rutorrentlabel;
	if(dir == undefined) dir = server.rutorrentdirectory;
	
	var autolabellist = server.autolabellist || "[]";
autoLabelling:
	if(autolabellist !== null && data.substring(0,7) != "magnet:") {
		autolabellist = JSON.parse(autolabellist);
		var torrentData = RTA.extractTorrentInfo(data);

		for(var i = 0; i < autolabellist.length; i++) {
			var tokens = autolabellist[i].split(",");

			if(tokens.length > 1) {
				var urlBit = tokens[0];
				var labelBit = tokens.slice(1).join(",");
				
				for(var it = torrentData.trackers.values(), val = null; val = it.next().value; ) {
					if(val.indexOf(urlBit) != -1) {
						label = labelBit;
						break autoLabelling;
					}
				}
			}
		}
	}

	var autodirlist = server.autodirlist || "[]";
autoDirectory:
	if(autodirlist !== null && data.substring(0,7) != "magnet:") {
		autodirlist = JSON.parse(autodirlist);
		var torrentData = RTA.extractTorrentInfo(data);

		for(var i = 0; i < autodirlist.length; i++) {
			var tokens = autodirlist[i].split(",");

			if(tokens.length > 1) {
				var urlBit = tokens[0];
				var dirBit = tokens.slice(1).join(",");
				
				for(var it = torrentData.trackers.values(), val = null; val = it.next().value; ) {
					if(val.indexOf(urlBit) != -1) {
						dir = dirBit;
						break autoDirectory;
					}
				}
			}
		}
	}


	var xhr = new XMLHttpRequest();
	
	var url = "http";
	url += (server.hostsecure ? "s" : "");
	url += "://";
	url += server.host;
	url += ":" + server.port;
	if(server.ruTorrentrelativepath == undefined || server.ruTorrentrelativepath[0] != "/")
		url += "/"; // first slash
	if(server.ruTorrentrelativepath != undefined)
		url += server.ruTorrentrelativepath;
	if(server.ruTorrentrelativepath != undefined && server.ruTorrentrelativepath.length != 0 && server.ruTorrentrelativepath[server.ruTorrentrelativepath.length - 1] != "/")
		url += "/"; // trailing slash
	url += "php/addtorrent.php?";
	if(dir != undefined && dir.length > 0)
		url += "dir_edit=" + encodeURIComponent(dir) + "&";
	if(label != undefined && label.length > 0)
		url += "label=" + encodeURIComponent(label);
	if(server.rutorrentaddpaused)
		url += "&torrents_start_stopped=1";
	
	xhr.open("POST", url, true);
	xhr.setRequestHeader('Authorization', 'Basic ' + btoa(server.login + ":" + server.password));
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*addTorrentSuccess.*/.exec(xhr.responseText) || /.*result\[\]=Success.*/.exec(xhr.responseURL)) {
				RTA.displayResponse("Success", "Torrent added successfully.");
			} else {
				RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------" + (new Date).getTime();
	var message = "";
	
	if(data.substring(0,7) == "magnet:") {
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.send("url=" + encodeURIComponent(data));
	} else {
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		
		if(dir != undefined && dir.length > 0) {
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"dir_edit\"\r\n\r\n";
		   message += dir + "\r\n";
		}
		if(label != undefined && label.length > 0) {
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"tadd_label\"\r\n\r\n";
		   message += label + "\r\n";
		}
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"" + (new Date).getTime() + ".torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += data + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}

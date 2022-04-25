RTA.clients.ruTorrentAdder = function(server, data, label, dir) {
	if(label == undefined) label = server.rutorrentlabel;
	if(dir == undefined) dir = server.rutorrentdirectory;

	var autolabellist = server.autolabellist || "[]";
autoLabelling:
	if(autolabellist !== null && data.substring(0,7) != "magnet:" && !server.rutorrentalwaysurl) {
		autolabellist = JSON.parse(autolabellist);
		try {
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
		} catch(exception) {
			// no op: if torrent hash extraction fails, we can just skip torrent info extraction.
		}
	}

	var autodirlist = server.autodirlist || "[]";
autoDirectory:
	if(autodirlist !== null && data.substring(0,7) != "magnet:" && !server.rutorrentalwaysurl) {
		autodirlist = JSON.parse(autodirlist);
		try {
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
		} catch(exception) {
			// no op: if torrent hash extraction fails, we can just skip torrent info extraction.
		}
	}


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
	if(server.rutorrentdontaddnamepath)
		url += "&not_add_path=1";

	var message;
	var headers = {  };
	if(data.substring(0,7) == "magnet:" || server.rutorrentalwaysurl) {
		headers["Content-Type"] = "application/x-www-form-urlencoded";
		message = "url=" + encodeURIComponent(data);
	} else {
		message = new FormData();

		if(dir != undefined && dir.length > 0) {
			message.append("dir_edit", dir);
		}
		if(label != undefined && label.length > 0) {
			message.append("tadd_label", label);
		}

		const blobData = RTA.convertToBlob(data, "application/x-bittorrent");
		const filename = (new Date).getTime() + ".torrent";

		message.append("torrent_file", blobData, filename);
	}

	fetch(url, {
		method: 'POST',
		headers: headers,
		body: message
	}).then(RTA.handleFetchError)
	.then(response => {
		if(/.*result\[\]=Success.*/.exec(response.url)) {
			RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
			throw new Error("success");
		} else {
			return response;
		}
	})
	.then(response => response.text())
	.then(text => {
		if(/.*addTorrentSuccess.*/.exec(text)) {
			RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + text, true);
		}
	})
	.catch(error => {
		if(error.message != "success") {
			RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
		}
	});
}

RTA.clients.uTorrentAdder = function(server, torrentdata) {
	var relpath = (server.utorrentrelativepath == undefined || server.utorrentrelativepath == "") ? "/gui/" : server.utorrentrelativepath;
	var scheme = server.hostsecure ? "https://" : "http://";

	var tokenUrl = scheme + server.host + ":" + server.port + relpath + "token.html";
	fetch(tokenUrl)
	.then(RTA.handleFetchError)
	.then(response => response.text())
	.then(response => {
		if(/<div.*?>(.*?)<\/div>/.exec(response)) {
			const token = /<div.*?>(.*?)<\/div>/.exec(response)[1];
			var postUrl = scheme + server.host + ":" + server.port + relpath + "?token=" + token;
			var message;
			var fetchOpts = {
				headers: {  }
			};

			if(torrentdata.substring(0,7) == "magnet:") {
				postUrl += "&action=add-url&s=" + encodeURIComponent(torrentdata);

				fetchOpts["method"] = 'GET';
			} else {
				postUrl += "&action=add-file";
				
				const data = RTA.convertToBlob(torrentdata, "application/x-bittorrent");
				message = new FormData();
				message.append("torrent_file", data, "file.torrent");
				
				fetchOpts["method"] = 'POST';
				fetchOpts["body"] = message;
			}

			fetch(postUrl, fetchOpts)
			.then(RTA.handleFetchError)
			.then(response => response.json())
			.then(json => {
				if(!json.error) {
					RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
				} else {
					RTA.displayResponse("Failure", "Torrent not added successfully.\n" + response.error, true);
				}
			})
			.catch(error => {
				RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
			});
		} else {
			throw new Error("Couldn't get csrf token");
		}
	})
	.catch(error => {
		RTA.displayResponse("Failure", "Could not connect to " + server.name + "\nError: " + error.message, true);
	});

};

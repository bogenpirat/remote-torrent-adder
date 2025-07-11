RTA.clients.torrentfluxAdder = async function(server, torrentdata, torrentname) {
	if(torrentdata.substring(0,7) == "magnet:") {
		displayResponse("Client Failure", "sorry, but torrentflux doesn't support magnet links.");
		return;
	}

	var loginurl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + server.torrentfluxrelativepath + "/login.php";

	// log in to create a functioning session
	const loginResponse = await fetch(loginurl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: "username=" + encodeURIComponent(server.login) + "&iamhim=" + encodeURIComponent(server.password)
	});
	const loginText = await loginResponse.text();

	if(/.*Password is required.*/.exec(loginText) || /.*Login failed.*/.exec(loginText)) {
		RTA.displayResponse("Failure", "Credentials weren't accepted:\n" + loginText, true);
		return;
	}

	// send the torrent
	var boundary = "AJAX-----------------------" + (new Date).getTime();
	var message = "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"upload_file\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += torrentdata + "\r\n";
	   message += "--" + boundary + "--\r\n";

	const uploadResponse = await fetch("http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + server.torrentfluxrelativepath + "/index.php", {
		method: "POST",
		headers: {
			"Content-Type": "multipart/form-data; boundary=" + boundary
		},
		body: new TextEncoder().encode(message)
	});
	const uploadText = await uploadResponse.text();

	if (uploadResponse.ok) {
		RTA.displayResponse("Success", "Torrent added successfully.");
	} else {
		RTA.displayResponse("Failure", "Server didn't accept data:\n" + uploadResponse.status + ": " + uploadText, true);
	}
}
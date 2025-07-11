async function handleResponse(response) {
	const text = await response.text();
	try {
		const json = JSON.parse(text);
		if(json.success) {
			RTA.displayResponse("Success", "Torrent added successfully.");
		} else {
			RTA.displayResponse("Failure", "Server didn't accept data: " + JSON.stringify(text), true);
		}
	} catch (e) {
		RTA.displayResponse("Failure", "Invalid response: " + text, true);
	}
}

RTA.clients.synologyAdder = async function(server, torrentdata, torrentname) {
	const scheme = server.hostsecure ? "https://" : "http://";

	// Login to get SID
	const loginUrl = `${scheme}${server.host}:${server.port}/webapi/auth.cgi?api=SYNO.API.Auth&version=2&method=login&account=${encodeURIComponent(server.login)}&passwd=${encodeURIComponent(server.password)}&session=DownloadStation&format=sid`;
	const loginResponse = await fetch(loginUrl);
	const loginText = await loginResponse.text();
	let sid;
	try {
		const json = JSON.parse(loginText);
		if(json && json.data) {
			sid = json.data.sid;
		} else {
			RTA.displayResponse("Failure", "Problem getting the Synology SID. Is the configuration correct?", true);
			return;
		}
	} catch (e) {
		RTA.displayResponse("Failure", "Problem parsing Synology login response.", true);
		return;
	}

	if(torrentdata.substring(0,7) == "magnet:") {
		const url = `${scheme}${server.host}:${server.port}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=2&method=create&_sid=${sid}&uri=${encodeURIComponent(torrentdata)}`;
		const response = await fetch(url);
		await handleResponse(response);
	} else {
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"api\"\r\n\r\n";
		   message += "SYNO.DownloadStation.Task" + "\r\n";
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"version\"\r\n\r\n";
		   message += "2" + "\r\n";
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"method\"\r\n\r\n";
		   message += "create" + "\r\n";
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"_sid\"\r\n\r\n";
		   message += sid + "\r\n";
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"file\"; filename=\"" + torrentname + "\"\r\n";
		   message += "Content-Type: application/octet-stream\r\n\r\n";
		   message += torrentdata + "\r\n";
		   message += "--" + boundary + "--\r\n";

		const url = `${scheme}${server.host}:${server.port}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=2&method=create&_sid=${sid}`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "multipart/form-data; boundary=" + boundary
			},
			body: new TextEncoder().encode(message)
		});
		await handleResponse(response);
	}
}
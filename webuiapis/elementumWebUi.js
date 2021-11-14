RTA.clients.elementumAdder = async function(server, torrentdata, name) {
    const scheme = server.hostsecure ? "https" : "http";
    const apiUrl = scheme + "://" + server.host + ":" + server.port + "/playuri"; //"/torrents/add";
    const torrentName = ((name.length && name.length > 1) ? name : (new Date).getTime())
    var xhr = new XMLHttpRequest();
	xhr.open("POST", apiUrl, true);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			RTA.displayResponse("Sent to Kodi", "'"+ torrentName +"' added successfully.");
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------" + (new Date).getTime();
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	var message = "";
    
    message += "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"uri\"" + "\"\r\n";
    message += "\r\n";
    message += "\r\n";
    
    message += "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"file\"; filename=\"" + torrentName + "\"\r\n";
    message += "Content-Type: application/x-bittorrent\r\n\r\n";
    message += torrentdata + "\r\n";
    message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);

    return;
}
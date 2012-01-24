function addTorrentTopyrtWebUI(data, filename) {
	if(data.substring(0,7) == "magnet:") {
		displayResponse("Client Failure", "sorry, pyrt doesn't support magnet");
		return;
	}

	var url = "http"+((localStorage["hostsecure"]=='true')?"s":"")+"://"+localStorage["host"]+":"+localStorage["port"]+"/";
	// log in to create a functioning session
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url, false);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.send("password="+localStorage["password"]);
	
	if(/.*Incorrect Password.*/.exec(xhr.responseText)) {
		displayResponse("Failure", "Credentials weren't accepted:\n"+xhr.responseText);
		return;
	}
	
	// send the torrent
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url+"ajax", true, localStorage["login"], localStorage["password"]);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*Redirect.*/.exec(xhr.responseText)) {
				displayResponse("Success", "Torrent added successfully.");
			} else {
				displayResponse("Failure", "Server didn't accept data:\n"+xhr.status+": "+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse("Failure", "Server responded with an irregular HTTP error code:\n"+xhr.status+": "+xhr.responseText);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------"+(new Date).getTime();
	
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	
	var message = "--" + boundary + "\r\n";
	message += "Content-Disposition: form-data; name=\"request\"\r\n\r\n";
	message += "upload_torrent\r\n";
	message += "--" + boundary + "\r\n";
	message += "Content-Disposition: form-data; name=\"start\"\r\n\r\n";
	message += "on\r\n";
	message += "--" + boundary + "\r\n";
	message += "Content-Disposition: form-data; name=\"torrent\"; filename=\""+filename+"\"\r\n";
	message += "Content-Type: application/x-bittorrent\r\n\r\n";
	message += data + "\r\n";
	message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}
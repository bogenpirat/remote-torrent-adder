function ut_handleResponse(data) {
	console.debug("hi");
	if(this.readyState == 4 && this.status == 200) {
		if(/\{"build":\d+\}/.test(this.responseText)) {
			displayResponse("Success", "Torrent added successfully.");
		} else {
			displayResponse("Failure", "Server didn't accept data:\n"+this.status+": "+this.responseText);
		}
	} else if(this.readyState == 4 && this.status != 200) {
		displayResponse("Failure", "Server responded with an irregular HTTP error code:\n"+this.status+": "+this.responseText);
	}
}

function addTorrentTouTorrentWebUI(torrentdata) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://"+localStorage["host"]+":"+localStorage["port"]+"/gui/token.html", false, localStorage["login"], localStorage["password"]);
	xhr.send(null);
	var token = /<div.*?>(.*?)<\/div>/.exec(xhr.response)[1];
	
	if(torrentdata.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("GET", "http://"+localStorage["host"]+":"+localStorage["port"]+"/gui/?token="+token+"&action=add-url&s="+encodeURIComponent(torrentdata), true, localStorage["login"], localStorage["password"]);
		mxhr.onreadystatechange = ut_handleResponse;
		mxhr.send(message);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", "http://"+localStorage["host"]+":"+localStorage["port"]+"/gui/?token="+token+"&action=add-file", true, localStorage["login"], localStorage["password"]);
		xhr.onreadystatechange = ut_handleResponse;
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------"+(new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"file.torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += torrentdata + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
function handleResponse(data) {
	if(this.readyState == 4 && this.status == 200) {
		if(/.*loaded successfully.*/.exec(this.responseText)) {
			displayResponse("Success", "Torrent added successfully.");
		} else {
			displayResponse("Failure", "Server didn't accept data:\n"+this.status+": "+this.responseText);
		}
	} else if(this.readyState == 4 && this.status != 200) {
		displayResponse("Failure", "Server responded with an irregular HTTP error code:\n"+this.status+": "+this.responseText);
	}
};

function addTorrentToVuzeHTMLUI(data) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://"+localStorage["host"]+":"+localStorage["port"]+"/index.tmpl?d=u&local=1", true, localStorage["login"], localStorage["password"]);
	xhr.onreadystatechange = handleResponse;
	
	if(data.substring(0,7) == "magnet:") {
		var mxhr = new XMLHttpRequest();
		mxhr.open("GET", "http://"+localStorage["host"]+":"+localStorage["port"]+"/index.tmpl?d=u&upurl="+encodeURIComponent(data), true, localStorage["login"], localStorage["password"]);
		mxhr.onreadystatechange = handleResponse;
		mxhr.send(message);
	} else {
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------"+(new Date).getTime();
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		var message = "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"upfile_1\"; filename=\"file.torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += data + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}
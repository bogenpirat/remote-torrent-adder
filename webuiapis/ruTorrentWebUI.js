function addTorrentToruTorrentWebUI(data) {
	var xhr = new XMLHttpRequest();
	//var url = "http"+((localStorage["hostsecure"]=='true')?"s":"")+"://"+localStorage["host"]+":"+localStorage["port"]+"/rutorrent/php/addtorrent.php?";
	var url = "http://"+localStorage["host"]+":"+localStorage["port"]+localStorage["relativepath"]+"/php/addtorrent.php?";
	
	xhr.open("POST", url, true, localStorage["login"], localStorage["password"]);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*addTorrentSuccess.*/.exec(xhr.responseText)) {
				displayResponse(0);
			} else {
				displayResponse("server didn't accept data:\n"+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse(-2);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------"+(new Date).getTime();
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	var message = "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"file.torrent\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += data + "\r\n";
	   message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}
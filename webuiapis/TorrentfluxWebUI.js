function addTorrentToTorrentfluxWebUI(torrentdata, torrentname) {
	var loginurl = "http://"+localStorage["host"]+":"+localStorage["port"]+localStorage["relativepath"]+"/login.php";
	
	// log in to create a functioning session
	var xhr = new XMLHttpRequest();
	xhr.open("POST", loginurl, false);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.send("username="+localStorage["login"]+"&iamhim="+localStorage["password"]);
	
	if(/.*Password is required.*/.exec(xhr.responseText) || /.*Login failed.*/.exec(xhr.responseText)) {
		displayResponse(-4); console.log(xhr.responseText);
		return;
	}
	
	// send the torrent
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://"+localStorage["host"]+":"+localStorage["port"]+localStorage["relativepath"]+"/index.php", true);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
		console.log(xhr.responseText);
			displayResponse(0);
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse(-2);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------"+(new Date).getTime();
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	var message = "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"upload_file\"; filename=\""+((torrentname.length && torrentname.length>1) ? torrentname : (new Date).getTime())+".torrent\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += torrentdata + "\r\n";
	   message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}
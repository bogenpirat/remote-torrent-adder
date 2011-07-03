chrome.extension.sendRequest({"action": "getStorageData"}, function(response) {
	if(response["catchfrompage"] != "true") return;
	var links = new Array();
	var rL = document.getElementsByTagName('a');
	res = response["linkmatches"].split("~");
	if(response["linkmatches"] != "") {
		for(lkey in rL) {
		for(mkey in res) {
			if(rL[lkey].href && rL[lkey].href.match(new RegExp(res[mkey], "g"))) {
				links.push(rL[lkey]);
				break;
			}
		}}
	}
	
	if(links.length != 0) {
		if(response["linksfoundindicator"]=="true") chrome.extension.sendRequest({"action": "pageActionToggle"});
		for(key in links) {
			if(links[key].addEventListener) {
				links[key].addEventListener('click', function(e) {
					e.preventDefault();
					chrome.extension.sendRequest({"action": "addTorrent", "url": this.href});
				});
			}
		}
	}
});
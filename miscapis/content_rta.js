chrome.extension.sendRequest({"action": "getStorageData"}, function(response) {
	if(response["catchfrompage"] != "true") return;
	
	// handle common links
	var links = new Array();
	var rL = document.getElementsByTagName('a');
	res = response["linkmatches"].split("~");
	res.push("magnet:");
	if(response["linkmatches"] != "") {
		for(lkey in rL) {
		for(mkey in res) {
			if(rL[lkey].href && rL[lkey].href.match(new RegExp(res[mkey], "g"))) {
				links.push(rL[lkey]);
				break;
			}
		}}
	}
	
	// handle forms
	var rB1 = Array.prototype.slice.call(document.getElementsByTagName('button'));
	var rB2 = Array.prototype.slice.call(document.getElementsByTagName('input'));
	var rB = rB1.concat(rB2);
	
	var forms = new Array();
	for (x in rB) { // get an index-parallel array of parent forms
		forms.push(rB[x].form);
	}
	for (x in rB) {
		for(mkey in res) {
			if(forms[x] != null && forms[x].hasOwnProperty('action') && forms[x].action.match && forms[x].action.match(new RegExp(res[mkey], "g"))) {
				rB[x].href = forms[x].action;
				links.push(rB[x]);
				break;
			}
		}
	}
	
	// re-register actions
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
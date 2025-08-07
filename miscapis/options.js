// Storage helper functions for Manifest V3
console.log('options.js file is loading...');

async function getStorageData(keys) {
	return new Promise((resolve) => {
		chrome.storage.local.get(keys, resolve);
	});
}

async function setStorageData(data) {
	return new Promise((resolve) => {
		chrome.storage.local.set(data, resolve);
	});
}

console.log('Storage functions defined');

console.log('About to set up document ready...');
console.log('jQuery available:', typeof $);

if (typeof $ === 'undefined') {
	console.error('jQuery is not available!');
} else {
	console.log('jQuery version:', $.fn.jquery);
}

console.log('Setting up document ready handler...');

$(document).ready(function(){
	console.log('Document ready function called');

	// Handle async operations inside the function
	async function initializeOptions() {
		try {
		var tabCounter = 1;

		console.log('About to call registerGeneralSettingsEvents');
		registerGeneralSettingsEvents();

		console.log('About to call loadGeneralSettings');
		await loadGeneralSettings();
		console.log('loadGeneralSettings completed');

	$(function() {
		$("#configtabs").tabs();
	});

	console.log('About to initialize server tabs...');
	// new server type selection dialog // tab adding stuff
	$(function() {
		console.log('Server tabs initialization started');

		// Handle async operations
		async function initServerTabs() {

		var tabTitle = $("#tab_title");
		var tabClient = $("#tab_client");
		var tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";
		var tabs = $("#serverstabs").tabs();

		tabs.find(".ui-tabs-nav").sortable({
			stop: function() {
				tabs.tabs("refresh");
				saveServersSettings().catch(console.error);
			}
		});

		var form = $("#dialog").find("form");

		var dialog = $("#dialog").dialog({
			autoOpen: false,
			modal: true,
			buttons: {
				Add: function() {
					addTab(tabTitle.val()).then(result => {
						if(result) {
							$(this).dialog("close");
						}
					}).catch(console.error);
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			close: function() {
				form[0].reset();
			}
		});

		form.submit(function() {
			addTab(tabTitle.val()).then(result => {
				if(result) {
					dialog.dialog("close");
				}
			}).catch(console.error);
			return false;
		});

		async function addTab(name, client, oldload) {
			// some input validation
			const data = await getStorageData(['servers']);
			var servers = JSON.parse(data.servers || '[]');
			if(oldload !== true) {
				for(var x in servers) {
					if(servers[x].name == name || name === null || name === "") {
						alert("This name is already in use by another server, or invalid.");
						return false;
					}
				}
			}

			var id = "servertabs-" + tabCounter;
			var li = $(tabTemplate.replace(/#\{href\}/g, "#" + id).replace(/#\{label\}/g, name));
			var tabContentHtml = RTA.clients.config.getConfig(client || tabClient.val(), name);

			tabs.find(".ui-tabs-nav").append(li);
			tabs.append("<div id='" + id + "'><p>" + tabContentHtml + "</p></div>");
			tabs.tabs("refresh");
			if(oldload !== true) {
				tabs.tabs("option", "active", -1);
			} else {
				tabs.tabs("option", "active", 0);
			}
			tabCounter++;

			$("input, select").bind("change keyup", function() {
				saveServersSettings().catch(console.error);
			});

			return true;
		}


		$("#add_tab").button().click(function() {
			dialog.dialog("open");
		});

		// close icon: removing the tab on click
		tabs.delegate("span.ui-icon-close", "click", async function() {
			var panelId = $(this).closest("li").remove().attr("aria-controls");
			$("#" + panelId).remove();
			tabs.tabs("refresh");
			await saveServersSettings();
		});

		tabs.bind("keyup", async function(event) {
			if (event.altKey && event.keyCode === $.ui.keyCode.BACKSPACE) {
				var panelId = tabs.find(".ui-tabs-active").remove().attr("aria-controls");
				$("#" + panelId).remove();
				tabs.tabs("refresh");
				await saveServersSettings();
			}
		});


		// load server configs
		const serverData = await getStorageData(['servers']);
		var servers = JSON.parse(serverData.servers || '[]');
		for(var i in servers) {
			var server = servers[i];

			await addTab(server.name, server.client, true);

			var mySettingInputs = $("#servertabs-" + (parseInt(i) + 1)).find("input, select").get();
			for(var u in mySettingInputs) {
				var mySettingInput = mySettingInputs[u];
				if(server.hasOwnProperty(mySettingInput.name)) {
					switch(mySettingInput.type) {
						case "checkbox":
							$(mySettingInput).prop('checked', server[mySettingInput.name]);
							break;
						case "select-multiple":
							var optionlist = JSON.parse(server[mySettingInput.name]);
							for(var k in optionlist) {
								$(mySettingInput).append($("<option>", {
									text: optionlist[k]
								}));
							}
							break;
						default:
							$(mySettingInput).val(server[mySettingInput.name]);
					}
				}
				
				if(mySettingInput.type == "select-multiple") {
					switch(mySettingInput.name) {
						case "dirlist":
							var thisTd = $(mySettingInput).parents("td");
							thisTd.find("button[name=adddirbutton]").click(function() {
								var answer = prompt("Enter a new directory");
								if(answer !== null) {
									$(this).parents("td").find("select[name=dirlist]").append($("<option>", {
										text: answer
									}));
									saveServersSettings();
								}
							});
							thisTd.find("button[name=deldirbutton]").click(function() {
								$(this).parents("td").find("select[name=dirlist] option:selected").remove();
								saveServersSettings();
							});
							break;
						case "labellist":
							var thisTd = $(mySettingInput).parents("td");
							thisTd.find("button[name=addlabelbutton]").click(function() {
								var answer = prompt("Enter a new label");
								if(answer !== null) {
									$(this).parents("td").find("select[name=labellist]").append($("<option>", {
										text: answer
									}));
									saveServersSettings();
								}
							});
							thisTd.find("button[name=dellabelbutton]").click(function() {
								$(this).parents("td").find("select[name=labellist] option:selected").remove();
								saveServersSettings();
							});
							break;
						case "autolabellist":
							var thisTd = $(mySettingInput).parents("td");
							thisTd.find("button[name=addautolabelbutton]").click(function() {
								var answer = prompt("Enter a new tracker url / label combination like this:\nSOMETRACKER.COM,SOMELABEL");
								if(answer !== null) {
									$(this).parents("td").find("select[name=autolabellist]").append($("<option>", {
										text: answer
									}));
									saveServersSettings();
								}
							});
							thisTd.find("button[name=delautolabelbutton]").click(function() {
								$(this).parents("td").find("select[name=autolabellist] option:selected").remove();
								saveServersSettings();
							});
							break;
						case "autodirlist":
							var thisTd = $(mySettingInput).parents("td");
							thisTd.find("button[name=addautodirbutton]").click(function() {
								var answer = prompt("Enter a new tracker url / directory combination like this:\nSOMETRACKER.COM,SOMEDIRECTORY");
								if(answer !== null) {
									$(this).parents("td").find("select[name=autodirlist]").append($("<option>", {
										text: answer
									}));
									saveServersSettings();
								}
							});
							thisTd.find("button[name=delautodirbutton]").click(function() {
								$(this).parents("td").find("select[name=autodirlist] option:selected").remove();
								saveServersSettings();
							});
							break;
					}
				}
			}
		}
		} // end of initServerTabs async function

		// Call the async function
		initServerTabs().catch(console.error);
	}); // end of server tabs $(function()

		} catch (error) {
			console.error('Error in document ready function:', error);
			alert('Error loading options page: ' + error.message);
		}
	} // end of initializeOptions

	// Call the async initialization function
	initializeOptions();
}); // end of main $(document).ready

async function loadGeneralSettings() {
	var e = document.querySelectorAll("#linksfoundindicator,#showpopups,#popupduration,#hearpopups,#catchfromcontextmenu,#catchfrompage,#linkmatches,#catchfromnewtab,#registerDelay")
	for (let i = 0; i < e.length; i++) {
		await getSetting(e[i]);
	}

	// load matches
	await loadMatches();

	// set visibility
	flipVisibility("showpopups", "popupduration");
	flipVisibility("catchfrompage", "linkmatches");
}

function flipVisibility(checkname, changename) {
	document.getElementById(changename).disabled = (document.getElementById(checkname).checked) ? false : true;
}

async function setSetting(e, val) {
	const data = {};
	data[e.id] = (val == undefined) ? "" : val;
	await setStorageData(data);
}

async function getSetting(e) {
	const data = await getStorageData([e.id]);
	if(e.type == "text" || e.type == "password") {
		document.getElementById(e.id).value = (data[e.id] == undefined) ? "" : data[e.id];
	} else if(e.type == "checkbox") {
		document.getElementById(e.id).checked = (data[e.id] == "true") ? true : false;
	}
}

function saveMatches() {
	var opts = document.getElementById("linkmatches").getElementsByTagName("option");
	var destStr = ""; var i=0;
	for(key in opts)
		if(opts[key].text) {
			var sep = (i++ == 0) ? "" : "~";
			destStr += sep + opts[key].text;
		}
	chrome.storage.local.set({linkmatches: destStr});
}

async function loadMatches() {
	const data = await getStorageData(['linkmatches']);
	var newSelEl = document.createElement("select");
	newSelEl.setAttribute("id", "linkmatches");
	newSelEl.setAttribute("multiple", "multiple");
	newSelEl.setAttribute("size", "5");
	if(data.linkmatches && data.linkmatches != "")
		for(key in data.linkmatches.split("~")) {
			var newEl = document.createElement("option");
			newEl.text = data.linkmatches.split("~")[key];
			newSelEl.appendChild(newEl);
		}
	var selEl = document.getElementById("linkmatches");
	selEl.parentNode.appendChild(newSelEl);
	selEl.parentNode.removeChild(selEl);
}

function addMatch() {
	var newMatch = prompt("Enter a partial string of a link that should be caught by the extension","");
	if(!newMatch) return;
	
	var newOpt = new Option(newMatch);
	document.getElementById('linkmatches').appendChild(newOpt);
	saveMatches();
}

function deleteMatches() {
	var list = document.getElementById('linkmatches');
	for(var i = list.length-1; i>=0; i--)
		if(list.options[i].selected) {
			list.removeChild(list.options[i]);
		}
	saveMatches();
}

Storage.prototype.setObject = function(key, val) {
	this.setItem(key, JSON.stringify(val));
}
Storage.prototype.getObject = function(key) {
	var value = this.getItem(key);
    return value && JSON.parse(value);
}

function registerGeneralSettingsEvents() {
	console.log('registerGeneralSettingsEvents() called');

	const testButton = document.querySelector("#notificationtest");
	console.log('Notification test button found:', testButton);

	document.querySelector("#linksfoundindicator").onchange = function() {
		setSetting(this, (this.checked) ? 'true' : 'false');
	};
	
	document.querySelector("#showpopups").onchange = function() {
		setSetting(this, (this.checked) ? 'true' : 'false');
	};
	document.querySelector("#showpopups").onclick = function() {
		flipVisibility(this.id, 'popupduration');
	};

	document.querySelector("#hearpopups").onchange = function() {
		setSetting(this, (this.checked) ? 'true' : 'false');
	};
	
	document.querySelector("#popupduration").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#notificationtest").onclick = function() {
		console.log('Notification test button clicked');

		// Test direct Chrome notification API
		console.log('Testing direct Chrome notification...');
		chrome.notifications.create({
			type: 'basic',
			iconUrl: chrome.runtime.getURL('icons/BitTorrent128.png'),
			title: 'Direct Test Notification',
			message: 'This is a direct Chrome notification test!'
		}, function(notificationId) {
			if (chrome.runtime.lastError) {
				console.error('Direct notification error:', chrome.runtime.lastError);
			} else {
				console.log('Direct notification created:', notificationId);
			}
		});

		// Also test RTA function
		console.log('RTA object available:', typeof RTA);
		console.log('RTA.displayResponse available:', typeof RTA.displayResponse);

		if (typeof RTA !== 'undefined' && typeof RTA.displayResponse === 'function') {
			console.log('Calling RTA.displayResponse...');
			RTA.displayResponse("This is a test notification","This is a test message!",false);
		} else {
			console.error('RTA.displayResponse is not available');
			alert('RTA.displayResponse is not available. Check console for details.');
		}
	};
	
	document.querySelector("#catchfromcontextmenu").onchange = function() {
		setSetting(this, (this.checked) ? 'true' : 'false');
	};
	
	document.querySelector("#catchfrompage").onchange = function() {
		setSetting(this, (this.checked) ? 'true' : 'false');
	};
	document.querySelector("#catchfrompage").onclick = function() {
		flipVisibility(this.id, 'linkmatches');
	};
	
	document.querySelector("#catchfromnewtab").onchange = function() {
		setSetting(this, (this.checked) ? 'true' : 'false');
	};
	
	document.querySelector("#addfilterbtn").onclick = function() {
		addMatch();
	};
	
	document.querySelector("#delfilterbtn").onclick = function() {
		deleteMatches();
	};
	
	document.querySelector("#showfiltersbtn").onclick = async function() {
		const data = await chrome.storage.local.get(['linkmatches']);
		alert(data.linkmatches || 'No filters configured');
	};

	document.querySelector("#registerDelay").onkeyup = function() {
		setSetting(this, this.value);
	};

	document.querySelector("#createBackupButton").onclick = async function() {
		try {
			const data = await chrome.storage.local.get();
			const text = JSON.stringify(data);

			var el = document.createElement("a");
			el.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(text));
			el.setAttribute("download", "RTA-settings.json");
			el.style.display = "none";
			document.body.appendChild(el);
			el.click();
			document.body.removeChild(el);
		} catch (error) {
			console.error('Error creating backup:', error);
			alert('Error creating backup: ' + error.message);
		}
	};

	document.querySelector("#importBackupSelector").onchange = function() {
		if (this.files.length === 0) {
			return;
		} else {
			const reader = new FileReader();
			reader.onload = async function() {
				const resultField = document.querySelector("#importResultField");
				try {
					const settings = JSON.parse(reader.result);

					await chrome.storage.local.set(settings);

					resultField.innerHTML = "Result: &#x2714; Settings imported";
				} catch(ex) {
					resultField.innerHTML = "Result: &#x274C; Couldn't parse the input file.";
				}

			};
			reader.readAsText(this.files[0]);
		}
	};
}

async function saveServersSettings() {
	var order = {};
	var links = $("a[href^=#servertabs-]").get();
	for(var i in links) {
		order[links[i].href.split('#')[1]] = i;
	}

	var servers = [];
	$("div[id^=servertabs-]").each(function(_, el) {
		var thisId = $(el).prop("id");
		var server = {};
		var elements = $(el).find("input, select").get();
		for(var u in elements) {
			var element = elements[u];

			switch(element.type) {
				case "checkbox":
					server[element.name] = $(element).prop('checked');
					break;
				case "select-multiple":
					server[element.name] = JSON.stringify(Array.prototype.map.call(element.options, function(x) { return x.value }));
					break;
				default:
					server[element.name] = $(element).val();
			}
		}
		servers[order[thisId]] = server;
	});

	await setStorageData({"servers": JSON.stringify(servers)});

	chrome.runtime.sendMessage({"action": "constructContextMenu"});

	chrome.runtime.sendMessage({"action": "registerRefererListeners"});

	chrome.runtime.sendMessage({"action": "registerAuthenticationListeners"});

	return servers;
}

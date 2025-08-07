// Service Worker for Remote Torrent Adder - Manifest V3
// This replaces the background scripts from Manifest V2

// Import all the necessary scripts
importScripts(
	'storage-migration.js',
	'RTAinit.js',
	'browser.js',
	'safe-buffer.js',
	'bencode.js',
	'config.js',
	'base64.js',
	'../webuiapis/VuzeSwingUI.js',
	'../webuiapis/TorrentfluxWebUI.js',
	'../webuiapis/TransmissionWebUI.js',
	'../webuiapis/uTorrentWebUI.js',
	'../webuiapis/ruTorrentWebUI.js',
	'../webuiapis/VuzeHTMLUI.js',
	'../webuiapis/VuzeRemoteUI.js',
	'../webuiapis/BuffaloWebUI.js',
	'../webuiapis/qBittorrentWebUI.js',
	'../webuiapis/qBittorrentWebUI-v2.js',
	'../webuiapis/QnapDownloadStation.js',
	'../webuiapis/DelugeWebUI.js',
	'../webuiapis/pyrtWebUI.js',
	'../webuiapis/TixatiWebUI.js',
	'../webuiapis/HadoukenWebUI.js',
	'../webuiapis/nodejsrtorrentWebUI.js',
	'../webuiapis/SynologyWebUI.js',
	'../webuiapis/floodWebUI.js',
	'../webuiapis/flood-jesecWebUI.js',
	'../webuiapis/tTorrentWebUI.js',
	'../webuiapis/rtorrentXmlRpc.js',
	'../webuiapis/elementumWebUi.js'
);

// Service worker compatible functions (replacing functions.js)
var menuItemIndexToServerIndex = [];

RTA.dispatchTorrent = function(server, data, name, label, dir) {
	switch (server.client) {
		case "Vuze SwingUI":
			RTA.clients.vuzeSwingAdder(server, data); break;
		case "Torrentflux WebUI":
			RTA.clients.torrentfluxAdder(server, data, name); break;
		case "Transmission WebUI":
			RTA.clients.transmissionAdder(server, data); break;
		case "uTorrent WebUI":
			RTA.clients.uTorrentAdder(server, data); break;
		case "ruTorrent WebUI":
			RTA.clients.ruTorrentAdder(server, data, label, dir); break;
		case "Vuze HTML WebUI":
			RTA.clients.vuzeHtmlAdder(server, data); break;
		case "Vuze Remote WebUI":
		case "Bigly/Vuze Remote WebUI":
			RTA.clients.vuzeRemoteAdder(server, data); break;
		case "Buffalo WebUI":
		case "Buffalo WebUI (OLD!)":
			RTA.clients.buffaloAdder(server, data, name); break;
		case "qBittorrent WebUI":
			RTA.clients.qBittorrentAdder(server, data, name, label, dir); break;
		case "Deluge WebUI":
			RTA.clients.delugeAdder(server, data, name); break;
		case "pyrt WebUI":
			RTA.clients.pyrtAdder(server, data, name); break;
		case "Tixati WebUI":
			RTA.clients.tixatiAdder(server, data, name); break;
		case "Hadouken WebUI":
			RTA.clients.hadoukenAdder(server, data, name); break;
		case "NodeJS-rTorrent WebUI":
			RTA.clients.nodeJSrTorrentAdder(server, data, name); break;
		case "Synology WebUI":
			RTA.clients.synologyAdder(server, data, name); break;
		case "flood WebUI":
			RTA.clients.floodAdder(server, data, name); break;
		case "flood-jesec WebUI":
			RTA.clients.floodJesecAdder(server, data, name); break;
		case "tTorrent WebUI":
			RTA.clients.tTorrentAdder(server, data, name); break;
		case "rTorrent XML-RPC":
			RTA.clients.rtorrentXmlRpcAdder(server, data, name); break;
		case "Elementum WebUI":
			RTA.clients.elementumAdder(server, data, name); break;
		default:
			RTA.displayResponse("Failure", "No client selected.", true);
	}
};

RTA.getTorrent = function(server, url, label, dir, referer) {
	if(url.substring(0,7) == "magnet:" || server.rutorrentalwaysurl) {
		RTA.dispatchTorrent(server, url, "", label, dir);
	} else {
		RTA.getTorrentLink = url;
		RTA.getTorrentLinkReferer = referer;

		fetch(url)
			.then(RTA.handleFetchError)
			.then(response => response.arrayBuffer())
			.then(buffer => {
				const decoder = new TextDecoder('latin1');
				const data = decoder.decode(buffer);
				RTA.dispatchTorrent(server, data, "", label, dir);
			})
			.catch(error => {
				RTA.displayResponse("Failure", "Could not download torrent file:\n" + error.message, true);
			});
	}
};

RTA.displayResponse = async function(title, message, error=false) {
	const data = await chrome.storage.local.get(['showpopups', 'popupduration']);

	if(data.showpopups == "true") {
		var opts = {
			type: "basic",
			iconUrl: (error === true) ? chrome.runtime.getURL("icons/BitTorrent128-red.png") : chrome.runtime.getURL("icons/BitTorrent128.png"),
			title: title,
			message: message
		};

		chrome.notifications.create("", opts, function(id) {
			if(data.popupduration && parseInt(data.popupduration) > 0) {
				setTimeout(function() {
					chrome.notifications.clear(id, function(wasCleared) {
						// Notification cleared callback
					});
				}, parseInt(data.popupduration));
			}
		});
	}
};

RTA.handleFetchError = function(response) {
	if(!response.ok) {
		throw Error(response.statusText);
	}
	return response;
};

RTA.convertToBlob = function(data, myType="text/plain") {
	const ords = Array.prototype.map.call(data, function byteValue(x) {
		return x.charCodeAt(0) & 0xff;
	});
	const ui8a = new Uint8Array(ords);
	const dataBlob = new Blob([ui8a.buffer], {type: myType});

	return dataBlob;
};

RTA.extractTorrentInfo = function(data) {
	var info = {};

	var buf = Buffer.Buffer.from(data, 'ascii');
	var decoded = Bencode.decode(buf, 'utf8');

	info.name = decoded.info.name;
	info.trackers = new Set();

	if(decoded['announce-list']) {
		for(var i = 0; i < decoded['announce-list'].length; i++) {
			for(var j = 0; j < decoded['announce-list'][i].length; j++) {
				info.trackers.add(decoded['announce-list'][i][j]);
			}
		}
	} else if(decoded.announce) {
		info.trackers.add(decoded.announce);
	}

	return info;
};

///////////////////////////////////////////////////////
// TAKE CARE OF EXTENSION SETTINGS. VIRGIN/OLD INSTALL?
///////////////////////////////////////////////////////
async function initializeSettings() {
	const result = await chrome.storage.local.get(['servers']);
	
	if (!result.servers) {
		let servers = [];

		// Check if there's an old configuration in localStorage (migration from v2)
		try {
			const oldData = await chrome.storage.local.get(['host', 'port', 'login', 'password', 'client', 'hostsecure']);
			
			if (oldData.host && oldData.port && oldData.login && oldData.password && oldData.client) {
				servers.push({
					"name": "primary host",
					"host": oldData.host,
					"port": parseInt(oldData.port),
					"hostsecure": oldData.hostsecure === "true",
					"login": oldData.login,
					"password": oldData.password
				});
			} else {
				// Use standard values
				servers.push({
					"name": "PRIMARY SERVER",
					"host": "127.0.0.1",
					"port": 6883,
					"hostsecure": "",
					"login": "login",
					"password": "password",
					"client": "Vuze SwingUI"
				});
				
				await chrome.storage.local.set({
					"linksfoundindicator": "true",
					"showpopups": "true",
					"popupduration": "2000",
					"catchfromcontextmenu": "true",
					"catchfrompage": "true",
					"linkmatches": "([\\]\\[]|\\b|\\.)\\.torrent\\b([^\\-]|$)~torrents\\.php\\?action=download"
				});
			}
		} catch (error) {
			console.error('Error migrating old settings:', error);
			// Use default settings
			servers.push({
				"name": "PRIMARY SERVER",
				"host": "127.0.0.1",
				"port": 6883,
				"hostsecure": "",
				"login": "login",
				"password": "password",
				"client": "Vuze SwingUI"
			});
		}
		
		await chrome.storage.local.set({ "servers": JSON.stringify(servers) });
	}
}

//////////////////////////////////////////////////////
// REGISTER CONTEXT (RIGHT-CLICK) MENU ITEMS FOR LINKS
//////////////////////////////////////////////////////
async function constructContextMenu() {
	await chrome.contextMenus.removeAll();
	
	const data = await chrome.storage.local.get(['servers', 'catchfromcontextmenu']);
	
	if (data.catchfromcontextmenu !== "true") return;
	
	const servers = JSON.parse(data.servers || '[]');
	
	for (let i = 0; i < servers.length; i++) {
		const server = servers[i];
		chrome.contextMenus.create({
			id: `server_${i}`,
			title: `Add to ${server.name}`,
			contexts: ["link"]
		});
	}
}

////////////////////
// GRAB FROM NEW TAB
////////////////////
chrome.tabs.onCreated.addListener(async function(tab) {
	const data = await chrome.storage.local.get(['servers', 'catchfromnewtab', 'linkmatches']);
	
	if (data.catchfromnewtab !== "true" || !tab.url) return;
	
	const servers = JSON.parse(data.servers || '[]');
	const server = servers[0]; // primary server
	
	if (!server) return;
	
	const res = (data.linkmatches || '').split('~');
	for (const pattern of res) {
		if (tab.url.match(new RegExp(pattern, "g"))) {
			RTA.getTorrent(server, tab.url);
			break;
		}
	}
});

/////////////////////////////////////////////////////
// HANDLE MESSAGES FROM CONTENT SCRIPTS
/////////////////////////////////////////////////////
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// Handle async operations properly
	(async function() {
		try {
			const data = await chrome.storage.local.get();
			const servers = JSON.parse(data.servers || '[]');
			const server = request.server || servers[0]; // primary server

			switch (request.action) {
				case "addTorrent":
					if (server) {
						RTA.getTorrent(server, request.url, request.label, request.dir, request.referer);
					}
					sendResponse({success: true});
					break;

				case "getStorageData":
					console.log('getStorageData returning:', data);
					sendResponse(data);
					break;

				case "setStorageData":
					await chrome.storage.local.set(request.data);
					console.log('setStorageData completed for:', request.data);
					sendResponse({success: true});
					break;

				case "pageActionToggle":
					chrome.action.setIcon({
						path: {"16":"icons/BitTorrent16.png", "48":"icons/BitTorrent48.png", "128":"icons/BitTorrent128.png"},
						tabId: sender.tab.id
					});
					sendResponse({success: true});
					break;

				case "constructContextMenu":
					await constructContextMenu();
					sendResponse({success: true});
					break;

				case "registerRefererListeners":
					registerReferrerHeaderListeners();
					sendResponse({success: true});
					break;

				case "registerAuthenticationListeners":
					registerAuthenticationListeners();
					sendResponse({success: true});
					break;

				case "showLabelDirChooser":
					// Forward this to the content script
					chrome.tabs.sendMessage(sender.tab.id, request);
					sendResponse({success: true});
					break;

				default:
					sendResponse({error: "Unknown action: " + request.action});
					break;
			}
		} catch (error) {
			console.error('Error in message handler:', error);
			sendResponse({error: error.message});
		}
	})();

	return true; // Keep message channel open for async response
});

// Helper function to show label/dir chooser with fallback
async function showLabelDirChooserWithFallback(tab, url, settings, server) {
	try {
		// First, try to send the message to the content script
		chrome.tabs.sendMessage(tab.id, {
			"action": "showLabelDirChooser",
			"url": url,
			"settings": settings,
			"server": server
		}, function(response) {
			if (chrome.runtime.lastError) {
				console.error('Content script not available, trying to inject:', chrome.runtime.lastError.message);

				// Try to inject the content script manually
				chrome.scripting.executeScript({
					target: { tabId: tab.id },
					files: ['miscapis/modal.js', 'miscapis/content_rta.js']
				}, function() {
					if (chrome.runtime.lastError) {
						console.error('Failed to inject content script:', chrome.runtime.lastError.message);
						// Fallback: just add the torrent without popup
						console.log('Fallback: adding torrent directly');
						RTA.getTorrent(server, url);
					} else {
						console.log('Content script injected, retrying message');
						// Retry sending the message
						setTimeout(() => {
							chrome.tabs.sendMessage(tab.id, {
								"action": "showLabelDirChooser",
								"url": url,
								"settings": settings,
								"server": server
							}, function(retryResponse) {
								if (chrome.runtime.lastError) {
									console.error('Retry failed, adding torrent directly:', chrome.runtime.lastError.message);
									RTA.getTorrent(server, url);
								} else {
									console.log('Retry successful:', retryResponse);
								}
							});
						}, 100);
					}
				});
			} else {
				console.log('Message sent to content script successfully:', response);
			}
		});
	} catch (error) {
		console.error('Error in showLabelDirChooserWithFallback:', error);
		// Final fallback: just add the torrent
		RTA.getTorrent(server, url);
	}
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async function(info, tab) {
	console.log('Context menu clicked:', info.menuItemId, info.linkUrl);
	console.log('Tab info:', {id: tab.id, url: tab.url, status: tab.status});

	const data = await chrome.storage.local.get(['servers']);
	const servers = JSON.parse(data.servers || '[]');
	const serverIndex = parseInt(info.menuItemId.replace('server_', ''));
	const server = servers[serverIndex];

	console.log('Server selected:', server ? server.name : 'none', 'Client:', server ? server.client : 'none');

	if (server && info.linkUrl) {
		// Debug: Log server settings
		console.log('Server settings check:', {
			client: server.client,
			rutorrentdirlabelask: server.rutorrentdirlabelask,
			qbittorrentdirlabelask: server.qbittorrentdirlabelask,
			qbittorrentv2dirlabelask: server.qbittorrentv2dirlabelask
		});

		// Check if we should show the label/directory chooser popup
		if (server.rutorrentdirlabelask === true && server.client === "ruTorrent WebUI") {
			console.log('Showing label/dir chooser for ruTorrent');
			showLabelDirChooserWithFallback(tab, info.linkUrl, data, server);
		}
		else if (server.qbittorrentdirlabelask === true && server.client === "qBittorrent WebUI") {
			console.log('Showing label/dir chooser for qBittorrent');
			showLabelDirChooserWithFallback(tab, info.linkUrl, data, server);
		}
		else if (server.qbittorrentv2dirlabelask === true && server.client === "qBittorrent v4.1+ WebUI") {
			console.log('Showing label/dir chooser for qBittorrent v2');
			showLabelDirChooserWithFallback(tab, info.linkUrl, data, server);
		}
		else {
			console.log('Calling RTA.getTorrent directly (no label/dir chooser)');
			RTA.getTorrent(server, info.linkUrl);
		}
	} else {
		console.warn('Missing server or linkUrl:', { server: !!server, linkUrl: !!info.linkUrl });
	}
});

///////////////////////////////////////////////////////////////////
// CATCH WEBUI REQUESTS WHOSE CSRF PROTECTION WE NEED TO CIRCUMVENT
///////////////////////////////////////////////////////////////////
let listeners = [];

async function registerReferrerHeaderListeners() {
	// Unregister old listeners
	while (listeners.length > 0) {
		chrome.webRequest.onBeforeSendHeaders.removeListener(listeners.pop());
	}

	// Register new listeners
	const data = await chrome.storage.local.get(['servers']);
	const servers = JSON.parse(data.servers || '[]');

	for (const server of servers) {
		const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";

		const listener = function(details) {
			// In Manifest V3, we can only modify headers, not block requests
			// This is a best-effort approach for CSRF protection
			try {
				let foundReferer = false;
				let foundOrigin = false;

				for (let j = 0; j < details.requestHeaders.length; ++j) {
					if (details.requestHeaders[j].name === 'Referer') {
						foundReferer = true;
						details.requestHeaders[j].value = url;
					}

					if (details.requestHeaders[j].name === 'Origin') {
						foundOrigin = true;
						details.requestHeaders[j].value = url;
					}

					if (foundReferer && foundOrigin) {
						break;
					}
				}

				if (!foundReferer) {
					details.requestHeaders.push({'name': 'Referer', 'value': url});
				}

				if (!foundOrigin) {
					details.requestHeaders.push({'name': 'Origin', 'value': url});
				}

				return {requestHeaders: details.requestHeaders};
			} catch (error) {
				console.warn('Header modification failed:', error);
				return {};
			}
		};

		if (server.host && server.port) {
			try {
				chrome.webRequest.onBeforeSendHeaders.addListener(
					listener,
					{urls: [url + "*"]},
					["requestHeaders", "extraHeaders"]
				);
				listeners.push(listener);
			} catch (error) {
				console.warn('Could not register header listener for', url, ':', error.message);
			}
		}
	}
}

/////////////////////////////////////////////////////
// CATCH TORRENT LINKS AND ALTER THEIR REFERER/ORIGIN
/////////////////////////////////////////////////////
RTA.getTorrentLink = "";
RTA.getTorrentLinkReferer = "";

const headersListener = function(details) {
	let output = {};

	if (details.url === RTA.getTorrentLink) {
		try {
			let foundReferer = false;
			let foundOrigin = false;

			for (let j = 0; j < details.requestHeaders.length; ++j) {
				if (details.requestHeaders[j].name === 'Referer') {
					foundReferer = true;
					details.requestHeaders[j].value = RTA.getTorrentLinkReferer || details.url;
				}

				if (details.requestHeaders[j].name === 'Origin') {
					foundOrigin = true;
					details.requestHeaders[j].value = RTA.getTorrentLinkReferer || details.url;
				}

				if (foundReferer && foundOrigin) {
					break;
				}
			}

			if (!foundReferer) {
				details.requestHeaders.push({'name': 'Referer', 'value': RTA.getTorrentLinkReferer || details.url});
			}

			if (!foundOrigin) {
				details.requestHeaders.push({'name': 'Origin', 'value': RTA.getTorrentLinkReferer || details.url});
			}

			output = {requestHeaders: details.requestHeaders};
		} catch (error) {
			console.warn('Torrent link header modification failed:', error);
		}

		RTA.getTorrentLink = "";
		RTA.getTorrentLinkReferer = "";
	}

	return output;
};

try {
	chrome.webRequest.onBeforeSendHeaders.addListener(
		headersListener,
		{urls: ["<all_urls>"]},
		["requestHeaders", "extraHeaders"]
	);
} catch (error) {
	console.warn('Could not register global header listener:', error.message);
}

////////////////////////////////////////////////////
// SUPPLY DIGEST AUTHENTICATION TO WEB UIS WE MANAGE
////////////////////////////////////////////////////
let onAuthListeners = [];
let triedRequestIds = new Set();

async function registerAuthenticationListeners() {
	// Unregister old listeners
	while (onAuthListeners.length > 0) {
		chrome.webRequest.onAuthRequired.removeListener(onAuthListeners.pop());
	}
	
	// Register new listeners
	const data = await chrome.storage.local.get(['servers']);
	const servers = JSON.parse(data.servers || '[]');
	
	for (const server of servers) {
		const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
		
		const listener = function(details) {
			let authStuff;
			
			if (triedRequestIds.has(details.requestId)) {
				authStuff = {}; // cause the browser to resume default behavior
				triedRequestIds.delete(details.requestId);
			} else if (details.tabId !== -1) {
				authStuff = {};
			} else {
				authStuff = { authCredentials: { username: server.login, password: server.password } };
				triedRequestIds.add(details.requestId);
			}
			
			return authStuff;
		};
		
		if (server.host && server.port) {
			// Note: Authentication handling is limited in Manifest V3
			// Users may need to handle authentication manually in some cases
			try {
				chrome.webRequest.onAuthRequired.addListener(
					listener,
					{ urls: [url + "*"] }
				);
			} catch (error) {
				console.warn('Authentication listener not available:', error.message);
			}
		}
		
		onAuthListeners.push(listener);
	}
}

/////////////////////////////////////////////////////////
// Register action for opening a tab to the webui
/////////////////////////////////////////////////////////
chrome.action.onClicked.addListener(async function(tab) {
	const data = await chrome.storage.local.get(['servers']);
	const servers = JSON.parse(data.servers || '[]');
	
	if (servers.length > 0) {
		const server = servers[0];
		const relativePath = server.ruTorrentrelativepath || server.utorrentrelativepath || server.delugerelativepath || server.rtorrentxmlrpcrelativepath || "/";
		const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + relativePath;
		chrome.tabs.create({ url: url });
	}
});

// Initialize everything when the service worker starts
chrome.runtime.onStartup.addListener(async function() {
	await migrateLocalStorageToChrome();
	await initializeSettings();
	await constructContextMenu();
	registerReferrerHeaderListeners();
	registerAuthenticationListeners();
});

chrome.runtime.onInstalled.addListener(async function() {
	await migrateLocalStorageToChrome();
	await initializeSettings();
	await constructContextMenu();
	registerReferrerHeaderListeners();
	registerAuthenticationListeners();
});

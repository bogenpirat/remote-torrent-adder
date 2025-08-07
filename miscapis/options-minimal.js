// Minimal options.js to test what's causing the loading failure

console.log('options-minimal.js loaded');

// Storage helper functions for Manifest V3
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

// Test if jQuery is available
if (typeof $ !== 'undefined') {
	console.log('jQuery is available');
	
	$(document).ready(function(){
		console.log('Document ready (non-async version)');
		
		// Set up notification test button
		const testButton = document.querySelector("#notificationtest");
		console.log('Notification test button found:', testButton);

		if (testButton) {
			testButton.onclick = function() {
				console.log('Notification test button clicked');
				// Simple notification using Chrome API
				chrome.notifications.create({
					type: 'basic',
					iconUrl: chrome.runtime.getURL('icons/BitTorrent128.png'),
					title: 'Test Notification',
					message: 'This is a test notification from Remote Torrent Adder!'
				});
			};
		}

		// Test Add Server button functionality
		console.log('Setting up Add Server button...');

		// Check if jQuery UI is available
		console.log('jQuery UI dialog available:', typeof $.fn.dialog);

		if (typeof $.fn.dialog === 'function') {
			try {
				// Initialize a simple dialog
				const dialog = $("#dialog").dialog({
					autoOpen: false,
					modal: true,
					width: 500,
					buttons: {
						"Add": function() {
							console.log('Add button clicked in dialog');
							const serverName = $("#tab_title").val();
							const serverType = $("#tab_client").val();

							if (serverName && serverType) {
								alert('Server "' + serverName + '" (' + serverType + ') would be added here!');
								// TODO: Actually save the server configuration
								$(this).dialog("close");
							} else {
								alert('Please enter both server name and type.');
							}
						},
						"Cancel": function() {
							console.log('Cancel button clicked in dialog');
							$(this).dialog("close");
						}
					}
				});

				console.log('Dialog initialized successfully');

				// Attach click handler to Add Server button
				$("#add_tab").button().click(function() {
					console.log('Add Server button clicked');
					// Clear the form
					$("#tab_title").val('');
					$("#tab_client").val('ruTorrent WebUI');
					dialog.dialog("open");
				});

				console.log('Add Server button handler attached');

			} catch (error) {
				console.error('Error setting up dialog:', error);
			}
		} else {
			console.error('jQuery UI dialog not available');
		}
	});
} else {
	console.error('jQuery is not available');
}

console.log('options-minimal.js setup complete');

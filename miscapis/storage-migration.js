// Storage migration helper for Manifest V3
// This helps migrate localStorage data to chrome.storage.local

// Migration function to be called during extension startup
async function migrateLocalStorageToChrome() {
	try {
		// Check if migration has already been done
		const migrationCheck = await chrome.storage.local.get(['migrationCompleted']);
		if (migrationCheck.migrationCompleted) {
			console.log('Storage migration already completed');
			return;
		}

		console.log('Starting localStorage to chrome.storage migration...');

		// Get all current chrome.storage data
		const existingData = await chrome.storage.local.get();

		// List of keys that should be migrated from localStorage
		const keysToMigrate = [
			'servers',
			'linksfoundindicator',
			'showpopups',
			'popupduration',
			'catchfromcontextmenu',
			'catchfrompage',
			'catchfromnewtab',
			'linkmatches',
			'registerDelay',
			// Legacy keys for backward compatibility
			'host',
			'port',
			'login',
			'password',
			'client',
			'hostsecure'
		];

		const dataToMigrate = {};
		let foundLegacyData = false;

		// Try to access localStorage (this will only work in certain contexts)
		try {
			for (const key of keysToMigrate) {
				const value = localStorage.getItem(key);
				if (value !== null && !existingData.hasOwnProperty(key)) {
					dataToMigrate[key] = value;
					foundLegacyData = true;
					console.log(`Migrating ${key}:`, value);
				}
			}
		} catch (error) {
			console.log('localStorage not accessible in this context:', error.message);
		}

		// If we found legacy data, save it to chrome.storage
		if (foundLegacyData) {
			await chrome.storage.local.set(dataToMigrate);
			console.log('Migration completed successfully');
		} else {
			console.log('No legacy data found to migrate');
		}

		// Mark migration as completed
		await chrome.storage.local.set({ migrationCompleted: true });

	} catch (error) {
		console.error('Error during storage migration:', error);
	}
}

// Helper function to get data with fallback to localStorage
async function getStorageWithFallback(keys) {
	try {
		const data = await chrome.storage.local.get(keys);
		
		// If chrome.storage doesn't have the data, try localStorage as fallback
		const result = {};
		for (const key of (Array.isArray(keys) ? keys : [keys])) {
			if (data[key] !== undefined) {
				result[key] = data[key];
			} else {
				try {
					const localValue = localStorage.getItem(key);
					if (localValue !== null) {
						result[key] = localValue;
						// Also save to chrome.storage for future use
						await chrome.storage.local.set({ [key]: localValue });
					}
				} catch (e) {
					// localStorage not available
				}
			}
		}
		
		return result;
	} catch (error) {
		console.error('Error getting storage data:', error);
		return {};
	}
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		migrateLocalStorageToChrome,
		getStorageWithFallback
	};
}

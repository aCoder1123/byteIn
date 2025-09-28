// Enhanced NFC utility functions
const assignNFC = async (table, apiKey, ssid, networkPwd) => {
	// Check if NDEFReader is supported
	if (!('NDEFReader' in window)) {
		return {
			success: false,
			error: new Error('NFC is not supported on this device. Please use an Android device with NFC capability.'),
			code: 'NFC_NOT_SUPPORTED'
		};
	}

	try {
		// Create NFC configuration object
		const nfcData = {
			table: table,
			apiKey: apiKey,
			ssid: ssid,
			networkPwd: networkPwd,
			timestamp: new Date().toISOString(),
			version: '1.0'
		};

		// Convert to JSON string
		const dataString = JSON.stringify(nfcData);
		
		// Create NDEF payload
		const payload = {
			records: [
				{ 
					recordType: "text", 
					data: dataString,
					mediaType: "application/json"
				}
			]
		};

		const ndef = new NDEFReader();
		
		// Write to NFC tag
		await ndef.write(payload);
		
		return {
			success: true,
			error: null,
			code: 'SUCCESS'
		};
	} catch (error) {
		console.error('NFC write error:', error);
		return {
			success: false,
			error: error,
			code: 'NFC_WRITE_ERROR'
		};
	}
};

// Check NFC support
const isNFCSupported = () => {
	return 'NDEFReader' in window;
};

// Get user-friendly error message
const getNFCErrorMessage = (error) => {
	if (!isNFCSupported()) {
		return 'NFC is not supported on this device. Please use an Android device with NFC capability.';
	}
	
	if (error.name === 'NotAllowedError') {
		return 'NFC permission denied. Please allow NFC access in your browser settings.';
	}
	
	if (error.name === 'NotSupportedError') {
		return 'NFC is not supported on this device.';
	}
	
	if (error.name === 'NotReadableError') {
		return 'NFC tag is not readable. Please try a different tag.';
	}
	
	if (error.name === 'NotSupportedError') {
		return 'This NFC tag is not supported. Please use a different tag.';
	}
	
	return error.message || 'An unknown error occurred while writing to the NFC tag.';
};

export { assignNFC, isNFCSupported, getNFCErrorMessage };

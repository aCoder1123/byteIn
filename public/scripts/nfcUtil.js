const assignNFC = async (table, apiKey, ssid, networkPwd, apiURL) => {
	let data = `{
        table: ${table},
        apiKey: ${apiKey},
        ssid: ${ssid},
        networkPwd: ${networkPwd},
		apiURL: ${apiURL}
    }`;
	let payload = {
		records: [{ recordType: "text", data: data}],
	};
	const ndef = new NDEFReader();
	let status = {};
	await ndef
		.write(payload)
		.then(() => {
			status.success = true;
			status.error = null;
		})
		.catch((err) => {
			status.success = false;
			status.error = err;
		});
	return status;
};

export { assignNFC };

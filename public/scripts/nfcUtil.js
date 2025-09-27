const assignNFC = async (table, apiKey, ssid, networkPwd) => {
	let data = `{
        table: ${table},
        apiKey: ${apiKey},
        ssid: ${ssid},
        networkPwd: ${networkPwd}
    }`;
	let payload = {
		records: [{ recordType: "text", data: data.toString() }],
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

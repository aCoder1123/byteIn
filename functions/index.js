/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

exports.setStatus = onRequest(async (request, response) => {
	let auth = request.body.auth;
	let apiKey = await db.collection("settings").doc("apiKey").get();
	if (!apiKey.data || !(apiKey.data().key == request.body.auth)) {
		response.status(401).send();
		return;
	} else if (!request.body.uid) {
		response.status(400).send();
		return;
	}
	let tables = db.collection("tableData");
	let userCheckedIn = await tables.where("uid", "==", request.body.uid).get();
	let set = false;
	if (!userCheckedIn.empty && request.body.uid != "-") {
		userCheckedIn.forEach((doc) => {
			let data = doc.data();
			if (doc.id != request.body.table) {
				data.checkedOut = false;
				data.uid = "-";
			} else {
				set = true;
				if (request.body.uid == "-") {
					data.checkedOut = false;
					data.uid = "-";
				} else {
					data.lastCheckout = Timestamp.now();
				}
			}
			db.collection("tableData").doc(doc.id).set(data);
		});
	}
	if (!set) {
		let doc = await db.collection("tableData").doc(request.body.table).get();
		let data = doc.data();
		if (request.body.uid != "-") {
			data.lastCheckout = Timestamp.now();
			data.checkedOut = true;
			data.uid = request.body.uid;
		} else {
			data.checkedOut = false;
			data.uid = "-";
		}
		db.collection("tableData").doc(doc.id).set(data);
	}

	let config = await db.collection("settings").doc("config").get();
	let configData = config.data();
	let waitTimeMinutes = configData.waitTime;
	response.status(200).send({ checkedIn: request.body.uid != "-", delay: waitTimeMinutes });
});

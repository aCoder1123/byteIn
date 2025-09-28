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

admin.initializeApp({
	apiKey: "AIzaSyC3qFSN9C5_PPBRKD8SR_KEzgWqdyfsvjw",
	authDomain: "bytein-gt.firebaseapp.com",
	projectId: "bytein-gt",
	storageBucket: "bytein-gt.firebasestorage.app",
	messagingSenderId: "536022923075",
	appId: "1:536022923075:web:70e0936817cfb3869361f6",
});
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

exports.setStatus = onRequest(async (request, response) => {
	let apiKey = await db.collection("settings").doc("config").get();
	if (!apiKey.data || 
		!((apiKey.data()).apiKey == request.body.auth)) {
		response.status(401).send();
		return;
	} else if (!request.body.uid) {
		response.status(400).send();
		return;
	}

	let config = await db.collection("settings").doc("config").get();
	let configData = config.data();
	let waitTimeMinutes = configData.waitTime;

	let tableID = request.body.table;
	let floor = tableID[0];
	console.log(tableID)
	let uid = request.body.uid;
	let thisFloor = await db.collection("maps").doc(floor).get();
	if (!thisFloor.exists) {
		response.status(400).send()
		return 
	}
	thisFloor = thisFloor.data();
	tableID = Number(tableID[1] + tableID[2]);
	for (let table of thisFloor.components) {
		if (table.assignedTo == uid && uid != "-") {
			if (table.id == tableID) {
				response.status(200).send({ checkedIn: true, delay: waitTimeMinutes });
				return;
			} else {
				response.status(401).send({ checkedIn: false, delay: 0 });
				return;
			}
		}
	}
	for (let table of thisFloor.components) {
		if (table.id == tableID) {
			if (uid == "-") {
				table.assignedTo = null;
				table.occupied = false;
				db.collection("maps").doc(floor).set(thisFloor);
				response.status(200).send({ checkedIn: false, delay: 0 });
				return;
			} else if (table.assignedTo != null) {
				response.status(401).send({ checkedIn: false, delay: -1 });
				return;
			} else {
				table.assignedTo = uid;
				table.occupied = true;
				db.collection("maps").doc(floor).set(thisFloor);
				response.status(200).send({ checkedIn: true, delay: waitTimeMinutes });
				return;
			}
		}
	}
	response.status(504).send()
});

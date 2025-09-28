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
	let apiKey = await db.collection("settings").doc("config").get();
	if (!apiKey.data || !(apiKey.data().apiKey == request.body.auth)) {
		response.status(401).send();
		return;
	} else if (!request.body.uid) {
		response.status(400).send();
		return;
	}

	let config = await db.collection("settings").doc("config").get();
	let configData = config.data();
	let waitTimeMinutes = configData.waitTime;

	let tableID = request.body.table
	let uid = request.body.uid
	let thisFloor = await db.collection("maps").doc(tableID[0]).get()
	thisFloor = thisFloor.data()
	for (let table of thisFloor.components) {
		if (table.assignedTo == uid && uid != '-') {
			if (table.id == tableID) {
				response.status(200).send({ checkedIn: true, delay: waitTimeMinutes });
				return
			} else {
				response.status(401).send({ checkedIn: false, delay: 0 });
				return
			}
		}
	} 
	for (let table of thisFloor.components) {
		if (table.id == tableID) {
			if (uid == '-') {
				table.assignedTo = null
				table.occupied = false
				db.collection("maps").doc(tableID[0]).set(thisFloor)
				response.status(200).send({ checkedIn: false, delay: 0 });
				return
			}
			else if (table.assignedTo != '-') {
				response.status(401).send({ checkedIn: false, delay: -1 });
				return;
			} else {
				table.assignedTo = uid;
				table.occupied = true;
				db.collection("maps").doc(tableID[0]).set(thisFloor);
				response.status(200).send({ checkedIn: true, delay: waitTimeMinutes });
				return;
			}
		}
	}
});

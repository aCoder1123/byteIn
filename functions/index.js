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
	try {
		// Log request for debugging
		logger.info('setStatus called with body:', request.body);
		
		let auth = request.body.auth;
		let apiKey = await db.collection("settings").doc("config").get();
		
		if (!apiKey.exists) {
			logger.error('API key document does not exist');
			response.status(401).send('API key not found');
			return;
		}
		
		if (!(apiKey.data().apiKey == request.body.auth)) {
			logger.error('API key mismatch');
			response.status(401).send('Invalid API key');
			return;
		}
		
		if (!request.body.uid) {
			logger.error('Missing UID in request');
			response.status(400).send('Missing UID');
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
			if (!doc.exists) {
				response.status(400).send("No table with the supplied id exists");
				return;
			}
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
	} catch (error) {
		logger.error('Error in setStatus function:', error);
		response.status(500).send('Internal server error');
	}
});

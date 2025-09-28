import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let email = document.getElementById("email-address");
let password = document.getElementById("password");

let btn = document.getElementById("submitBtn");

btn.onclick = () => {
	signInWithEmailAndPassword(auth, email.value, password.value)
		.then((userCredential) => {
			window.location.href = "./index.html";
		})
		.catch((error) => {
			// const errorCode = error.code;
			// const errorMessage = error.message;
			alert("There was an error signing in.");
		});
};

onAuthStateChanged(auth, (user) => {
	console.log("checking");
	if (user) {
		window.location.href = "./index.html";
	} else {
	}
});

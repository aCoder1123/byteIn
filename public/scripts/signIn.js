import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let email = document.getElementById("email-address")
let password = document.getElementById("password")

let btn = document.getElementById("submitBtn");

btn.onclick = () => {
    signInWithEmailAndPassword(auth, email.value, password.value)
			.then((userCredential) => {
				// window.location.replace("./index.html")
			})
			.catch((error) => {
				const errorCode = error.code;
				const errorMessage = error.message;
                console.log(errorMessage)
                alert("There was an error signing in.")
			});
}

onAuthStateChanged(auth, (user) => {
    console.log("checking")
	if (user) {
        console.log("signed in")
		window.location.href = ("./index.html")
	} else {
        console.log("signedOut")
    }
});


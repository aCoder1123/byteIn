import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // Find the necessary elements in the HTML document
    const form = document.querySelector('.auth-form');
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = submitBtn.querySelector('.button-text');
    const buttonLoader = submitBtn.querySelector('.button-loader');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');

    // Ensure the form exists before adding an event listener
    if (form) {
        // Listen for the form's submit event
        form.addEventListener('submit', (e) => {
            // Prevent the default browser action of reloading the page on form submission
            e.preventDefault();

            // Validate form inputs
            if (!validateForm()) {
                return;
            }

            // --- Show Loading State ---
            setLoadingState(true);

            // --- Firebase Authentication ---
            signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value)
                .then((userCredential) => {
                    // Sign-in successful
                    console.log('Sign-in successful:', userCredential.user);
                    showToast('Signed in successfully!', 'success');
                    
                    // Redirect to main app after a short delay
                    setTimeout(() => {
                        window.location.replace("../index.html");
                    }, 1000);
                })
                .catch((error) => {
                    // Sign-in failed
                    console.error('Sign-in error:', error);
                    setLoadingState(false);
                    
                    // Show appropriate error message
                    const errorMessage = getErrorMessage(error.code);
                    showToast(errorMessage, 'error');
                });
        });
    }

    // Auto-redirect if user is already signed in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "../index.html";
        }
    });
});

// Function to set loading state
function setLoadingState(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = submitBtn.querySelector('.button-text');
    const buttonLoader = submitBtn.querySelector('.button-loader');

    submitBtn.disabled = isLoading;
    
    if (isLoading) {
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'block';
        buttonText.textContent = 'Signing In...';
    } else {
        buttonText.style.display = 'block';
        buttonLoader.style.display = 'none';
        buttonText.textContent = 'Sign In';
    }
}

// Function to validate form inputs
function validateForm() {
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');
    
    // Clear previous errors
    clearErrors();
    
    let isValid = true;
    
    // Email validation
    if (!emailInput.value.trim()) {
        showFieldError(emailInput, 'Email is required');
        isValid = false;
    } else if (!isValidEmail(emailInput.value.trim())) {
        showFieldError(emailInput, 'Please enter a valid email address');
        isValid = false;
    }
    
    // Password validation
    if (!passwordInput.value.trim()) {
        showFieldError(passwordInput, 'Password is required');
        isValid = false;
    } else if (passwordInput.value.length < 6) {
        showFieldError(passwordInput, 'Password must be at least 6 characters');
        isValid = false;
    }
    
    return isValid;
}

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Function to show field error
function showFieldError(field, message) {
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

// Function to clear all errors
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(msg => msg.remove());
    document.querySelectorAll('.input-field').forEach(field => field.classList.remove('error'));
}

// Function to get user-friendly error message
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        default:
            return 'There was an error signing in. Please try again.';
    }
}

// Function to show toast notification
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#EF4444' : '#10B981'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}
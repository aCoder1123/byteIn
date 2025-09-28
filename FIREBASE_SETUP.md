# Firebase Setup Instructions

This application uses Firebase Firestore to store and retrieve custom table maps. Follow these steps to set up Firebase for your project.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Follow the setup wizard (you can skip Google Analytics for this project)

## Step 2: Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database (choose closest to your users)

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select Web (</>)
4. Register your app with a nickname (e.g., "Table Management App")
5. Copy the configuration object

## Step 4: Update Configuration File

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
export const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## Step 5: Set Firestore Rules (Development)

In Firebase Console > Firestore Database > Rules, set these rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Security Warning:** These rules allow anyone to read/write to your database. For production, implement proper authentication and security rules.

## Step 6: Test the Setup

1. Start your local server: `python3 -m http.server 8000`
2. Open the application in your browser
3. Go to Admin Panel > Map Generator
4. Upload an image and add some table components
5. Click "Save to Firebase" - you should see a success message
6. Check Firebase Console > Firestore Database to see your saved map

## Features Available

### Map Storage
- **Save to Firebase**: Stores your custom map with image and table components
- **Load from Firebase**: Retrieve any previously saved map
- **Map Selection**: Dropdown shows all available maps with floor information

### Data Structure
Maps are stored in Firestore with this structure:
```javascript
{
  name: "Restaurant Floor 1",
  floor: 1,
  image: "data:image/jpeg;base64...", // Base64 encoded image
  components: [
    {
      id: "table-1",
      type: "table",
      name: "Table 1",
      x: 100,
      y: 150,
      occupied: false
    }
    // ... more components
  ],
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Firebase Not Initialized
- Check browser console for configuration errors
- Verify your `firebase-config.js` has correct values
- Ensure Firestore is enabled in your Firebase project

### Permission Denied
- Check your Firestore rules
- Ensure you're using the correct project ID
- Verify your API key is correct

### Maps Not Loading
- Check browser console for network errors
- Verify your Firestore database is accessible
- Ensure the collection name is "maps"

## Production Considerations

1. **Authentication**: Implement user authentication before allowing map modifications
2. **Security Rules**: Create proper Firestore rules based on your authentication system
3. **Image Storage**: Consider using Firebase Storage for large images instead of base64 encoding
4. **Backup**: Set up regular backups of your Firestore database
5. **Monitoring**: Enable Firebase monitoring and set up alerts

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Ensure Firestore is properly enabled
4. Check your internet connection and Firebase service status

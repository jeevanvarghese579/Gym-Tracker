# Gym Tracker

A modern gym tracking web application built with React, Vite, and Firebase.

## Features

- Firebase Authentication (Email/Password)
- Firestore Database for user data
- Monthly activity view on dashboard
- Track daily workouts and exercises
- View previous 7 days of workouts
- Detailed view with pagination
- Customizable body parts/exercises
- Responsive design (mobile and desktop)
- Real-time data sync

## Tech Stack

- React 18
- Vite
- Firebase (Auth + Firestore + Hosting)
- React Router v6
- date-fns

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main layout with sidebar navigation
│   └── ProtectedRoute.jsx  # Route protection for authenticated users
├── contexts/
│   └── AuthContext.jsx     # Authentication state management
├── pages/
│   ├── Login.jsx           # Login page
│   ├── Signup.jsx          # Signup page
│   ├── Dashboard.jsx       # Main dashboard with activity grid
│   ├── Previous7Days.jsx   # Previous 7 days workout view
│   ├── DetailedView.jsx    # All workouts with pagination
│   └── Settings.jsx        # Body parts/exercises management
├── services/
│   └── firestore.js        # Firestore CRUD operations
├── firebase.js             # Firebase configuration
├── App.jsx                 # Main app with routing
├── main.jsx               # App entry point
├── index.css              # Global styles
└── App.css                # App-specific styles
```

## Firestore Data Structure

```
users/{uid}/
├── settings/
│   └── bodyParts           # User's custom body parts/exercises
└── workouts/{date}         # date in DD-MM-YYYY format
    ├── date
    ├── selectedBodyParts[]
    ├── remarks
    ├── createdAt
    └── updatedAt
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider
3. Create Firestore Database:
   - Go to Firestore Database
   - Create database (start in test mode)
   - Deploy security rules from `firestore.rules`
4. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps" > Web app
   - Copy the config values

5. Update `src/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN.firebaseapp.com",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

6. Update `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "YOUR_ACTUAL_PROJECT_ID"
  }
}
```

### 3. Development

```bash
npm run dev
```

The app will run at `http://localhost:5173`

### 4. Build

```bash
npm run build
```

### 5. Deploy to Firebase Hosting

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Hosting (if not already done)
firebase init hosting

# Deploy to Firebase
firebase deploy
```

## Default Body Parts

The app comes with these default body parts:

- Chest
- Shoulder
- Back
- Biceps
- Triceps
- Legs
- Abs
- Cardio

Users can customize this list in Settings.

## Security Rules

Firebase security rules ensure users can only access their own data:

```
users/{userId} - Only authenticated users can read/write their own data
users/{userId}/settings/{document} - Users can only access their own settings
users/{userId}/workouts/{document} - Users can only access their own workouts
```

## License

MIT

## Author

Developed by Jeevan Varghese. Visit [itsjeevanvarghese.web.app](https://itsjeevanvarghese.web.app) for more software.

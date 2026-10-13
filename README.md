# Gym Tracker

A modern gym tracking web application built with React, Vite, and Firebase.

## Features

- Firebase Authentication (Google)
- Firestore data cached in IndexedDB for offline access and queued writes
- Monthly activity view on dashboard
- Track daily workouts and exercises
- View previous 7 days of workouts
- Detailed view with pagination
- Customizable body parts/exercises
- Responsive design (mobile and desktop)
- Optimistic exercise selection with background sync

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
/apps/gymTracker/users/{uid}/
├── settings/
│   └── bodyParts           # User's custom body parts/exercises
└── workouts/{date}         # date in DD-MM-YYYY format
    ├── date
    ├── selectedBodyParts[]
    ├── remarks
    └── updatedAt
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase configuration

This is an existing app in the shared `inter-level-progress-manager` Firebase
project. Preserve the Firebase configuration in `src/firebase.js`, the fixed
app namespace, and Access Manager integration.

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

# Deploy only this app's Hosting site
firebase deploy --only hosting:jeevansgymtracker
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

## Shared Firebase project safety

This is an existing isolated app.

- Canonical appKey: `gymTracker`
- Firebase Web App ID: `1:379503088311:web:f430dcb999873898133332`
- Hosting site: `jeevansgymtracker`
- Firestore scope: `/apps/gymTracker/users/{uid}/...`

The authoritative Firestore and Storage rules live only in
[school-softwares-firebase-shared-config](https://github.com/jeevanvarghese579/school-softwares-firebase-shared-config).
Do not create or deploy rules from this repository, and do not run an unscoped
Firebase deploy. Access must also be approved through Firebase Access Manager
for the fixed Web App ID above.

Preserve these identifiers and existing Firestore paths. Do not create a new
namespace or migrate data unless explicitly requested. Any necessary permission
change must be the smallest possible update in the canonical shared-rules
repository and must pass every existing app rule test before deployment.

## License

MIT

## Author

Developed by Jeevan Varghese. Visit [itsjeevanvarghese.web.app](https://itsjeevanvarghese.web.app) for more software.

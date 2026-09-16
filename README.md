# 🎓 Campus Helpdesk Management System

![C](https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

A comprehensive Data Structures project utilizing an active **Linked-List Queue (FIFO)** and **Hash Table (17-bucket separate chaining)** to manage campus helpdesk requests with **real-time cross-device sync** via Firebase.

This project contains two key components: the **Core C Implementation** (for the academic assignment) and a **3D Web Visualizer** (to interactively demonstrate how the hardware memory and pointers work).

---

## 💻 1. Core Implementation (C Language)

The main backend logic requirement is met in the pure `helpdesk.c` file. This is a terminal-based interface interacting efficiently via a custom `Request` struct node system mapping a dynamic Linked List.

### 📋 Features

- **Add Request (Enqueue):** Allocates memory for a new request dynamically and inserts it at the O(1) Rear of the Queue.
- **Process Request (Dequeue):** Resolves the request at the O(1) Front of the Queue, freeing the memory layout cleanly to prevent leaks.
- **Search Request:** O(N) Traversal mapping to search active jobs by their Request ID.
- **Display Requests:** Sequentially traces memory pointers from `FRONT` to `REAR`.

### 🚀 How to Run the C Program

1. Open your terminal or command prompt.
2. Compile the code using GCC:

   ```bash
   gcc helpdesk.c -o helpdesk
   ```

3. Run the executable:

   ```bash
   ./helpdesk
   ```

   *(Alternatively, run it instantly on a browser compiler like [OnlineGDB](https://www.onlinegdb.com/online_c_compiler))*

---

## 🌐 2. Interactive 3D Web Visualizer

To act as a visual aid to the C logic, the front-end uses Vanilla JS and CSS 3D Transforms to literally map out the Linked List exactly as it operates in memory. Requests sync in **real time** across all devices via **Cloud Firestore**.

**🔗 Live Demo:** [View Website Here](https://datastrucutre-activity.vercel.app/)

### 🔍 Visualization Features

- **Physical Memory Mapping:** Generates pseudo-random Hex hardware addresses (e.g., `0x32A4`) for every node.
- **Pointer Connectivity:** Displays explicit visual UI bridging between a node's `Next` pointer and the target memory address.
- **Array Interaction:** Includes a bottom panel highlighting Hardware Hash Map buckets operating concurrently with the Queue.
- **1D/2D/3D Modes:** Toggle between flat, stacked, and fully rotatable 3D views.

---

## 🔥 3. Firebase Setup (Required for Cross-Device Sync)

The web app uses **Firebase** for real-time data sync and staff authentication. Follow these steps to set up your own Firebase project:

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `campus-helpdesk`) → create

### Step 2: Enable Firestore

1. In Firebase Console, go to **Build → Firestore Database**
2. Click **Create database** → choose **Native mode**
3. Select your preferred region → click **Enable**

### Step 3: Enable Authentication

1. Go to **Build → Authentication → Get started**
2. Click **Email/Password** → toggle **Enable** → click **Save**
3. Go to the **Users** tab → click **Add user**
4. Enter staff email (e.g. `teacher@campus.edu`) and a password
5. This is the login credential for the staff/teacher dashboard

### Step 4: Add Firebase Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under **Your apps**, click the web icon (`</>`) to add a web app
3. Copy the `firebaseConfig` object
4. Paste it into `firebase-config.js`, replacing the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "AIza...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

> **Note:** Firebase web config values are **not secret** by design. Security is enforced via Firestore Security Rules, not by hiding the config.

### Step 5: Paste Security Rules

1. Go to **Firestore Database → Rules** tab
2. Replace the default rules with the contents of `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /requests/{requestId} {
      allow create: if request.resource.data.status == "queued"
        && request.resource.data.keys().hasAll(
             ['requestId','rollNumber','studentName','problemType','status','createdAt'])
        && request.resource.data.rollNumber is string
        && request.resource.data.studentName is string;
      allow get: if true;
      allow list: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}
```

1. Click **Publish**

### Step 6: Deploy

Push to GitHub → Vercel auto-deploys. No server configuration needed — the app is fully static.

---

## 🧪 Cross-Device Testing

1. Open the site on **Device A** (phone or browser)
2. As a **Student**, submit a helpdesk request
3. Open the site on **Device B** (different browser/device)
4. Select **Staff/Teacher**, login with the Firebase email/password
5. ✅ The request from Device A should appear in the **Live Queue** instantly — no refresh
6. Click **Process Next** → the request disappears on both devices in real time

---

## 📂 Project Structure

```text
📦 datastructure-activity
 ┣ 📜 helpdesk.c          # Primary C Console Application
 ┣ 📜 index.html           # Visualizer Frontend UI 
 ┣ 📜 style.css            # 3D Transforms & Theming
 ┣ 📜 app.js               # JS Queue Logic, Pointer Rendering & Firebase Sync
 ┣ 📜 firebase-config.js   # Firebase project configuration (edit this)
 ┣ 📜 firestore.rules      # Firestore security rules (paste into Firebase Console)
 ┗ 📜 README.md            # Project Documentation
```

## 👩‍💻 Author

Developed for Data Structures Academic Submission.

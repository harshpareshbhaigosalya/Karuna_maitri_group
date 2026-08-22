# Firebase Setup Instructions for Karuna Maitri Group

Follow this step-by-step guide to connect the application to your Firebase account and configure the required services.

---

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g., `karuna-maitri-group-surendranagar`).
4. Choose whether to enable Google Analytics (recommended but optional) and click **Create project**.

---

## Step 2: Register a Web Application
1. In your project dashboard, click the **Web icon** (`</>`) to add an app.
2. Enter an App nickname (e.g., `Karuna Maitri CRM`).
3. Click **Register app**.
4. Copy the Firebase configuration object (you will need these values in Step 4).
5. Click **Continue to console**.

---

## Step 3: Enable Authentication
1. In the left-hand menu, go to **Build** -> **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, select **Email/Password**.
4. Enable **Email/Password** (leave Email link disabled) and click **Save**.
5. Go to the **Users** tab and click **Add user**.
6. Create the first admin user credentials (e.g., `admin@karunamaitri.org` and a secure password). Write these credentials down; you will use them to log in to the system.

---

## Step 4: Create a `.env.local` File
1. In the root directory of your project, duplicate the `.env.example` file and rename it to `.env.local`.
2. Fill in the keys with the configuration values you copied in Step 2:
   ```env
   VITE_FIREBASE_API_KEY=YOUR_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID=YOUR_APP_ID
   ```

---

## Step 5: Enable Cloud Firestore
1. In the left-hand menu, go to **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Select a location near your users (e.g., `asia-south1` for India).
4. Start in **Production mode** and click **Create**.

---

## Step 6: Deploy Firestore Security Rules
1. Navigate to the **Rules** tab in the Firestore Database page.
2. Replace the rules with the following configuration and click **Publish**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Only allow authenticated users to read and write data
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

## Step 7: Enable Firebase Storage
1. In the left-hand menu, go to **Build** -> **Storage**.
2. Click **Get started**.
3. Start in **Production mode**, choose a location (e.g., same as your Firestore location), and click **Done**.

---

## Step 8: Deploy Storage Security Rules
1. Navigate to the **Rules** tab in the Storage page.
2. Replace the rules with the following configuration and click **Publish**:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       // Only allow authenticated users to read and write images up to 5MB
       match /{allPaths=**} {
         allow read, write: if request.auth != null
                            && request.resource == null // Allow deletes
                            || (request.resource.size < 5 * 1024 * 1024
                            && request.resource.contentType.matches('image/.*'));
       }
     }
   }
   ```

---

## Step 9: Launch & Initialize Database (Seed Data)
1. Run the application locally:
   ```bash
   npm run dev
   ```
2. Open the browser to the local link (usually `http://localhost:5173`).
3. If Firebase is not configured, the app will show a connection status check error.
4. Log in using the admin account you created in **Step 3**.
5. Once logged in, if this is the first run, the system will offer to run a **Database Seeding** tool.
6. Click **Seed Seva Types & Settings** in the Settings panel or status wizard. This will initialize the default Seva types (Dogs Milk-Pova, Bird nest/pot, Treatment, Panjrapole, Bird Camp, Sunday fruit distribution) and core settings in Firestore.
7. Your setup is now complete!

import admin from 'firebase-admin'

let firebaseApp: admin.app.App | null = null

export const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp
  }

  try {
    // Initialize Firebase Admin SDK
    if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      })
      console.log('✅ Firebase Admin initialized')
    } else {
      console.log('ℹ️  Firebase not configured, using Firebase Auth on frontend only')
    }
  } catch (error) {
    console.log('ℹ️  Firebase Admin initialization skipped, using frontend auth only')
  }

  return firebaseApp
}

export const getFirebaseApp = () => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized')
  }
  return firebaseApp
}

export const verifyIdToken = async (idToken: string) => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized')
  }
  
  return admin.auth().verifyIdToken(idToken)
}

/* ==========================================================================
   firebase.js — River of Life Firebase Integration Module
   Uses Firebase v9 Compat CDN (scripts loaded in index.html before this)
   Exposes: window.FirebaseApp with auth, db, and all helper methods
   ========================================================================== */

(function () {
  'use strict';

  /* ── Firebase Config ─────────────────────────────────────────────────── */
  const firebaseConfig = {
    apiKey: "AIzaSyDv9zEAeJanq_nt7yDsiz1padfnhxM9wa8",
    authDomain: "river-of-life-85cfa.firebaseapp.com",
    projectId: "river-of-life-85cfa",
    storageBucket: "river-of-life-85cfa.firebasestorage.app",
    messagingSenderId: "29916119818",
    appId: "1:29916119818:web:dccb02c0226ff1493c70f3",
    measurementId: "G-2RZGR5HZW2"
  };

  /* ── Initialize Firebase ─────────────────────────────────────────────── */
  let app, auth, db;
  try {
    app  = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db   = firebase.firestore();

    // Enable offline persistence so the app works with poor connectivity
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('[ROL Firebase] Multiple tabs open; persistence available in one tab only.');
      } else if (err.code === 'unimplemented') {
        console.warn('[ROL Firebase] Browser does not support offline persistence.');
      }
    });
  } catch (e) {
    console.error('[ROL Firebase] Initialization failed:', e);
  }

  /* ── Firestore Timestamp helper ──────────────────────────────────────── */
  const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

  /* ── Convert Firestore doc to plain object ───────────────────────────── */
  function docToObj(doc) {
    if (!doc.exists) return null;
    const data = doc.data();
    // Convert Firestore Timestamps to milliseconds for compatibility with existing code
    const out = { id: doc.id };
    for (const [k, v] of Object.entries(data)) {
      out[k] = (v && typeof v.toMillis === 'function') ? v.toMillis() : v;
    }
    return out;
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.FirebaseApp = {
    auth,
    db,

    /* ── Authentication ── */

    /** Open Google Sign-In popup */
    async signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      return auth.signInWithPopup(provider);
    },

    /** Sign in with email + password */
    async signInWithEmail(email, password) {
      return auth.signInWithEmailAndPassword(email, password);
    },

    /**
     * Register a new account: creates Firebase Auth user, sets display name,
     * and immediately sends a verification email to the user's inbox.
     */
    async registerWithEmail(displayName, email, password) {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      // Set display name
      await cred.user.updateProfile({ displayName: displayName.trim() });
      // Send verification email — THIS is what delivers the email to the user's inbox
      await cred.user.sendEmailVerification({
        // After clicking the link, redirect back to the app
        url: window.location.href,
      });
      return cred;
    },

    /**
     * Resend email verification to the currently signed-in user.
     * Call this if the user says they didn't get the email.
     */
    async resendVerificationEmail() {
      const user = auth.currentUser;
      if (!user) throw new Error('No user is currently signed in.');
      await user.sendEmailVerification({ url: window.location.href });
    },

    /**
     * Check if the current user's email is verified
     * (call auth.currentUser.reload() first to get the latest status)
     */
    async isEmailVerified() {
      const user = auth.currentUser;
      if (!user) return false;
      await user.reload(); // force-fetch latest verification status from server
      return auth.currentUser.emailVerified;
    },

    /**
     * Send a password-reset email to the given address.
     * Firebase emails this automatically — no code on your end needed.
     */
    async sendPasswordResetEmail(email) {
      return auth.sendPasswordResetEmail(email, { url: window.location.href });
    },

    /** Sign out the current user */
    async signOut() {
      return auth.signOut();
    },

    /**
     * Subscribe to auth state changes.
     * @param {Function} callback — called with (firebaseUser | null)
     * @returns {Function} unsubscribe function
     */
    onAuthChange(callback) {
      return auth.onAuthStateChanged(callback);
    },

    /* ── Firestore: User Profiles ── */

    /**
     * Create or merge a user profile document at users/{uid}
     * @param {string} uid
     * @param {Object} data
     */
    async saveUserProfile(uid, data) {
      return db.collection('users').doc(uid).set(data, { merge: true });
    },

    /**
     * Fetch a user profile document
     * @param {string} uid
     * @returns {Object|null}
     */
    async getUserProfile(uid) {
      const doc = await db.collection('users').doc(uid).get();
      return docToObj(doc);
    },

    /**
     * Partial update/merge fields on a user document
     * @param {string} uid
     * @param {Object} data — fields to merge (supports dot-notation keys)
     */
    async saveUserData(uid, data) {
      return db.collection('users').doc(uid).set(data, { merge: true });
    },

    /* ── Firestore: Prayer Requests ── */

    /**
     * Add a new prayer request document to the prayers collection
     * @param {Object} prayerObj — { uid, username, text, isPublic }
     * @returns {DocumentReference}
     */
    async savePrayer(prayerObj) {
      return db.collection('prayers').add({
        uid:       prayerObj.uid       || '',
        username:  prayerObj.username  || 'Anonymous',
        text:      prayerObj.text      || '',
        isPublic:  !!prayerObj.isPublic,
        status:    'pending',
        pastorNote: '',
        createdAt: serverTimestamp()
      });
    },

    /**
     * Fetch all prayer requests (one-time)
     * @returns {Array}
     */
    async getPrayers() {
      const snap = await db.collection('prayers')
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(docToObj);
    },

    /**
     * Update a specific prayer document (partial update)
     * @param {string} id — prayer document ID
     * @param {Object} updates — e.g. { status: 'acknowledged', pastorNote: '...' }
     */
    async updatePrayer(id, updates) {
      return db.collection('prayers').doc(id).update(updates);
    },

    /**
     * Subscribe to real-time prayer updates
     * @param {Function} callback — called with Array of prayer objects on each change
     * @returns {Function} unsubscribe function
     */
    listenPrayers(callback) {
      return db.collection('prayers')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snap => {
          const prayers = snap.docs.map(docToObj);
          callback(prayers);
        }, err => {
          console.error('[ROL Firebase] Prayer listener error:', err);
        });
    },
  };

  console.log('[ROL Firebase] ✅ Firebase initialized — project: river-of-life-85cfa');
})();

/**
 * Automated test script for Backend & Database Initialization
 * River of Life Bible App
 */

const http = require('http');
const app = require('../src/index');

const PORT = 7882;
let server;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND INITIALIZATION TESTS ---');
  
  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Test Server] Running on port ${PORT}`);
      resolve();
    });
  });

  try {
    const testEmail = `test_believer_${Date.now()}@riveroflife.org`;
    const testPassword = 'SecurePassword123!';
    let accessToken = '';
    let bookmarkId = '';

    // 1. Test Signup
    console.log('\n1. Testing POST /api/auth/signup...');
    const signupRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testEmail,
      password: testPassword,
      fullName: 'Test Believer',
      preferredLanguage: 'mr'
    });

    console.log(`Status: ${signupRes.status}`);
    if (signupRes.status !== 201 || !signupRes.body.accessToken) {
      throw new Error(`Signup failed: ${JSON.stringify(signupRes.body)}`);
    }
    console.log('Signup SUCCESS! User ID:', signupRes.body.user.id);
    accessToken = signupRes.body.accessToken;

    // 2. Test Login
    console.log('\n2. Testing POST /api/auth/login...');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testEmail,
      password: testPassword
    });

    console.log(`Status: ${loginRes.status}`);
    if (loginRes.status !== 200 || !loginRes.body.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    console.log('Login SUCCESS! Token acquired.');
    accessToken = loginRes.body.accessToken;

    // 3. Test GET /api/auth/me
    console.log('\n3. Testing GET /api/auth/me...');
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    console.log(`Status: ${meRes.status}`);
    if (meRes.status !== 200 || meRes.body.user.email !== testEmail) {
      throw new Error(`Auth Me check failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log('User Profile Verified:', meRes.body.user.email);

    // 4. Test Reading Progress Sync (Upsert)
    console.log('\n4. Testing POST /api/reading-progress (Sync John Chapter 3)...');
    const syncRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/reading-progress',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, {
      book_name: 'John',
      chapter_number: 3,
      progress_percentage: 75.5,
      last_verse: 16
    });

    console.log(`Status: ${syncRes.status}`);
    if (syncRes.status !== 200 || !syncRes.body.progress) {
      throw new Error(`Sync progress failed: ${JSON.stringify(syncRes.body)}`);
    }
    console.log('Progress Synced:', syncRes.body.progress);

    // 5. Test Reading Progress Retrieval (Chapter)
    console.log('\n5. Testing GET /api/reading-progress/john/3...');
    const getChRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/reading-progress/john/3',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    console.log(`Status: ${getChRes.status}`);
    if (getChRes.status !== 200 || getChRes.body.progress.chapter_number !== 3) {
      throw new Error(`Get chapter progress failed: ${JSON.stringify(getChRes.body)}`);
    }
    console.log('Chapter Progress Verified:', getChRes.body.progress);

    // 6. Test Bookmarks Creation
    console.log('\n6. Testing POST /api/bookmarks (John 3:16)...');
    const bookmarkRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/bookmarks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, {
      reference_text: 'योहान ३:१६',
      verse_tag: 'Salvation',
      verse_text: 'कारण देवाने जगावर एवढी प्रीती केली की त्याने आपला एकुलता एक पुत्र दिला...',
      book_name: 'John',
      chapter_number: 3,
      verse_number: 16
    });

    console.log(`Status: ${bookmarkRes.status}`);
    if (bookmarkRes.status !== 201 || !bookmarkRes.body.bookmark) {
      throw new Error(`Create bookmark failed: ${JSON.stringify(bookmarkRes.body)}`);
    }
    bookmarkId = bookmarkRes.body.bookmark.id;
    console.log('Bookmark Created:', bookmarkId, bookmarkRes.body.bookmark.reference_text);

    // 7. Test Bookmarks Retrieval
    console.log('\n7. Testing GET /api/bookmarks?tag=Salvation...');
    const getBmRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/bookmarks?tag=Salvation',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    console.log(`Status: ${getBmRes.status}, Count: ${getBmRes.body.totalBookmarks}`);
    if (getBmRes.status !== 200 || getBmRes.body.totalBookmarks < 1) {
      throw new Error(`Get bookmarks failed: ${JSON.stringify(getBmRes.body)}`);
    }
    console.log('Bookmarks List Verified.');

    // 8. Test Audio Assets Resolution (Cloudflare R2 / S3 URL)
    console.log('\n8. Testing GET /api/audio-assets/GEN/1?lang=mr...');
    const audioRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/audio-assets/GEN/1?lang=mr',
      method: 'GET'
    });

    console.log(`Status: ${audioRes.status}`);
    if (audioRes.status !== 200 || !audioRes.body.asset || !audioRes.body.asset.audioUrl) {
      throw new Error(`Audio asset resolution failed: ${JSON.stringify(audioRes.body)}`);
    }
    console.log('Audio Asset Resolved Successfully:');
    console.log(' - URL:', audioRes.body.asset.audioUrl);
    console.log(' - Provider:', audioRes.body.asset.storageProvider);

    // 9. Test Bookmarks Deletion
    console.log(`\n9. Testing DELETE /api/bookmarks/${bookmarkId}...`);
    const delBmRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/bookmarks/${bookmarkId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    console.log(`Status: ${delBmRes.status}`);
    if (delBmRes.status !== 200) {
      throw new Error(`Delete bookmark failed: ${JSON.stringify(delBmRes.body)}`);
    }
    console.log('Bookmark Deleted successfully.');

    // 10. Test Google Authentication & User Registration
    console.log('\n10. Testing POST /api/auth/google (Registration & Sign-In)...');
    const googleTestEmail = `google_believer_${Date.now()}@gmail.com`;
    const googleRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/google',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: googleTestEmail,
      fullName: 'Google Registered Believer',
      preferredLanguage: 'mr',
      role: 'Member'
    });

    console.log(`Status: ${googleRes.status}`);
    if (googleRes.status !== 200 || !googleRes.body.accessToken || !googleRes.body.user) {
      throw new Error(`Google auth failed: ${JSON.stringify(googleRes.body)}`);
    }
    console.log('Google Auth & Registration Verified! User:', googleRes.body.user.fullName, `(${googleRes.body.user.email})`);

    console.log('\n=============================================');
    console.log(' ALL BACKEND & DATABASE TESTS PASSED 100%! ');
    console.log('=============================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  if (server) server.close();
  process.exit(1);
});

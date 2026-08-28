const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch(e) {
          resolve({ statusCode: res.statusCode, body: data });
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
  console.log('--- Testing River of Life Backend API ---');

  // 1. Health Check
  const health = await makeRequest({
    hostname: '127.0.0.1',
    port: 7880,
    path: '/api/health',
    method: 'GET'
  });
  console.log('1. Health Check:', health.statusCode === 200 ? 'PASS' : 'FAIL', health.body);

  // 2. Request OTP
  const otpRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 7880,
    path: '/api/auth/request-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+919876543210' });
  console.log('2. Request OTP:', otpRes.statusCode === 200 ? 'PASS' : 'FAIL', otpRes.body);

  const devOtp = otpRes.body.devOtp;

  // 3. Verify OTP & Register New User
  const verifyRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 7880,
    path: '/api/auth/verify-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    phone: '+919876543210',
    otp: devOtp,
    fullName: 'Test User',
    username: 'testuser_' + Date.now()
  });
  console.log('3. Verify OTP & Register:', verifyRes.statusCode === 200 ? 'PASS' : 'FAIL', verifyRes.body.user);

  const token = verifyRes.body.token;

  // 4. Get Profile (Authenticated)
  const profileRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 7880,
    path: '/api/auth/profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('4. Authenticated Profile:', profileRes.statusCode === 200 ? 'PASS' : 'FAIL', profileRes.body.user);

  // 5. Get Scheduled Meetings
  const meetingsRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 7880,
    path: '/api/meetings/scheduled',
    method: 'GET'
  });
  console.log('5. Scheduled Meetings:', meetingsRes.statusCode === 200 ? 'PASS' : 'FAIL', 'Count:', meetingsRes.body.meetings ? meetingsRes.body.meetings.length : 0);

  // 6. Get Meeting WebRTC Token
  const tokenRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 7880,
    path: '/api/meetings/token',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    }
  }, { roomId: 'river-evening-fellowship-2026' });
  console.log('6. WebRTC Meeting Token:', tokenRes.statusCode === 200 ? 'PASS' : 'FAIL', 'Token Length:', tokenRes.body.token ? tokenRes.body.token.length : 0);

  console.log('--- All Backend Core API Tests Completed ---');
}

// Allow running directly if invoked
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

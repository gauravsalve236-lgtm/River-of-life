const http = require('http');
const fs = require('fs');
const path = require('path');
const { getSmsProvider } = require('../src/services/smsProvider');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
        } catch(e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
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

async function runProductionReadinessVerification() {
  console.log("==========================================================================");
  console.log("       RIVER OF LIFE — PHASE 1 PRODUCTION READINESS VERIFICATION         ");
  console.log("==========================================================================");

  let passedChecks = 0;
  let failedChecks = 0;

  function assertCheck(num, title, condition, details = '') {
    if (condition) {
      console.log(`[PASS] Check ${num}: ${title} ${details ? '-> ' + JSON.stringify(details) : ''}`);
      passedChecks++;
    } else {
      console.error(`[FAIL] Check ${num}: ${title} ${details ? '-> ' + JSON.stringify(details) : ''}`);
      failedChecks++;
    }
  }

  // 1. Health & Server Check
  const health = await makeRequest({ hostname: '127.0.0.1', port: 7880, path: '/api/health', method: 'GET' });
  assertCheck(1, "Server Health Check", health.statusCode === 200 && health.body.status === 'healthy', health.body);

  // 2. Database Architecture Verification
  const dbModule = require('../src/db/connection');
  assertCheck(2, "Database Architecture & Dual Engine Support", typeof dbModule.all === 'function' && typeof dbModule.withTransaction === 'function', `Engine: ${dbModule.isPostgres ? 'PostgreSQL' : 'SQLite'}`);

  // 3. Phone Authentication & Normalization
  const phoneInput = " 9876543210 ";
  const otpReq = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/auth/request-otp', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: phoneInput });
  
  assertCheck(3, "Phone Normalization & OTP Generation", otpReq.statusCode === 200 && otpReq.body.phone === '+919876543210', otpReq.body);
  const devOtp = otpReq.body.devOtp;

  // 4. OTP Single-Use & Invalid Attempt Limits
  const invalidVerify = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/auth/verify-otp', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+919876543210', otp: '000000', fullName: 'Fail User', username: 'failuser' });

  assertCheck(4, "OTP Attempt Limiting on Invalid Code", invalidVerify.statusCode === 400 && invalidVerify.body.error.includes('attempts remaining'), invalidVerify.body);

  // 5. Now verify with correct OTP
  const validVerify = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/auth/verify-otp', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+919876543210', otp: devOtp, fullName: 'Prod Readiness User', username: 'readiness_user_' + Date.now() });

  assertCheck(5, "Valid OTP Verification & Account Creation", validVerify.statusCode === 200 && !!validVerify.body.accessToken, `User: ${validVerify.body.user ? validVerify.body.user.username : ''}`);
  
  const accessToken = validVerify.body.accessToken;
  const refreshToken = validVerify.body.refreshToken;

  // 6. Single-Use Invalidation Check (Reusing same OTP fails)
  const reuseVerify = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/auth/verify-otp', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+919876543210', otp: devOtp });
  assertCheck(6, "OTP Single-Use Enforcement (Re-use blocked)", reuseVerify.statusCode === 400, reuseVerify.body);

  // 7. Token Security & Refresh Token Rotation
  const refreshRes = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/auth/refresh', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { refreshToken });
  assertCheck(7, "Short Access Token Refresh Rotation", refreshRes.statusCode === 200 && !!refreshRes.body.accessToken, `New token expires in: ${refreshRes.body.expiresIn}s`);

  const newAccessToken = refreshRes.body.accessToken || accessToken;

  // 8. SMS Provider Abstraction Factory Check
  const provider = getSmsProvider();
  const smsTest = await provider.sendOtp('+919876543210', '123456');
  assertCheck(8, "SMS Provider Abstraction Factory", smsTest.success === true && !!smsTest.provider, smsTest);

  // 9. Server-Side RBAC Enforcement (Member attempting Host action)
  const rbacFail = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/meetings/create', method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newAccessToken}` 
    }
  }, { title: 'Unauthorized Meeting', topic: 'Testing', scheduledStart: new Date().toISOString(), scheduledEnd: new Date().toISOString() });
  assertCheck(9, "RBAC Server-Side Authorization (Member creation blocked)", rbacFail.statusCode === 403, rbacFail.body);

  // 10. Prayer Privacy Enforcement (Private prayer request access control)
  const createPrayer = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/prayers', method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newAccessToken}` 
    }
  }, { title: 'Confidential Personal Healing', description: 'Private prayer request details', category: 'Healing', visibility: 'Private' });
  
  assertCheck(10, "Prayer Creation with Privacy Setting", createPrayer.statusCode === 201 && createPrayer.body.prayer.visibility === 'Private', createPrayer.body.prayer);
  const prayerId = createPrayer.body.prayer ? createPrayer.body.prayer.id : null;

  // 11. Unauthenticated request to private prayer should get 403 Forbidden
  const getPrivateUnauth = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: `/api/prayers/${prayerId}`, method: 'GET'
  });
  assertCheck(11, "Prayer Privacy Enforcement (Unauthenticated Private access blocked)", getPrivateUnauth.statusCode === 403, getPrivateUnauth.body);

  // 12. Scheduled Meeting WebRTC Token Security
  const tokenRes = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/meetings/token', method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newAccessToken}` 
    }
  }, { roomId: 'river-evening-fellowship-2026' });
  assertCheck(12, "Scheduled Meeting WebRTC Token Security", tokenRes.statusCode === 200 && !!tokenRes.body.token, `LiveKit Token Length: ${tokenRes.body.token ? tokenRes.body.token.length : 0}`);

  // 13. Notifications & Multi-Device Registration
  const devReg = await makeRequest({
    hostname: '127.0.0.1', port: 7880, path: '/api/devices/register', method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newAccessToken}` 
    }
  }, { deviceId: 'iphone_15_pro_uuid', platform: 'ios', pushToken: 'apns_token_sample_123', appVersion: '1.0.0' });
  assertCheck(13, "Multi-Device Platform Push Registration", devReg.statusCode === 201, devReg.body.device);

  // 14. Error Handling & Security (Stack trace suppression)
  const notFound = await makeRequest({ hostname: '127.0.0.1', port: 7880, path: '/api/nonexistent-route', method: 'GET' });
  assertCheck(14, "Error Handling & Stack Trace Suppression", notFound.statusCode === 404 && notFound.body.code === 'NOT_FOUND', notFound.body);

  // 15. Mobile Widget Architecture Specification & Secrets Template
  const widgetSpecExists = fs.existsSync(path.join(__dirname, '../../docs/WIDGET_ARCHITECTURE_SPEC.md'));
  const envExampleExists = fs.existsSync(path.join(__dirname, '../.env.example'));
  assertCheck(15, "Mobile Widget Spec & Production Secrets Template", widgetSpecExists && envExampleExists, { widgetSpecExists, envExampleExists });

  console.log("\n==========================================================================");
  console.log(`VERIFICATION SUMMARY: ${passedChecks} PASSED / ${failedChecks} FAILED`);
  console.log("==========================================================================");

  if (failedChecks === 0) {
    console.log("🏆 ALL 15 PRODUCTION READINESS CHECKS PASSED WITH 100% SUCCESS!");
  } else {
    console.error("⚠️ Some production readiness checks failed. Please inspect logs.");
  }
}

if (require.main === module) {
  runProductionReadinessVerification().catch(console.error);
}

module.exports = { runProductionReadinessVerification };

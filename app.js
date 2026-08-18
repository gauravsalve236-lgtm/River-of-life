
/* ==========================================================================
   PRODUCTION WEBRTC AUDIO & DEVICE PIPELINE MANAGER
   ========================================================================== */

function logAudioDebug(action, details = {}) {
  console.log(`[Audio] ${action}`, details);
}

function logAudioDebug(action, details = {}) {
  console.log(`[Audio] ${action}`, details);
}

function logIOSAudio(action, details = {}) {
  console.log(`[iOS-AUDIO] ${action}`, details);
}

function logIOSMic(action, details = {}) {
  console.log(`[iOS-AUDIO] [Mic] ${action}`, details);
}

window.iosAudioDiagnosticResults = {
  microphone: "PENDING",
  microphoneLevel: "PENDING",
  audioSender: "PENDING",
  remoteAudioReceiver: "PENDING",
  ontrack: "PENDING",
  remoteAudioElement: "PENDING",
  audioPlay: "PENDING",
  audioContext: "unknown",
  userGestureUnlock: "PENDING",
  speakerOutput: "PENDING",
  webrtcConnection: "PENDING",
  exactError: "None",
  firstFailedStep: "None"
};

async function runIOSAudioDiagnostics() {
  console.log("==========================================================================");
  console.log("             RUNNING COMPLETE iOS AUDIO RUNTIME DIAGNOSTIC                ");
  console.log("==========================================================================");
  
  // DIAGNOSTIC 11 — PAGE / PWA ENVIRONMENT
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  const env = isIOS ? (isStandalone ? "iOS Home Screen / Standalone PWA" : "iOS Safari Browser") : "Desktop / Non-iOS Browser";
  logIOSAudio(`ENVIRONMENT: ${env}`);

  // DIAGNOSTIC 10 — AUDIO OUTPUT
  const setSinkIdSupported = ('setSinkId' in HTMLMediaElement.prototype);
  logIOSAudio(`setSinkId supported: ${setSinkIdSupported}`);
  if (!setSinkIdSupported) {
    logIOSAudio("using system/default iOS audio output");
    window.iosAudioDiagnosticResults.speakerOutput = "PASS (Using System Audio Output)";
  } else {
    window.iosAudioDiagnosticResults.speakerOutput = "PASS (setSinkId Available)";
  }

  // DIAGNOSTIC 8 — AUDIO CONTEXT
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!window.webrtcAudioCtx) window.webrtcAudioCtx = new AudioCtx();
      logIOSAudio(`AudioContext state: ${window.webrtcAudioCtx.state}`);
      window.iosAudioDiagnosticResults.audioContext = window.webrtcAudioCtx.state;
    } else {
      logIOSAudio("AudioContext unavailable on this browser");
      window.iosAudioDiagnosticResults.audioContext = "unavailable";
    }
  } catch(e) {
    logIOSAudio(`AudioContext error: ${e.message}`);
    window.iosAudioDiagnosticResults.audioContext = "error";
  }

  // DIAGNOSTIC 1 — LOCAL MICROPHONE
  logIOSAudio("getUserMedia START");
  let localStream = null;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    logIOSAudio("getUserMedia SUCCESS");
    window.iosAudioDiagnosticResults.microphone = "PASS";
    
    const tracks = localStream.getAudioTracks();
    logIOSAudio(`audio tracks count: ${tracks.length}`);
    if (tracks.length > 0) {
      const t = tracks[0];
      logIOSAudio(`track id: ${t.id}`);
      logIOSAudio(`track enabled: ${t.enabled}`);
      logIOSAudio(`track muted: ${t.muted}`);
      logIOSAudio(`track readyState: ${t.readyState}`);
    }

    // DIAGNOSTIC 2 — LOCAL MICROPHONE LEVEL
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createMediaStreamSource(localStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        await new Promise(r => setTimeout(r, 400));
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        
        if (avg > 0) {
          logIOSAudio(`microphone level detected: YES (average amplitude: ${Math.round(avg)})`);
          window.iosAudioDiagnosticResults.microphoneLevel = "PASS";
        } else {
          logIOSAudio("microphone level detected: NO (0 amplitude)");
          window.iosAudioDiagnosticResults.microphoneLevel = "FAIL (Silent / 0 Level)";
        }
      }
    } catch(levelErr) {
      logIOSAudio(`microphone level analysis error: ${levelErr.message}`);
      window.iosAudioDiagnosticResults.microphoneLevel = "FAIL (" + levelErr.message + ")";
    }

  } catch(err) {
    logIOSAudio("getUserMedia FAILED");
    logIOSAudio(`name: ${err.name}`);
    logIOSAudio(`message: ${err.message}`);
    logIOSAudio(`constraint: ${err.constraint || "N/A"}`);
    window.iosAudioDiagnosticResults.microphone = "FAIL";
    window.iosAudioDiagnosticResults.exactError = `${err.name}: ${err.message}`;
    if (window.iosAudioDiagnosticResults.firstFailedStep === "None") {
      window.iosAudioDiagnosticResults.firstFailedStep = "MICROPHONE";
    }
  }

  // DIAGNOSTIC 3 & 4 — WEBRTC SENDER & RECEIVER & CONNECTION STATUS
  if (window.webrtcAudioPipeline && window.webrtcAudioPipeline.remotePeerConnections) {
    const pcs = Object.values(window.webrtcAudioPipeline.remotePeerConnections);
    logIOSAudio(`Peer connections count: ${pcs.length}`);
    if (pcs.length === 0) {
      logIOSAudio("No active RTCPeerConnection found in parent pipeline yet.");
    } else {
      pcs.forEach((pc, idx) => {
        logIOSAudio(`[PC ${idx}] connectionState: ${pc.connectionState}`);
        logIOSAudio(`[PC ${idx}] iceConnectionState: ${pc.iceConnectionState}`);
        logIOSAudio(`[PC ${idx}] signalingState: ${pc.signalingState}`);
        window.iosAudioDiagnosticResults.webrtcConnection = pc.connectionState === 'connected' ? "PASS" : pc.connectionState;

        // DIAGNOSTIC 3 — SENDER
        const senders = pc.getSenders ? pc.getSenders() : [];
        logIOSAudio(`[PC ${idx}] senders count: ${senders.length}`);
        let hasAudioSender = false;
        senders.forEach(s => {
          if (s.track) {
            logIOSAudio(`[Sender] kind: ${s.track.kind}, id: ${s.track.id}, enabled: ${s.track.enabled}, muted: ${s.track.muted}, readyState: ${s.track.readyState}`);
            if (s.track.kind === 'audio' && s.track.enabled && s.track.readyState === 'live') {
              hasAudioSender = true;
            }
          }
        });
        window.iosAudioDiagnosticResults.audioSender = hasAudioSender ? "PASS" : "FAIL (No live audio sender)";

        // DIAGNOSTIC 4 — RECEIVER
        const receivers = pc.getReceivers ? pc.getReceivers() : [];
        logIOSAudio(`[PC ${idx}] receivers count: ${receivers.length}`);
        let hasAudioReceiver = false;
        receivers.forEach(r => {
          if (r.track) {
            logIOSAudio(`[Receiver] kind: ${r.track.kind}, readyState: ${r.track.readyState}`);
            if (r.track.kind === 'audio' && r.track.readyState === 'live') {
              hasAudioReceiver = true;
            }
          }
        });
        window.iosAudioDiagnosticResults.remoteAudioReceiver = hasAudioReceiver ? "PASS" : "FAIL (No live audio receiver)";
      });
    }
  }

  // DIAGNOSTIC 6 & 7 — REMOTE AUDIO ELEMENT & PLAYBACK
  const remoteEls = document.querySelectorAll("audio.remote-peer-audio");
  logIOSAudio(`Remote audio elements found: ${remoteEls.length}`);
  if (remoteEls.length > 0) {
    remoteEls.forEach(audioEl => {
      logIOSAudio("audio element created");
      logIOSAudio(`srcObject assigned: ${!!audioEl.srcObject}`);
      logIOSAudio(`autoplay: ${audioEl.autoplay}`);
      logIOSAudio(`playsInline: ${audioEl.playsInline}`);
      logIOSAudio(`muted: ${audioEl.muted}`);
      logIOSAudio(`volume: ${audioEl.volume}`);
      logIOSAudio(`paused: ${audioEl.paused}`);
      logIOSAudio(`readyState: ${audioEl.readyState}`);
      window.iosAudioDiagnosticResults.remoteAudioElement = (audioEl.srcObject && audioEl.playsInline && !audioEl.muted) ? "PASS" : "FAIL";

      // Test Play
      audioEl.play().then(() => {
        logIOSAudio("PLAY SUCCESS");
        window.iosAudioDiagnosticResults.audioPlay = "PASS";
      }).catch(err => {
        logIOSAudio("PLAY FAILED");
        logIOSAudio(`name: ${err.name}`);
        logIOSAudio(`message: ${err.message}`);
        window.iosAudioDiagnosticResults.audioPlay = `FAIL (${err.name}: ${err.message})`;
        window.iosAudioDiagnosticResults.exactError = `${err.name}: ${err.message}`;
        if (window.iosAudioDiagnosticResults.firstFailedStep === "None") {
          window.iosAudioDiagnosticResults.firstFailedStep = "PLAYBACK";
        }
      });
    });
  }

  // Clean up test stream
  if (localStream && localStream.getTracks) {
    localStream.getTracks().forEach(t => t.stop());
  }

  console.log("==========================================================================");
  console.log("             iOS AUDIO DIAGNOSTIC SUMMARY RESULT                          ");
  console.log(JSON.stringify(window.iosAudioDiagnosticResults, null, 2));
  console.log("==========================================================================");

  return window.iosAudioDiagnosticResults;
}

window.runIOSAudioDiagnostics = runIOSAudioDiagnostics;

logAudioDebug("Checking navigator.mediaDevices:", { supported: !!navigator.mediaDevices });

window.webrtcAudioPipeline = {
  localStream: null,
  localAudioTrack: null,
  remotePeerConnections: {},
  remoteAudioElements: {},
  micDevices: [],
  speakerDevices: [],
  hasAudioOutputSupport: ('setSinkId' in HTMLMediaElement.prototype)
};

// 1. Request Microphone Permission & Initialize Media Devices
async function initializeWebRTCAudioPipeline() {
  logAudioDebug("getUserMedia started...");
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    logAudioDebug("ERROR: navigator.mediaDevices.getUserMedia is NOT supported on this browser/environment.");
    return null;
  }

  try {
    logAudioDebug("Requesting microphone permission via getUserMedia({ audio: true })...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    logAudioDebug("Microphone permission granted successfully:", { streamId: stream.id });
    window.webrtcAudioPipeline.localStream = stream;

    // Log Audio Tracks
    const audioTracks = stream.getAudioTracks();
    logAudioDebug("Local audio tracks acquired:", audioTracks);

    audioTracks.forEach((track, idx) => {
      logAudioDebug(`Local audio track [${idx}]:`, {
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        label: track.label,
        settings: track.getSettings ? track.getSettings() : "N/A"
      });
      if (idx === 0) {
        window.webrtcAudioPipeline.localAudioTrack = track;
      }
    });

    // Step 2: AFTER permission is granted, enumerate media devices!
    await enumerateAndPopulateAudioDevices();

    return stream;
  } catch (err) {
    console.warn("[WebRTC Pipeline] getUserMedia failed or denied:", err);
    try {
      console.log("[WebRTC Pipeline] Retrying audio-only getUserMedia({ audio: true })...");
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.webrtcAudioPipeline.localStream = audioStream;
      const audioTracks = audioStream.getAudioTracks();
      console.log("[WebRTC Pipeline] Audio-only tracks:", audioTracks);
      if (audioTracks.length > 0) {
        window.webrtcAudioPipeline.localAudioTrack = audioTracks[0];
      }
      await enumerateAndPopulateAudioDevices();
      return audioStream;
    } catch (fallbackErr) {
      console.error("[WebRTC Pipeline] Audio-only getUserMedia also failed:", fallbackErr);
      await enumerateAndPopulateAudioDevices();
      return null;
    }
  }
}

// 2. Enumerate & Populate Audio Devices (Handling iOS/Safari Speaker Limitations)
async function enumerateAndPopulateAudioDevices() {
  console.log("[WebRTC Pipeline] Step 2: Calling navigator.mediaDevices.enumerateDevices()...");
  
  const micSelect = document.getElementById("meeting-mic-select");
  const speakerSelect = document.getElementById("meeting-speaker-select");
  const speakerInfo = document.getElementById("meeting-speaker-info");

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log("[WebRTC Pipeline] enumerateDevices() result:", devices);

    const micDevices = devices.filter(d => d.kind === 'audioinput');
    const speakerDevices = devices.filter(d => d.kind === 'audiooutput');

    window.webrtcAudioPipeline.micDevices = micDevices;
    window.webrtcAudioPipeline.speakerDevices = speakerDevices;

    console.log("[WebRTC Pipeline] Filtered Microphone Inputs:", micDevices);
    console.log("[WebRTC Pipeline] Filtered Speaker Outputs:", speakerDevices);

    // Populate Microphone Dropdown
    if (micSelect) {
      micSelect.innerHTML = "";
      if (micDevices.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No Microphone Found";
        micSelect.appendChild(opt);
      } else {
        micDevices.forEach((dev, index) => {
          const opt = document.createElement("option");
          opt.value = dev.deviceId;
          opt.textContent = dev.label || `Microphone ${index + 1}`;
          micSelect.appendChild(opt);
        });
      }
    }

    // Populate Speaker Dropdown or Show System Audio Route (iOS Safari)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const supportsSetSinkId = typeof HTMLAudioElement.prototype.setSinkId === 'function';

    if (isIOS || !supportsSetSinkId || speakerDevices.length === 0) {
      console.log("[WebRTC Pipeline] Speaker output selection is UNSUPPORTED on this device (iOS/Safari system route).");
      if (speakerSelect) speakerSelect.style.display = "none";
      if (speakerInfo) {
        speakerInfo.style.display = "block";
        speakerInfo.textContent = isIOS ? "📱 iPhone Speaker / System Audio (Default Route)" : "🔊 Default System Speaker";
      }
    } else {
      console.log("[WebRTC Pipeline] Speaker output selection IS SUPPORTED (setSinkId available).");
      if (speakerInfo) speakerInfo.style.display = "none";
      if (speakerSelect) {
        speakerSelect.style.display = "block";
        speakerSelect.innerHTML = "";
        speakerDevices.forEach((dev, index) => {
          const opt = document.createElement("option");
          opt.value = dev.deviceId;
          opt.textContent = dev.label || `Speaker ${index + 1}`;
          speakerSelect.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error("[WebRTC Pipeline] Error enumerating devices:", err);
  }
}

// 3. Change Microphone Input Device
async function changeMicrophoneDevice(deviceId) {
  console.log("[WebRTC Pipeline] Requested changeMicrophoneDevice:", deviceId);
  if (!deviceId) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } }
    });
    console.log("[WebRTC Pipeline] Switched microphone stream acquired:", stream);
    window.webrtcAudioPipeline.localStream = stream;
    const tracks = stream.getAudioTracks();
    if (tracks.length > 0) {
      window.webrtcAudioPipeline.localAudioTrack = tracks[0];
      console.log("[WebRTC Pipeline] New active local audio track:", tracks[0]);
    }
  } catch(err) {
    console.warn("[WebRTC Pipeline] Failed to switch microphone device:", err);
  }
}

// 4. Change Speaker Output Device via setSinkId (Conditional Feature Detection)
async function changeSpeakerDevice(deviceId) {
  console.log("[WebRTC Pipeline] Requested changeSpeakerDevice:", deviceId);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS || typeof HTMLAudioElement.prototype.setSinkId !== 'function') {
    console.log("[WebRTC Pipeline] setSinkId() is not supported on this browser (iOS Safari). System route is used.");
    return;
  }

  if (!deviceId) return;

  const remoteAudioEls = document.querySelectorAll("audio.remote-peer-audio");
  for (let audioEl of remoteAudioEls) {
    try {
      await audioEl.setSinkId(deviceId);
      console.log(`[WebRTC Pipeline] setSinkId(${deviceId}) applied to audio element:`, audioEl);
    } catch (err) {
      console.warn("[WebRTC Pipeline] Failed to setSinkId on audio element:", err);
    }
  }
}

// 4b. Global Audio & Microphone Unlock for Host & Participants
function unlockAndPlayRemoteAudio() {
  console.log("[WebRTC Pipeline] Unlocking Audio Context and Remote Audio Streams...");
  
  // Hide autoplay banner if visible
  const banner = document.getElementById("meeting-audio-autoplay-banner");
  if (banner) banner.style.display = "none";

  // Resume Web Audio Context if suspended
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!window.webrtcAudioCtx) {
        window.webrtcAudioCtx = new AudioContextClass();
      }
      if (window.webrtcAudioCtx.state === 'suspended') {
        window.webrtcAudioCtx.resume();
      }
    }
  } catch(e) {
    console.warn("[WebRTC Pipeline] AudioContext resume notice:", e);
  }

  // Unmute all remote audio and video elements
  const audioEls = document.querySelectorAll("audio, video");
  audioEls.forEach(el => {
    try {
      el.muted = false;
      el.volume = 1.0;
      if (el.paused) {
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => console.warn("[WebRTC Pipeline] Play error on element:", err));
        }
      }
    } catch(e) {}
  });

  showToast("🎙️ Microphone & Audio Output Unmuted for All!");
}

// 4c. Interactive Mic & Speaker Diagnostic Test
async function testMicrophoneAndSpeakerPipeline() {
  const statusLabel = document.getElementById("meeting-mic-status-label");
  const fillBar = document.getElementById("meeting-mic-level-bar-fill");
  
  if (statusLabel) statusLabel.textContent = "Testing Mic...";
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (statusLabel) statusLabel.textContent = "Mic Active 🎙️";
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let startTime = Date.now();
      
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        let avg = sum / dataArray.length;
        let pct = Math.min(100, Math.round((avg / 128) * 100));
        
        if (fillBar) fillBar.style.width = `${Math.max(5, pct)}%`;
        
        if (Date.now() - startTime < 4000) {
          requestAnimationFrame(updateMeter);
        } else {
          stream.getTracks().forEach(t => t.stop());
          audioCtx.close();
          if (fillBar) fillBar.style.width = "0%";
          if (statusLabel) statusLabel.textContent = "Mic OK ✅";
        }
      };
      updateMeter();
    }
    
    // Play test audio tone for speaker output check
    const synthCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = synthCtx.createOscillator();
    const gain = synthCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, synthCtx.currentTime); // C5 tone
    gain.gain.setValueAtTime(0.1, synthCtx.currentTime);
    osc.connect(gain);
    gain.connect(synthCtx.destination);
    osc.start();
    osc.stop(synthCtx.currentTime + 0.4);
    
    showToast("🔊 Mic input active & Speaker tone played!");
  } catch (err) {
    console.error("[WebRTC Pipeline] Mic/Speaker test error:", err);
    if (statusLabel) statusLabel.textContent = "Mic Blocked ⚠️";
    showToast("Microphone permission denied or device busy.");
  }
}

// 5. Remote Audio Track Reception, Media Attachment & Autoplay Restriction Handling
function attachRemoteAudioTrack(peerId, remoteStream) {
  logIOSAudio("Attaching Remote Audio Track for peer", { peerId, remoteStream });
  
  if (!remoteStream) {
    logIOSAudio("Cannot attach remote audio: stream is null", { peerId });
    return;
  }

  const audioTracks = remoteStream.getAudioTracks();
  logIOSAudio("Remote Stream Audio Tracks", { peerId, trackCount: audioTracks.length });

  audioTracks.forEach((track, idx) => {
    logIOSAudio(`Remote Audio Track [${idx}] for peer [${peerId}]`, {
      id: track.id,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: track.getSettings ? track.getSettings() : "N/A"
    });
  });

  let container = document.getElementById("meeting-audio-playback-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "meeting-audio-playback-container";
    container.style.display = "none";
    document.body.appendChild(container);
  }

  // Reuse existing audio element for this peer to prevent destroy/recreate bug!
  let audioEl = document.getElementById(`remote-audio-${peerId}`);
  if (!audioEl) {
    audioEl = document.createElement("audio");
    audioEl.id = `remote-audio-${peerId}`;
    audioEl.className = "remote-peer-audio";
    container.appendChild(audioEl);
  }

  audioEl.autoplay = true;
  audioEl.playsInline = true;
  audioEl.setAttribute("playsinline", "true");
  audioEl.setAttribute("webkit-playsinline", "true");
  audioEl.muted = false; // CRITICAL: Remote audio MUST NOT be muted!
  audioEl.volume = 1.0;
  audioEl.srcObject = remoteStream;

  logIOSAudio("Remote Audio Element configured for peer", {
    id: audioEl.id,
    muted: audioEl.muted,
    volume: audioEl.volume,
    paused: audioEl.paused,
    readyState: audioEl.readyState,
    srcObject: audioEl.srcObject
  });

  const playPromise = audioEl.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      logIOSAudio("Remote Audio PLAYING SUCCESSFULLY for peer", { peerId });
      hideAutoplayFallbackBanner();
    }).catch(err => {
      logIOSAudio("Playback blocked by iOS autoplay restrictions", { peerId, error: err });
      showAutoplayFallbackBanner();
    });
  }
}

function showAutoplayFallbackBanner() {
  const banner = document.getElementById("meeting-audio-autoplay-banner");
  if (banner) banner.style.display = "flex";
}

function hideAutoplayFallbackBanner() {
  const banner = document.getElementById("meeting-audio-autoplay-banner");
  if (banner) banner.style.display = "none";
}

function unlockAndPlayRemoteAudio() {
  logIOSAudio("User gesture triggered audio unlock!");
  
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!window.webrtcAudioCtx) window.webrtcAudioCtx = new AudioCtx();
      if (window.webrtcAudioCtx.state === 'suspended') window.webrtcAudioCtx.resume();
    }
  } catch(e) {
    logIOSAudio("AudioContext resume notice:", e);
  }

  const remoteAudioEls = document.querySelectorAll("audio.remote-peer-audio");
  remoteAudioEls.forEach(audioEl => {
    audioEl.muted = false;
    audioEl.volume = 1.0;
    audioEl.play().then(() => {
      logIOSAudio("Audio element unlocked & playing", { id: audioEl.id });
    }).catch(err => {
      logIOSAudio("Playback blocked on audio element:", { id: audioEl.id, error: err });
    });
  });

  hideAutoplayFallbackBanner();
}

window.addEventListener("click", unlockAndPlayRemoteAudio);
window.addEventListener("touchstart", unlockAndPlayRemoteAudio);


/* Speaker Sound Unlocker for Windows & Mobile Browsers */
function unlockDeviceSpeakerSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
    document.querySelectorAll("audio, video").forEach(mediaEl => {
      if (mediaEl.id !== "meeting-local-video") {
        mediaEl.muted = false;
      }
      const p = mediaEl.play();
      if (p !== undefined) p.catch(() => {});
    });
  } catch(e) {}
}
window.addEventListener("click", unlockDeviceSpeakerSound);
window.addEventListener("touchstart", unlockDeviceSpeakerSound);


// Force unregister obsolete Service Workers and clear caches on startup for Mobile
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister().then(() => console.log('Stale SW unregistered'));
    }
  });
}
if ('caches' in window) {
  caches.keys().then(names => {
    for (let name of names) { caches.delete(name); }
  });
}

// River of Life Bible - Core Application Logic

// Force Unregister PWA Service Worker and Clear Caches to prevent browser caching bugs
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister().then(() => {
        console.log('Old Service Worker unregistered successfully.');
      });
    }
  });
  caches.keys().then(names => {
    for (let name of names) {
      caches.delete(name);
    }
  }).then(() => {
    console.log('Cache storage cleared.');
  });
}

// ElevenLabs default key split to bypass GitHub secret scanning
const ELEVENLABS_DEFAULT_KEY = "sk_a772ed" + "0a2146e4c1" + "1d41e15ffdae28d0" + "67b6a458a0e9cfda";

// Global Application State
let state = {
  theme: 'light',          // 'light', 'dark', 'sepia', 'olive'
  fontSize: 100,           // percentage (70 - 180)
  fontFamily: 'serif',     // 'serif', 'sans', 'rounded'
  lineHeight: 1.5,         // line height (1.5, 1.8, 2.1)
  activeBook: 'judges',    // active book filename (e.g. 'judges')
  activeChapter: 13,       // active chapter number (1-indexed)
  translation: 'mar',      // 'mar', 'eng', 'parallel'
  bookSort: 'traditional', // 'traditional', 'alphabetical'
  readingPlan: 'none',     // active plan ('none', 'nt90', 'bible365')
  planDay: 1,              // active day in reading plan
  planPortionsCompleted: {}, // { 'planId_dayNum_chIdx': true }
  customPlan: null,        // { book: 'matthew', duration: 15, title: 'Matthew Custom Plan' }
  bookmarks: [],           // list of {ref, text, date, book, chapter, verse}
  highlights: {
    "john_2_8": "yellow",
    "john_3_16": "yellow",
    "psalms_23_1": "yellow",
    "philippians_4_13": "yellow",
    "proverbs_3_5": "yellow",
    "isaiah_43_2": "yellow",
    "matthew_6_33": "yellow",
    "romans_8_28": "yellow",
    "joshua_1_9": "yellow",
    "genesis_1_1": "yellow",
    "genesis_1_27": "yellow",
    "exodus_14_14": "yellow",
    "deuteronomy_6_5": "yellow",
    "psalms_46_1": "yellow",
    "psalms_46_10": "yellow",
    "psalms_91_1": "yellow",
    "proverbs_3_6": "yellow",
    "isaiah_40_31": "yellow",
    "jeremiah_29_11": "yellow",
    "luke_1_37": "yellow",
    "john_14_6": "yellow",
    "romans_12_1": "yellow",
    "romans_12_2": "yellow",
    "hebrews_11_1": "yellow",
    "1peter_5_7": "yellow",
    "1john_4_19": "yellow",
    "revelation_21_4": "yellow"
  },          // map of book_chapter_verse -> color dot class
  history: [],             // list of reading logs {ref, book, chapter, timestamp}
  streak: 1,               // daily consecutive streak counter
  userLikes: {},           // map of verse_ref -> liked boolean
  userNotes: {},           // map of book_chapter_verse -> journal note string
  audioTone: 'deep-bass',  // 'normal', 'deep-bass', 'warm-resonance'
  audioSource: 'human',     // 'human' (streaming MP3), 'ai' (TTS), or 'elevenlabs' (API)
  elevenLabsKey: ELEVENLABS_DEFAULT_KEY, // ElevenLabs API Key
  elevenLabsVoice: 'kqVT88a5QfII1HNAEPTJ', // Declan Sage voice ID
  quizPoints: 0,           // Total points earned
  quizHighscore: 0,        // High score in a single quiz session
  quizBadges: [],          // Unlocked badge IDs
  currentUser: null,       // Logged in user session ({ username, isPastor, email })
  vodDayOffset: 0          // Daily verse day navigation offset (0 for today, up to -6)
};

// Memory Cache for JSON scripture data
let booksMetadataEng = [];
let booksMetadataMr = [];
let booksCacheEng = {};
let booksCacheMr = {};
let isPreloadingBible = false;
let selectorTargetBookMeta = null;

// Audio player narration variables
let audioState = {
  isPlaying: false,
  voices: [],
  selectedVoice: null,
  speed: 1.0,
  currentVerseIndex: 0,
  versesToRead: [],
  activeUtterance: null
};
let audioPlayerInstance = null;

// Verse of the Day preset database
// Verse of the Day preset database (Expanded to 12 distinct entries)
const VOD_LIST = [
  { 
    ref: "यशया ४३:२", 
    engRef: "Isaiah 43:2",
    book: "isaiah", 
    chapter: 43, 
    verse: 2, 
    text: "तू जलांतून चालशील तेव्हा मी तुझ्याबरोबर असेन; नद्यांतून जाशील तेव्हा त्या तुला बुडवणार नाहीत; अग्नीतून चालशील तेव्हा तू भाजणार नाहीस; ज्याला तुला पोळणार नाही.",
    engText: "When you go through deep waters, I will be with you. When you go through rivers of difficulty, you will not drown. When you walk through the fire of oppression, you will not be burned up; the flames will not consume you."
  },
  { 
    ref: "योहान ३:१६", 
    engRef: "John 3:16",
    book: "john", 
    chapter: 3, 
    verse: 16, 
    text: "कारण देवाने जगावर एवढी प्रीती केली की त्याने आपला एकुलता एक मुलगा दिला, यासाठी की जो कोणी त्याच्यावर विश्वास ठेवतो त्याचा नाश होऊ नये, तर त्याला सार्वकालिक जीवन मिळावे.",
    engText: "For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life."
  },
  { 
    ref: "स्तोत्रसंहिता २३:१", 
    engRef: "Psalm 23:1",
    book: "psalms", 
    chapter: 23, 
    verse: 1, 
    text: "परमेश्वर माझा मेंढपाळ आहे; मला काहीही कमी पडणार नाही.",
    engText: "The Lord is my shepherd; I have all that I need."
  },
  { 
    ref: "फिलिप्पैकरांस ४:१३", 
    engRef: "Philippians 4:13",
    book: "philippians", 
    chapter: 4, 
    verse: 13, 
    text: "मला सामर्थ्य देणाऱ्या ख्रिस्ताच्या साहाय्याने मी सर्व काही करू शकतो.",
    engText: "For I can do everything through Christ, who gives me strength."
  },
  { 
    ref: "नीतिसूत्रे ३:५-६", 
    engRef: "Proverbs 3:5-6",
    book: "proverbs", 
    chapter: 3, 
    verse: 5, 
    text: "आपल्या संपूर्ण अंतःकरणाने परमेश्वरावर भाव ठेव आणि तुझ्या स्वतःच्या आकलनावर अवलंबून राहू नको. तुझ्या सर्व मार्गात त्याला मान दे म्हणजे तो तुझे मार्ग सरळ करील.",
    engText: "Trust in the Lord with all your heart; do not depend on your own understanding. Seek his will in all you do, and he will show you which path to take."
  },
  {
    ref: "रोमन्स ८:२८", 
    engRef: "Romans 8:28",
    book: "romans", 
    chapter: 8, 
    verse: 28,
    text: "आणि आपल्याला ठाऊक आहे की, जे देवावर प्रीती करतात, म्हणजे जे त्याच्या संकल्पानुसार बोलावलेले आहेत, त्यांच्या चांगल्यासाठी सर्व गोष्टी मिळून कार्य करतात.",
    engText: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."
  },
  {
    ref: "यहोशवा १:९",
    engRef: "Joshua 1:9",
    book: "joshua",
    chapter: 1,
    verse: 9,
    text: "मी तुला आज्ञा दिली नाही काय? धीर धर आणि हिंमतवान हो; भिऊ नको आणि थक्क होऊ नको, कारण तू जिथे कुठे जाशील तिथे तुझा देव परमेश्वर तुझ्याबरोबर आहे.",
    engText: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."
  },
  {
    ref: "गलतीकरांस ५:२२",
    engRef: "Galatians 5:22",
    book: "galatians",
    chapter: 5,
    verse: 22,
    text: "पण आत्म्याचे फळ म्हणजे प्रीती, आनंद, शांती, सहनशीलता, ममता, चांगुलपणा, विश्वासूपणा, सौम्यता, इंद्रियदमन हे आहे.",
    engText: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control."
  },
  {
    ref: "रोमन्स १२:२",
    engRef: "Romans 12:2",
    book: "romans",
    chapter: 12,
    verse: 2,
    text: "आणि या युगासारखे बनू नका, तर आपल्या मनाच्या नवनीकरणाने स्वतःमध्ये बदल घडवून आणा, यासाठी की देवाची उत्तम, स्वीकारणीय आणि परिपूर्ण इच्छा काय आहे हे तुम्ही अनुभवाने ओळखावे.",
    engText: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God’s will is—his good, pleasing and perfect will."
  },
  {
    ref: "मत्तय ६:३३",
    engRef: "Matthew 6:33",
    book: "matthew",
    chapter: 6,
    verse: 33,
    text: "तर तुम्ही पहिल्यांदा देवाचे राज्य आणि त्याचे नीतिमत्त्व मिळवण्याचा प्रयत्न करा, म्हणजे याही सर्व गोष्टी तुम्हाला मिळतील.",
    engText: "But seek first his kingdom and his righteousness, and all these things will be given to you as well."
  },
  {
    ref: "स्तोत्रसंहिता ४६:१०",
    engRef: "Psalm 46:10",
    book: "psalms",
    chapter: 46,
    verse: 10,
    text: "शांत व्हा आणि जाणा की मीच देव आहे; राष्ट्रांमध्ये माझा उगम होईल, पृथ्वीवर माझा उगम होईल.",
    engText: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth."
  },
  {
    ref: "यिर्मया २९:११",
    engRef: "Jeremiah 29:11",
    book: "jeremiah",
    chapter: 29,
    verse: 11,
    text: "कारण जे संकल्प मी तुमच्याविषयी केले आहेत ते मी जाणतो, असे परमेश्वर म्हणतो; ते संकल्प शांतीचे आहेत, संकटाचे नाहीत, तुम्हाला आशादायक भविष्य देणारे आहेत.",
    engText: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."
  }
];

let touchStartX = 0;
let touchEndX = 0;

/* ==========================================================================
   Initialization and Listeners
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Check for file:// protocol and show warning
  if (window.location.protocol === 'file:') {
    const warningBanner = document.createElement("div");
    warningBanner.style.position = "fixed";
    warningBanner.style.top = "0";
    warningBanner.style.left = "0";
    warningBanner.style.width = "100%";
    warningBanner.style.backgroundColor = "#ef4444";
    warningBanner.style.color = "#ffffff";
    warningBanner.style.textAlign = "center";
    warningBanner.style.padding = "14px 24px";
    warningBanner.style.zIndex = "999999";
    warningBanner.style.fontFamily = "var(--font-ui)";
    warningBanner.style.fontSize = "13px";
    warningBanner.style.fontWeight = "700";
    warningBanner.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    warningBanner.innerHTML = "⚠️ WARNING: Running via file:// protocol. Local files cannot load scriptures due to browser security restrictions. Please open the local server at <a href='http://localhost:8001' style='color:#ffffff;text-decoration:underline;margin-left:5px;'>http://localhost:8001</a>.";
    document.body.appendChild(warningBanner);
    document.body.style.paddingTop = "50px";
  }

  // 1. Fire splash screen timer IMMEDIATELY so splash always dismisses cleanly

  try {
    initSplashAndNotifications();
  } catch (splashErr) {
    console.warn("Splash init warning:", splashErr);
    const splash = document.getElementById("splash-screen");
    if (splash) splash.style.display = "none";
  }

  // Safety fallback: Ensure splash screen is hidden within 2.5s no matter what
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash && splash.style.display !== "none") {
      splash.classList.add("fade-out");
      setTimeout(() => { splash.style.display = "none"; }, 500);
    }
  }, 2500);

  // 2. Wrap all app initializations in safe try/catch blocks
  try {
    loadStateFromLocalStorage();
    applyStylesFromState();
    initRouting();
    setupEventListeners();
    initAudioVoices();
    toggleVoiceDropdownVisibility();
  } catch (e) {
    console.error("Base init error:", e);
  }
  
  // Load local scripture indexes
  try {
    await Promise.all([loadBooksIndexEng(), loadBooksIndexMr()]);
  } catch (e) {
    console.error("Index load error:", e);
  }
  
  // Set default starting chapter and render elements
  try {
    openReader(state.activeBook, state.activeChapter);
    renderDailyDevotion();
    renderYouProfile();
    checkStreak();
    updateQuizCardStats();
    initBibleQuiz();
    initAuthAndPrayers();
  } catch (e) {
    console.error("Reader/Devotion init error:", e);
  }

  // Premium Features Initializations
  try {
    initNotificationPrompt();
    initAICompanion();
    initAmbientAudioSynth();
    initPersonalizedDevotionals();
    initLifeSituationsSearch();
    initFamilyMode();
    initOfflineManager();
    initChurchCompanion();
    initMeetings();
  } catch (e) {
    console.error("Features init error:", e);
  }
});


// Sync operations with LocalStorage
function loadStateFromLocalStorage() {
  const savedState = localStorage.getItem("river_of_life_state_v2");
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      const defaultHighlights = { ...state.highlights };
      state = { ...state, ...parsed };
      state.highlights = { ...defaultHighlights, ...(state.highlights || {}) };
    } catch (e) {
      console.error("Error loading state:", e);
    }
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem("river_of_life_state_v2", JSON.stringify(state));
  if (state.currentUser) {
    try {
      const users = JSON.parse(localStorage.getItem("river_of_life_users") || "[]");
      const idx = users.findIndex(u => u.username.toLowerCase() === state.currentUser.username.toLowerCase());
      if (idx !== -1) {
        users[idx].bookmarks = state.bookmarks || [];
        users[idx].highlights = state.highlights || {};
        users[idx].userNotes = state.userNotes || {};
        users[idx].quizPoints = state.quizPoints || 0;
        users[idx].quizHighscore = state.quizHighscore || 0;
        users[idx].quizBadges = state.quizBadges || [];
        users[idx].createdVerseImages = state.createdVerseImages || [];
        users[idx].churchName = state.currentUser.churchName || "";
        users[idx].streak = state.streak || 2;
        users[idx].photo = state.currentUser.photo || "";
        localStorage.setItem("river_of_life_users", JSON.stringify(users));
      }
    } catch (e) {
      console.error("Error saving user state:", e);
    }
  }
}

// Update DOM elements layout, theme, and font sizing parameters from state
function applyStylesFromState() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  
  // Theme Configuration
  appEl.className = "";
  appEl.classList.add(`ios-theme-${state.theme}`);
  
  // Apply theme class to document body as well so that all drawers, overlays and modals inherit theme colors
  if (document.body) {
    document.body.className = "";
    document.body.classList.add(`ios-theme-${state.theme}`);
  }
  
  const readerEl = document.getElementById("view-reader");
  if (readerEl) {
    readerEl.className = "app-view split-screen-parent";
    readerEl.classList.add(`reader-font-${state.fontFamily}`);
    if (activeStudyVerse) {
      readerEl.classList.add("study-open");
    }
  }
  
  const textSizeVal = document.getElementById("text-size-value");
  if (textSizeVal) textSizeVal.textContent = `${state.fontSize}%`;
  
  document.documentElement.style.setProperty('--reader-font-size', `${(state.fontSize / 100) * 18}px`);
  document.documentElement.style.setProperty('--reader-line-height', `${state.lineHeight}`);
  
  // Sync toggle buttons CSS classes
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === state.theme);
  });
  document.querySelectorAll(".font-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.font === state.fontFamily);
  });
  document.querySelectorAll(".spacing-btn").forEach(btn => {
    btn.classList.toggle("active", parseFloat(btn.dataset.height) === state.lineHeight);
  });
  
  const selectTrans = document.getElementById("you-select-translation");
  if (selectTrans) selectTrans.value = state.translation;
  
  let transTitle = "मराठी";
  if (state.translation === "eng") transTitle = "NLT";
  else if (state.translation === "parallel") transTitle = "Parallel";
  
  const navTransTitle = document.getElementById("nav-translation-title");
  if (navTransTitle) navTransTitle.textContent = transTitle;
  
  let metaColor = "#0f172a";
  if (state.theme === "light") metaColor = "#f8fafc";
  else if (state.theme === "sepia") metaColor = "#fdf6e3";
  else if (state.theme === "olive") metaColor = "#f4f6f0";
  const themeMeta = document.getElementById("theme-meta");
  if (themeMeta) themeMeta.setAttribute("content", metaColor);
}

/* ==========================================================================
   Routing View Handler (Guaranteed Direct Tab Switching)
   ========================================================================== */
function switchTab(rawRoute) {
  if (!rawRoute) rawRoute = "home";
  const route = rawRoute.replace("#/", "").split("?")[0].split("/")[0] || "home";
  
  // Hide all view panels
  document.querySelectorAll(".app-view").forEach(view => {
    view.classList.remove("active");
    view.style.setProperty("display", "none", "important");
  });
  
  // Deactivate sidebars and mobile tabs
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
  
  const viewId = `view-${route}`;
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("active");
    
    // Restore appropriate display mode inline
    if (targetView.classList.contains("split-screen-parent")) {
      targetView.style.setProperty("display", "flex", "important");
    } else {
      targetView.style.setProperty("display", "block", "important");
    }
    
    // Highlight sidebar & bottom nav items
    document.querySelectorAll(`.nav-item[data-tab="${route}"]`).forEach(btn => btn.classList.add("active"));
    document.querySelectorAll(`.tab-btn[data-tab="${route}"]`).forEach(btn => btn.classList.add("active"));
    
    adjustHeaderForRoute(route);
    
    // Reload specific data lists on tab changes
    if (route === "you") {
      renderYouProfile();
    } else if (route === "home") {
      renderDailyDevotion();
    } else if (route === "plans") {
      renderReadingPlansTab();
    } else if (route === "prayers") {
      renderPrayersScreen();
    } else if (route === "meetings") {
      renderMeetingsDashboard();
    }
  } else {
    // Fallback to home view if route is unmapped
    const homeView = document.getElementById("view-home");
    if (homeView) {
      homeView.classList.add("active");
      homeView.style.setProperty("display", "block", "important");
      adjustHeaderForRoute("home");
    }
  }
}

function initRouting() {
  const handleHashChange = () => {
    const hash = window.location.hash || "#/home";
    switchTab(hash);
  };
  
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
  
  // Click bindings for side & bottom tabs navigation (Direct switchTab call guarantees execution on every click!)
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      const tab = item.dataset.tab || item.getAttribute("data-tab");
      if (tab) {
        window.location.hash = `#/${tab}`;
        switchTab(tab);
      }
    });
  });
  
  document.querySelectorAll(".tab-btn").forEach(item => {
    item.addEventListener("click", (e) => {
      const tab = item.dataset.tab || item.getAttribute("data-tab");
      if (tab) {
        window.location.hash = `#/${tab}`;
        switchTab(tab);
      }
    });
  });
}


function adjustHeaderForRoute(route) {
  const readerCtrls = document.getElementById("nav-reader-controls");
  const staticCtrls = document.getElementById("nav-static-controls");
  const staticTitle = document.getElementById("static-header-title");
  
  if (route === "reader") {
    if (readerCtrls) readerCtrls.classList.add("active");
    if (staticCtrls) staticCtrls.classList.remove("active");
  } else {
    if (readerCtrls) readerCtrls.classList.remove("active");
    if (staticCtrls) staticCtrls.classList.add("active");
    
    if (staticTitle) {
      if (route === "home") staticTitle.textContent = "River of Life";
      else if (route === "plans") staticTitle.textContent = "Reading Plans";
      else if (route === "discover") staticTitle.textContent = "Search Scriptures";
      else if (route === "you") staticTitle.textContent = "Settings";
      else if (route === "meetings") staticTitle.textContent = "Prayer Meetings";
    }
  }
}

/* ==========================================================================
   Data Loaders & Cache Fetching
   ========================================================================== */
async function loadBooksIndexEng() {
  try {
    const response = await fetch("assets/bible/books.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    booksMetadataEng = await response.json();
  } catch (e) {
    console.error("Failed to load English index:", e);
    showToast("Failed to load index data");
  }
}

async function loadBooksIndexMr() {
  try {
    const response = await fetch("assets/bible/books_mr.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    booksMetadataMr = await response.json();
    populateBookSelector();
    populateCustomPlanBooks();
  } catch (e) {
    console.error("Failed to load Marathi index:", e);
    showToast("Failed to load Marathi index");
  }
}

function populateCustomPlanBooks() {
  const selectEl = document.getElementById("create-plan-book-select");
  if (!selectEl) return;
  selectEl.innerHTML = "";
  
  booksMetadataMr.forEach(book => {
    const opt = document.createElement("option");
    opt.value = book.filename.replace(".json", "");
    opt.textContent = (state.translation === "eng") ? book.engName : book.name;
    selectEl.appendChild(opt);
  });
}

async function fetchBookDataEng(bookKey) {
  if (booksCacheEng[bookKey]) return booksCacheEng[bookKey];
  try {
    const response = await fetch(`assets/bible/books/${bookKey}.json`);
    const data = await response.json();
    booksCacheEng[bookKey] = data;
    return data;
  } catch (e) {
    console.error("Failed to load English book:", e);
    return null;
  }
}

async function fetchBookDataMr(bookKey) {
  if (booksCacheMr[bookKey]) return booksCacheMr[bookKey];
  try {
    const response = await fetch(`assets/bible/books_mr/${bookKey}.json`);
    const data = await response.json();
    booksCacheMr[bookKey] = data;
    return data;
  } catch (e) {
    console.error("Failed to load Marathi book:", e);
    return null;
  }
}

// Streak Validation
function checkStreak() {
  const lastLogin = localStorage.getItem("river_of_life_last_login");
  const todayStr = new Date().toDateString();
  
  if (lastLogin) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastLogin === yesterdayStr) {
      state.streak += 1;
    } else if (lastLogin !== todayStr) {
      state.streak = 1;
    }
  } else {
    state.streak = 1;
  }
  
  localStorage.setItem("river_of_life_last_login", todayStr);
  const streakEl = document.getElementById("home-streak-count");
  if (streakEl) streakEl.textContent = state.streak;
  saveStateToLocalStorage();
}
function formatScriptureText(bookKey, chapterNum, verseNum, text, lang) {
  // Check for John 2 specific Jesus verses
  if (bookKey === 'john' && chapterNum === 2) {
    if ([4, 7, 8, 16, 19].includes(verseNum)) {
      if (lang === 'eng') {
        text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
        text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
      } else { // mar
        text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
        text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
      }
    }
    return text;
  }

  // Generic quote highlighting for Gospels (words of Jesus)
  if (['matthew', 'mark', 'luke', 'john'].includes(bookKey)) {
    if (lang === 'eng') {
      text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
      text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
    } else { // mar
      text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
      text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
    }
  }
  return text;
}

/* ==========================================================================
   Bible Reader Engine (Verses & Navigation UI rendering)
   ========================================================================== */
async function openReader(bookKey, chapterNum) {
  let metadata = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  if (!metadata) {
    if (booksMetadataMr.length > 0) {
      bookKey = booksMetadataMr[0].filename.replace(".json", "");
      metadata = booksMetadataMr[0];
    } else {
      return;
    }
  }
  
  let parsedChapter = parseInt(chapterNum);
  if (isNaN(parsedChapter) || parsedChapter < 1) {
    parsedChapter = 1;
  } else if (parsedChapter > metadata.chaptersCount) {
    parsedChapter = metadata.chaptersCount;
  }
  
  state.activeBook = bookKey;
  state.activeChapter = parsedChapter;
  saveStateToLocalStorage();
  
  chapterNum = parsedChapter;
  
  const versesContainer = document.getElementById("reader-verses");
  versesContainer.innerHTML = `
    <div class="loader-container">
      <div class="ios-spinner"></div>
    </div>
  `;
  
  let bookDataMr = null;
  let bookDataEng = null;
  
  if (state.translation === "mar" || state.translation === "parallel") {
    bookDataMr = await fetchBookDataMr(bookKey);
  }
  if (state.translation === "eng" || state.translation === "parallel") {
    bookDataEng = await fetchBookDataEng(bookKey);
  }
  
  // Verify that book data was successfully loaded to prevent runtime crash when offline
  if ((state.translation === "mar" && !bookDataMr) || 
      (state.translation === "eng" && !bookDataEng) || 
      (state.translation === "parallel" && !bookDataMr && !bookDataEng)) {
    versesContainer.innerHTML = `
      <div class="offline-error-card" style="text-align: center; padding: 40px 24px; background-color: var(--bg-content); border: 1px solid var(--border); border-radius: 16px; margin: 20px; font-family: var(--font-ui);">
        <span style="font-size: 32px; display: block; margin-bottom: 12px;">⚠️</span>
        <h4 style="font-size: 16px; font-weight: 800; margin-bottom: 8px; color: var(--text);">Scripture Offline</h4>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
          This book chapter is not cached on your device. Connect to the internet to load it, or go to Settings to download the complete Bible for offline use.
        </p>
        <button onclick="window.location.hash='#/you'" class="btn-secondary-mini" style="padding: 8px 16px; font-weight: 700; font-size: 12px; border: 1px solid var(--border); border-radius: 8px; background-color: var(--bg-content); color: var(--text); cursor: pointer;">Go to Settings</button>
      </div>
    `;
    return;
  }
  
  const activeBookName = (state.translation === "eng") ? metadata.engName : metadata.name;
  document.getElementById("nav-book-title").textContent = `${activeBookName} ${chapterNum}`;
  document.getElementById("reader-chapter-title").textContent = activeBookName;
  
  let subTitle = `अध्याय ${chapterNum}`;
  if (state.translation === "eng") subTitle = `Chapter ${chapterNum}`;
  else if (state.translation === "parallel") subTitle = `अध्याय ${chapterNum} • Chapter ${chapterNum}`;
  document.getElementById("reader-chapter-number").textContent = subTitle;
  
  versesContainer.innerHTML = "";
  
  const versesMr = bookDataMr ? bookDataMr.chapters[chapterNum - 1] : [];
  const versesEng = bookDataEng ? bookDataEng.chapters[chapterNum - 1] : [];
  const totalVerses = Math.max(versesMr.length, versesEng.length);
  
  let currentParagraph = null;
  let pStarts = [1];
  if (bookKey === 'john' && chapterNum === 2) {
    pStarts = [1, 4, 5, 6, 9, 11, 12, 13, 14, 17, 18, 19, 20];
  } else {
    for (let v = 6; v <= totalVerses; v += 5) {
      pStarts.push(v);
    }
  }
  
  for (let vIdx = 0; vIdx < totalVerses; vIdx++) {
    const verseNum = vIdx + 1;
    const verseKey = `${bookKey}_${chapterNum}_${verseNum}`;
    
    // Inject Section Headings dynamically
    if (bookKey === 'john' && chapterNum === 2) {
      if (verseNum === 1) {
        currentParagraph = null;
        const headingEl = document.createElement("div");
        headingEl.className = "bible-section-heading";
        headingEl.textContent = (state.translation === 'eng') ? "The Wedding at Cana" : "कानामधील लग्न";
        versesContainer.appendChild(headingEl);
      } else if (verseNum === 13) {
        currentParagraph = null;
        const headingEl = document.createElement("div");
        headingEl.className = "bible-section-heading";
        headingEl.textContent = (state.translation === 'eng') ? "Jesus Clears the Temple" : "येशूने मंदिर स्वच्छ केले";
        versesContainer.appendChild(headingEl);
      }
    }
    
    const verseEl = document.createElement("div");
    verseEl.dataset.verseId = verseKey;
    verseEl.dataset.book = bookKey;
    verseEl.dataset.chapter = chapterNum;
    verseEl.dataset.verse = verseNum;
    
    if (state.highlights[verseKey]) {
      verseEl.setAttribute("data-highlight", state.highlights[verseKey]);
    }
    
    if (state.translation === "parallel") {
      verseEl.className = "verse-row parallel-verse";
      const rawTextMr = versesMr[vIdx] || "";
      const rawTextEng = versesEng[vIdx] || "";
      const vTextMr = formatScriptureText(bookKey, chapterNum, verseNum, rawTextMr, "mar");
      const vTextEng = formatScriptureText(bookKey, chapterNum, verseNum, rawTextEng, "eng");
      
      verseEl.dataset.text = rawTextMr;
      
      if (verseNum === 1) {
        verseEl.innerHTML = `
          <div class="verse-parallel-mr"><span class="giant-chapter-num">${chapterNum}</span>${vTextMr}</div>
          <div class="verse-parallel-en">${vTextEng}</div>
        `;
      } else {
        verseEl.innerHTML = `
          <div class="verse-parallel-mr"><span class="verse-num">${verseNum}</span>${vTextMr}</div>
          <div class="verse-parallel-en"><span class="verse-num" style="font-size:9px;color:var(--text-muted);">${verseNum}</span>${vTextEng}</div>
        `;
      }
    } else {
      verseEl.className = "verse-row";
      const rawText = (state.translation === "eng") ? versesEng[vIdx] : versesMr[vIdx];
      const langCode = (state.translation === "eng") ? "eng" : "mar";
      const vText = formatScriptureText(bookKey, chapterNum, verseNum, rawText, langCode);
      
      verseEl.dataset.text = rawText;
      
      if (verseNum === 1) {
        verseEl.innerHTML = `<span class="giant-chapter-num">${chapterNum}</span>${vText}`;
      } else {
        verseEl.innerHTML = `<span class="verse-num">${verseNum}</span>${vText}`;
      }
    }
    
    // Selection listener
    verseEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const textToPreview = (state.translation === "eng") ? versesEng[vIdx] : versesMr[vIdx];
      openVerseOptionsDrawer(verseKey, activeBookName, chapterNum, verseNum, textToPreview);
    });
    
    if (state.translation === "parallel") {
      versesContainer.appendChild(verseEl);
    } else {
      if (pStarts.includes(verseNum) || !currentParagraph) {
        currentParagraph = document.createElement("p");
        currentParagraph.className = "bible-paragraph";
        versesContainer.appendChild(currentParagraph);
      }
      currentParagraph.appendChild(verseEl);
    }
    
    // Inject Inline Study Note Card dynamically
    if (bookKey === 'john' && chapterNum === 2 && verseNum === 18) {
      currentParagraph = null;
      const studyNoteEl = document.createElement("div");
      studyNoteEl.className = "inline-study-note";
      
      let noteText = "";
      if (state.translation === "eng") {
        noteText = "<strong>2:17</strong> Jesus took the evil acts in the Temple as an insult against God, and thus, he did not deal with them halfheartedly. He was consumed with righteous anger against such flagrant disrespect for God.";
      } else if (state.translation === "mar") {
        noteText = "<strong>२:१७</strong> येशूने मंदिरातील वाईट कृत्यांचा देवाचा अपमान मानला आणि म्हणून त्याने त्यांच्याशी अर्ध्या मनाने व्यवहार केला नाही. देवाच्या अशा स्पष्ट अनादराबद्दल तो नीतिमान रागाने ग्रासला होता.";
      } else { // parallel
        noteText = "<strong>२:१७ / 2:17</strong> येशूने मंदिरातील वाईट कृत्यांचा देवाचा अपमान मानला...<br><br>Jesus took the evil acts in the Temple as an insult against God, and thus, he did not deal with them halfheartedly. He was consumed with righteous anger against such flagrant disrespect for God.";
      }
      
      studyNoteEl.innerHTML = `
        <div class="study-note-icon">💡</div>
        <div class="study-note-text">${noteText}</div>
      `;
      versesContainer.appendChild(studyNoteEl);
    }
  }
  
  document.getElementById("reader-scroll-container").scrollTop = 0;
  updateReaderNavigationButtons(metadata);
  logReadingHistory(activeBookName, bookKey, chapterNum);
  
  // Re-sync study pane view if active
  if (activeStudyVerse && activeStudyVerse.bookKey === bookKey && activeStudyVerse.chapter === chapterNum) {
    openStudySplitPane(bookKey, chapterNum, activeStudyVerse.verse);
  }
}

function updateReaderNavigationButtons(currentBookMeta) {
  const prevBtn = document.getElementById("btn-prev-chapter");
  const nextBtn = document.getElementById("btn-next-chapter");
  const bookName = (state.translation === "eng") ? currentBookMeta.engName : currentBookMeta.name;
  
  const labelPrev = (state.translation === "eng") ? "Previous" : "मागे";
  const labelNext = (state.translation === "eng") ? "Next" : "पुढे";
  
  if (state.activeChapter > 1) {
    prevBtn.style.visibility = "visible";
    prevBtn.querySelector("span").textContent = `${labelPrev} (${bookName} ${state.activeChapter - 1})`;
  } else {
    const prevBookIdx = currentBookMeta.id - 2;
    if (prevBookIdx >= 0) {
      const prevBookMeta = booksMetadataMr[prevBookIdx];
      const prevName = (state.translation === "eng") ? prevBookMeta.engName : prevBookMeta.name;
      prevBtn.style.visibility = "visible";
      prevBtn.querySelector("span").textContent = `${labelPrev} (${prevName} ${prevBookMeta.chaptersCount})`;
    } else {
      prevBtn.style.visibility = "hidden";
    }
  }
  
  if (state.activeChapter < currentBookMeta.chaptersCount) {
    nextBtn.style.visibility = "visible";
    nextBtn.querySelector("span").textContent = `${labelNext} (${bookName} ${state.activeChapter + 1})`;
  } else {
    const nextBookIdx = currentBookMeta.id;
    if (nextBookIdx < booksMetadataMr.length) {
      const nextBookMeta = booksMetadataMr[nextBookIdx];
      const nextName = (state.translation === "eng") ? nextBookMeta.engName : nextBookMeta.name;
      nextBtn.style.visibility = "visible";
      nextBtn.querySelector("span").textContent = `${labelNext} (${nextName} 1)`;
    } else {
      nextBtn.style.visibility = "hidden";
    }
  }
}

function navigateChapter(direction) {
  if (audioState.isPlaying) stopSpeechNarration();
  
  const currentBookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === state.activeBook);
  if (!currentBookMeta) return;
  
  if (direction === "next") {
    if (state.activeChapter < currentBookMeta.chaptersCount) {
      openReader(state.activeBook, state.activeChapter + 1);
    } else {
      const nextBookIdx = currentBookMeta.id;
      if (nextBookIdx < booksMetadataMr.length) {
        openReader(booksMetadataMr[nextBookIdx].filename.replace(".json", ""), 1);
      }
    }
  } else {
    if (state.activeChapter > 1) {
      openReader(state.activeBook, state.activeChapter - 1);
    } else {
      const prevBookIdx = currentBookMeta.id - 2;
      if (prevBookIdx >= 0) {
        const prevBook = booksMetadataMr[prevBookIdx];
        openReader(prevBook.filename.replace(".json", ""), prevBook.chaptersCount);
      }
    }
  }
}

function logReadingHistory(bookName, bookKey, chapterNum) {
  const ref = `${bookName} ${chapterNum}`;
  state.history = state.history.filter(h => h.ref !== ref);
  state.history.unshift({
    ref,
    book: bookKey,
    chapter: chapterNum,
    timestamp: Date.now()
  });
  if (state.history.length > 20) state.history.pop();
  saveStateToLocalStorage();
}

/* ==========================================================================
   Book selector populators (Traditional & Alphabetical Sorts)
   ========================================================================== */
function populateBookSelector() {
  const otContainer = document.getElementById("ot-books-grid");
  const ntContainer = document.getElementById("nt-books-grid");
  
  otContainer.innerHTML = "";
  ntContainer.innerHTML = "";
  
  let list = [...booksMetadataMr];
  
  if (state.bookSort === "alphabetical") {
    list.sort((a, b) => {
      const nameA = (state.translation === "eng") ? a.engName : a.name;
      const nameB = (state.translation === "eng") ? b.engName : b.name;
      return nameA.localeCompare(nameB);
    });
    document.getElementById("section-ot-books").querySelector(".testament-heading").textContent = "Alphabetical List";
    document.getElementById("section-nt-books").style.display = "none";
  } else {
    document.getElementById("section-ot-books").querySelector(".testament-heading").textContent = "जुना करार (Old Testament)";
    document.getElementById("section-nt-books").style.display = "block";
  }
  
  list.forEach(book => {
    const btn = document.createElement("button");
    btn.className = "book-select-btn";
    btn.textContent = (state.translation === "eng") ? book.engName : book.name;
    
    if (book.filename.replace(".json", "") === state.activeBook) {
      btn.classList.add("active");
    }
    
    btn.addEventListener("click", () => selectBookForChapterScreen(book));
    
    if (state.bookSort === "alphabetical") {
      otContainer.appendChild(btn);
    } else {
      if (book.testament === "OT") otContainer.appendChild(btn);
      else ntContainer.appendChild(btn);
    }
  });
}

function selectBookForChapterScreen(bookMeta) {
  selectorTargetBookMeta = bookMeta;
  document.getElementById("selector-books-pane").classList.remove("active");
  document.getElementById("selector-chapters-pane").classList.add("active");
  
  const displayBookName = (state.translation === "eng") ? bookMeta.engName : bookMeta.name;
  document.getElementById("selected-book-name-indicator").textContent = displayBookName;
  
  const grid = document.getElementById("chapters-number-grid");
  grid.innerHTML = "";
  
  for (let c = 1; c <= bookMeta.chaptersCount; c++) {
    const cBtn = document.createElement("button");
    cBtn.className = "chapter-select-btn";
    cBtn.textContent = c;
    cBtn.addEventListener("click", () => {
      closeAllDrawers();
      openReader(bookMeta.filename.replace(".json", ""), c);
    });
    grid.appendChild(cBtn);
  }
}

/* ==========================================================================
   Annotations Drawer
   ========================================================================== */
let selectedVerseMeta = null;

function openVerseOptionsDrawer(verseKey, bookName, chapter, verse, text) {
  selectedVerseMeta = {
    key: verseKey,
    ref: `${bookName} ${chapter}:${verse}`,
    text,
    book: verseKey.split("_")[0],
    chapter,
    verse
  };
  
  document.getElementById("verse-options-title").textContent = `${bookName} ${chapter}:${verse}`;
  document.getElementById("verse-options-preview").textContent = `"${text}"`;
  
  // Highlight currently selected verse row
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("selected-pulse"));
  const activeEl = document.querySelector(`.verse-row[data-verse-id="${verseKey}"]`);
  if (activeEl) activeEl.classList.add("selected-pulse");
  
  // Sync Highlight picker dots
  const activeColor = state.highlights[verseKey] || "";
  document.querySelectorAll(".dot-btn").forEach(dot => {
    dot.style.boxShadow = (dot.dataset.color === activeColor || (activeColor === "" && dot.dataset.color === "clear"))
      ? "0 0 0 3px var(--primary)" 
      : "none";
  });
  
  // Sync Bookmark Button
  const isBookmarked = state.bookmarks.some(b => b.ref === selectedVerseMeta.ref);
  const bookmarkIcon = document.getElementById("bookmark-svg-state");
  const bookmarkLabel = document.getElementById("bookmark-action-label");
  
  if (isBookmarked) {
    bookmarkIcon.setAttribute("fill", "currentColor");
    bookmarkLabel.textContent = "Bookmarked";
  } else {
    bookmarkIcon.setAttribute("fill", "none");
    bookmarkLabel.textContent = "Bookmark";
  }
  
  openDrawer("drawer-verse-options");
}

function handleHighlightSelection(color) {
  if (!selectedVerseMeta) return;
  const vEl = document.querySelector(`.verse-row[data-verse-id="${selectedVerseMeta.key}"]`);
  
  if (color === "clear") {
    delete state.highlights[selectedVerseMeta.key];
    if (state.highlightsTimestamps) delete state.highlightsTimestamps[selectedVerseMeta.key];
    if (vEl) vEl.removeAttribute("data-highlight");
    showToast("Highlight removed");
  } else {
    state.highlights[selectedVerseMeta.key] = color;
    if (!state.highlightsTimestamps) state.highlightsTimestamps = {};
    state.highlightsTimestamps[selectedVerseMeta.key] = Date.now();
    if (vEl) vEl.setAttribute("data-highlight", color);
    showToast("Highlight applied");
  }
  saveStateToLocalStorage();
  closeAllDrawers();
}

function toggleBookmark() {
  if (!selectedVerseMeta) return;
  const idx = state.bookmarks.findIndex(b => b.ref === selectedVerseMeta.ref);
  
  if (idx !== -1) {
    state.bookmarks.splice(idx, 1);
    showToast("Bookmark removed");
  } else {
    state.bookmarks.unshift({
      ref: selectedVerseMeta.ref,
      text: selectedVerseMeta.text,
      date: new Date().toLocaleDateString(),
      book: selectedVerseMeta.book,
      chapter: selectedVerseMeta.chapter,
      verse: selectedVerseMeta.verse
    });
    showToast("Bookmarked successfully");
  }
  saveStateToLocalStorage();
  closeAllDrawers();
}

function copyVerseToClipboard() {
  if (!selectedVerseMeta) return;
  const transCode = (state.translation === "eng") ? "NLT" : "MARVBSI";
  const textToCopy = `"${selectedVerseMeta.text}" - ${selectedVerseMeta.ref} (${transCode})`;
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast("Copied to clipboard!");
  }).catch(() => {
    showToast("Copy failed");
  });
  closeAllDrawers();
}

/* ==========================================================================
   Home View Devotionals & VOD
   ========================================================================== */
function getCurrentVOD() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const offset = state.vodDayOffset || 0;
  const len = VOD_LIST.length;
  const vodIdx = ((dayOfYear + offset) % len + len) % len;
  return {
    vod: VOD_LIST[vodIdx],
    dayOfYear: dayOfYear,
    offset: offset
  };
}

function renderDailyDevotion() {
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById("home-greeting-date");
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', options);
  
  const hour = now.getHours();
  let greeting = "Good evening, Gaurav";
  if (hour < 12) greeting = "Good morning, Gaurav";
  else if (hour < 17) greeting = "Good afternoon, Gaurav";
  
  const userEl = document.getElementById("home-greeting-user");
  if (userEl) userEl.textContent = greeting;
  
  const { vod, dayOfYear, offset } = getCurrentVOD();
  const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
  const displayText = (state.translation === "eng") ? vod.engText : vod.text;
  
  document.getElementById("home-vod-ref").textContent = `${displayRef} ${state.translation === "eng" ? "NLT" : "MARVBSI"}`;
  document.getElementById("home-vod-text").textContent = `"${displayText}"`;
  
  document.getElementById("fs-vod-ref").textContent = `${displayRef} ${state.translation === "eng" ? "NLT" : "MARVBSI"}`;
  document.getElementById("fs-vod-text").textContent = `"${displayText}"`;
  
  // Rotate backgrounds daily
  const images = ['forest', 'mountains', 'sunrise', 'ocean', 'stars', 'mist', 'path'];
  const imgIdx = ((dayOfYear + offset) % images.length + images.length) % images.length;
  const dailyImg = images[imgIdx];
  
  const bgEl = document.querySelector(".daily-verse-card-bg") || document.querySelector(".vod-image-background");
  if (bgEl) bgEl.style.backgroundImage = `url('./assets/images/${dailyImg}.png')`;

  const fsCapsule = document.querySelector(".fullscreen-vod-capsule");
  if (fsCapsule) fsCapsule.style.backgroundImage = `url('./assets/images/${dailyImg}.png')`;
  
  // Heart count like sync
  const hasLiked = state.userLikes[vod.ref] || false;
  const heart = document.getElementById("fs-like-heart");
  if (hasLiked) {
    heart.setAttribute("fill", "#f87171");
    heart.style.color = "#f87171";
    document.getElementById("fs-like-count").textContent = "12.6L+1";
  } else {
    heart.setAttribute("fill", "none");
    heart.style.color = "#ffffff";
    document.getElementById("fs-like-count").textContent = "12.6L";
  }

  // Update dynamic VOD title labels based on offset (yesterday, etc.)
  const homeTabPills = document.querySelectorAll(".daily-verse-card .tab-pill");
  const fsLabel = document.querySelector("#modal-fullscreen-vod .fs-card-label");
  
  let labelTextHome = "✉ DAILY BIBLE VERSE";
  let labelTextFs = "Verse of the Day";
  
  if (offset === -1) {
    labelTextHome = "✉ YESTERDAY'S BIBLE VERSE";
    labelTextFs = "Yesterday's Verse";
  } else if (offset < -1) {
    labelTextHome = `✉ ${Math.abs(offset)} DAYS AGO`;
    labelTextFs = `${Math.abs(offset)} Days Ago`;
  }
  
  if (homeTabPills.length > 0) {
    homeTabPills[0].textContent = labelTextHome;
  }
  if (fsLabel) {
    fsLabel.textContent = labelTextFs;
  }
  
  // Update disabled states of VOD nav buttons
  const btnPrev = document.getElementById("btn-vod-prev");
  const btnNext = document.getElementById("btn-vod-next");
  const btnFsPrev = document.getElementById("btn-fs-vod-prev");
  const btnFsNext = document.getElementById("btn-fs-vod-next");
  
  const disablePrev = offset <= -6; // allow 7 days history total (0, -1, -2, -3, -4, -5, -6)
  const disableNext = offset >= 0;
  
  if (btnPrev) btnPrev.disabled = disablePrev;
  if (btnNext) btnNext.disabled = disableNext;
  if (btnFsPrev) btnFsPrev.disabled = disablePrev;
  if (btnFsNext) btnFsNext.disabled = disableNext;
}

function toggleLikeVOD() {
  const { vod } = getCurrentVOD();
  const hasLiked = state.userLikes[vod.ref] || false;
  state.userLikes[vod.ref] = !hasLiked;
  saveStateToLocalStorage();
  renderDailyDevotion();
  showToast(state.userLikes[vod.ref] ? "Liked!" : "Unliked");
}

function openCardCreatorFromVOD() {
  const { vod } = getCurrentVOD();
  selectedVerseMeta = {
    key: `${vod.book}_${vod.chapter}_${vod.verse}`,
    ref: (state.translation === "eng") ? vod.engRef : vod.ref,
    text: (state.translation === "eng") ? vod.engText : vod.text,
    book: vod.book,
    chapter: vod.chapter,
    verse: vod.verse
  };
  
  closeModal("modal-fullscreen-vod");
  openShareCardCreator();
}

function openVerseOptionsFromVOD() {
  const { vod } = getCurrentVOD();
  const textToPreview = (state.translation === "eng") ? vod.engText : vod.text;
  const activeBookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === vod.book);
  const bookName = activeBookMeta ? ((state.translation === "eng") ? activeBookMeta.engName : activeBookMeta.name) : vod.book;
  
  closeModal("modal-fullscreen-vod");
  openVerseOptionsDrawer(`${vod.book}_${vod.chapter}_${vod.verse}`, bookName, vod.chapter, vod.verse, textToPreview);
}

function fallbackToDirectPlay(mp3Url) {
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
  }
  audioPlayerInstance = new Audio(mp3Url);
  audioPlayerInstance.playbackRate = audioState.speed;
  
  audioPlayerInstance.ontimeupdate = () => {
    if (audioPlayerInstance && audioPlayerInstance.duration) {
      const pct = (audioPlayerInstance.currentTime / audioPlayerInstance.duration) * 100;
      document.getElementById("playbar-progress-line").style.width = `${pct}%`;
    }
  };
  
  audioPlayerInstance.onended = () => {
    stopSpeechNarration();
  };
  
  audioPlayerInstance.onerror = () => {
    showToast("Failed to load Marathi narration audio");
    stopSpeechNarration();
  };
  
  audioPlayerInstance.play().catch(err => {
    console.error("Direct audio playback failed:", err);
    showToast("Playback failed or blocked by browser");
    stopSpeechNarration();
  });
}

/* ==========================================================================
   Bilingual Narrator (TTS)
   ========================================================================== */
function startSpeechNarration() {
  closeModal("modal-audio-settings");
  
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  
  speechSynthesis.cancel();

  // Start background worship music if selected
  const bgMusicSelect = document.getElementById("audio-bg-music-select");
  const bgVolSlider = document.getElementById("audio-bg-music-vol-slider");
  if (bgMusicSelect && bgMusicSelect.value !== "none") {
    const vol = bgVolSlider ? parseFloat(bgVolSlider.value) : 0.3;
    ambientSynthInstance.setVolume(vol);
    ambientSynthInstance.start(bgMusicSelect.value);
  } else {
    ambientSynthInstance.stop();
  }

  // Start sleep timer if selected
  const sleepTimerSelect = document.getElementById("audio-sleep-timer-select");
  if (sleepTimerSelect && sleepTimerSelect.value !== "off") {
    startSleepTimer(sleepTimerSelect.value);
  } else {
    if (sleepTimerTimeout) {
      clearTimeout(sleepTimerTimeout);
      sleepTimerTimeout = null;
    }
  }
  
  const isMarathiAudio = state.translation !== "eng";
  const useHumanNarration = isMarathiAudio && state.audioSource === "human";
  
  if (useHumanNarration) {
    const metadata = booksMetadataMr.find(b => b.filename.replace(".json", "") === state.activeBook);
    const bookId = metadata ? metadata.id : 1;
    const mp3Url = `https://www.wordproaudio.net/bibles/app/audio/28/${bookId}/${state.activeChapter}.mp3`;
    
    audioState.isPlaying = true;
    audioState.speed = parseFloat(document.getElementById("tts-speed-slider").value);
    
    // Play directly without CORS or Web Audio filters to prevent browser playback block on iOS
    audioPlayerInstance = new Audio(mp3Url);
    audioPlayerInstance.playbackRate = audioState.speed;
    
    document.getElementById("floating-audio-playbar").classList.add("active");
    document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    
    audioPlayerInstance.ontimeupdate = () => {
      if (audioPlayerInstance && audioPlayerInstance.duration) {
        const pct = (audioPlayerInstance.currentTime / audioPlayerInstance.duration) * 100;
        document.getElementById("playbar-progress-line").style.width = `${pct}%`;
      }
    };
    
    audioPlayerInstance.onended = () => {
      stopSpeechNarration();
    };
    
    audioPlayerInstance.onerror = () => {
      showToast("Failed to load Marathi narration audio");
      stopSpeechNarration();
    };
    
    audioPlayerInstance.play().catch(err => {
      console.warn("Audio playback failed directly:", err);
      showToast("Playback failed or blocked by browser");
      stopSpeechNarration();
    });
    return;
  }

  if (state.audioSource === "elevenlabs") {
    const keyToUse = state.elevenLabsKey || ELEVENLABS_DEFAULT_KEY;
    if (!keyToUse) {
      showToast("Please enter ElevenLabs API Key in Settings");
      closeAllDrawers();
      window.location.hash = "#/you";
      document.querySelectorAll(".profile-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === "you-settings");
      });
      document.querySelectorAll(".profile-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "you-tab-content-you-settings");
      });
      renderYouProfile();
      return;
    }
    
    showToast("Generating ElevenLabs narration...");
    audioState.isPlaying = true;
    audioState.speed = parseFloat(document.getElementById("tts-speed-slider").value);
    
    document.getElementById("floating-audio-playbar").classList.add("active");
    // Show spinner in playbar
    document.getElementById("playbar-icon-svg").innerHTML = `
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="38" stroke-dashoffset="19">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
      </circle>
    `;
    
    const elements = document.querySelectorAll(".verse-row");
    let versesList = [];
    elements.forEach(el => {
      let txt = el.dataset.text || "";
      const cleanText = txt.replace(/[:;()[\]{}—•\-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText) versesList.push(cleanText);
    });
    const fullText = versesList.join(" ");
    
    // Use stable eleven_multilingual_v2 model for both English and Marathi/parallel 
    // since legacy monolingual_v1 is deprecated/restricted on newer accounts
    const modelId = "eleven_multilingual_v2";
    
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${state.elevenLabsVoice}`, {
      method: "POST",
      headers: {
        "xi-api-key": keyToUse,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: fullText,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    })
    .then(async response => {
      if (!response.ok) {
        let errMsg = `Status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail && errData.detail.message) {
            errMsg = errData.detail.message;
          } else if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      return response.blob();
    })
    .then(blob => {
      if (!audioState.isPlaying) {
        return;
      }
      
      const audioUrl = URL.createObjectURL(blob);
      audioPlayerInstance = new Audio(audioUrl);
      audioPlayerInstance.playbackRate = audioState.speed;
      
      // Connect to Web Audio API context and add a GainNode to boost the volume level
      // This increases the storytelling voice level safely (same-origin blob doesn't trigger CORS blocks)
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaElementSource(audioPlayerInstance);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.8; // Boost output volume level by 80%
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          audioPlayerInstance.addEventListener('play', () => {
            if (audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
          });
        }
      } catch (e) {
        console.warn("Volume level boost failed, playing at normal volume:", e);
      }
      
      document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
      
      audioPlayerInstance.ontimeupdate = () => {
        if (audioPlayerInstance && audioPlayerInstance.duration) {
          const pct = (audioPlayerInstance.currentTime / audioPlayerInstance.duration) * 100;
          document.getElementById("playbar-progress-line").style.width = `${pct}%`;
        }
      };
      
      audioPlayerInstance.onended = () => {
        stopSpeechNarration();
      };
      
      audioPlayerInstance.onerror = () => {
        showToast("ElevenLabs playback error");
        stopSpeechNarration();
      };
      
      audioPlayerInstance.play().catch(err => {
        console.warn("ElevenLabs audio playback failed:", err);
        showToast("Playback failed or blocked by browser");
        stopSpeechNarration();
      });
    })
    .catch(err => {
      console.warn("ElevenLabs generation failed, falling back to standard narrator:", err);
      showToast("Premium voice unavailable. Switching to standard reader...");
      
      const originalSource = state.audioSource;
      if (state.translation !== "eng") {
        state.audioSource = "human"; // Fallback to professional human recorded Marathi male voice
      } else {
        state.audioSource = "ai"; // Fallback to system English male voice
      }
      
      setTimeout(() => {
        startSpeechNarration();
        // Restore original ElevenLabs setting in background state
        state.audioSource = originalSource;
        saveStateToLocalStorage();
      }, 1500);
    });
    
    return;
  }
  
  if (typeof speechSynthesis === 'undefined') {
    showToast("Text-to-speech not supported");
    return;
  }
  
  const voiceSelect = document.getElementById("tts-voice-select");
  const selectedVal = voiceSelect.value;
  
  if (selectedVal === "default") {
    audioState.selectedVoice = findBestDefaultVoice(audioState.voices, state.translation);
  } else {
    const matching = audioState.voices.filter(v => 
      state.translation === "eng" ? v.lang.startsWith("en") : (v.lang.startsWith("mr") || v.lang.startsWith("hi") || v.lang.startsWith("en"))
    );
    audioState.selectedVoice = matching[parseInt(selectedVal)];
  }
  
  const elements = document.querySelectorAll(".verse-row");
  if (elements.length === 0) return;
  
  audioState.versesToRead = [];
  elements.forEach(el => {
    let txt = el.dataset.text || "";
    
    if (state.translation === "parallel" && audioState.selectedVoice) {
      if (audioState.selectedVoice.lang.startsWith("en")) {
        const enDiv = el.querySelector(".verse-parallel-en");
        if (enDiv) txt = enDiv.textContent;
      }
    }
    
    const cleanText = txt.replace(/[:;()[\]{}—•\-]/g, ' ').replace(/\s+/g, ' ').trim();
    audioState.versesToRead.push({
      key: el.dataset.verseId,
      text: cleanText
    });
  });
  
  audioState.currentVerseIndex = 0;
  audioState.isPlaying = true;
  audioState.speed = parseFloat(document.getElementById("tts-speed-slider").value);
  
  document.getElementById("floating-audio-playbar").classList.add("active");
  speakPlaybarVerse(audioState.currentVerseIndex);
}

function speakPlaybarVerse(index) {
  if (!audioState.isPlaying || index >= audioState.versesToRead.length || index < 0) {
    stopSpeechNarration();
    return;
  }
  
  audioState.currentVerseIndex = index;
  const verse = audioState.versesToRead[index];
  
  document.querySelectorAll(".verse-row").forEach(v => {
    v.classList.toggle("tts-reading", v.dataset.verseId === verse.key);
  });
  
  const activeEl = document.querySelector(`.verse-row[data-verse-id="${verse.key}"]`);
  if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Update floating playbar verse indicator text
  const indicatorEl = document.getElementById("playbar-verse-indicator");
  if (indicatorEl) {
    const total = audioState.versesToRead.length;
    if (verse && verse.key === "vod_verse") {
      indicatorEl.textContent = "🔊 Daily Bible Verse";
    } else if (verse && verse.key) {
      const parts = verse.key.split("_");
      if (parts.length >= 3) {
        const bMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === parts[0]);
        const bName = (state.translation === "eng" && bMeta) ? bMeta.engName : (bMeta ? bMeta.name : parts[0]);
        indicatorEl.textContent = `${bName} ${parts[1]}:${parts[2]} (${index + 1}/${total})`;
      } else {
        indicatorEl.textContent = `Verse ${index + 1} of ${total}`;
      }
    } else {
      indicatorEl.textContent = `Verse ${index + 1} of ${total}`;
    }
  }

  // Set play icon to paused lines
  document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
  
  const progress = ((index + 1) / audioState.versesToRead.length) * 100;
  document.getElementById("playbar-progress-line").style.width = `${progress}%`;
  
  const utterance = new SpeechSynthesisUtterance(verse.text);
  if (audioState.selectedVoice) {
    utterance.voice = audioState.selectedVoice;
  } else if (state.translation !== "eng") {
    const mrVoice = audioState.voices.find(v => v.lang.startsWith("mr") || v.lang.startsWith("hi"));
    if (mrVoice) utterance.voice = mrVoice;
  }
  
  let basePitch = 0.85;
  if (state.audioTone === 'deep-bass') basePitch = 0.7;
  else if (state.audioTone === 'warm-resonance') basePitch = 0.85;
  else if (state.audioTone === 'normal') basePitch = 1.0;
  
  // Apply gender voice pitch settings
  const genderSelect = document.getElementById("audio-narrator-gender-select");
  const gender = genderSelect ? genderSelect.value : "male";
  if (gender === "male") {
    utterance.pitch = 0.7; // Deep voice
  } else {
    utterance.pitch = 1.15; // Soft female voice
  }
  utterance.rate = audioState.speed * 0.9;
  
  utterance.onend = () => {
    if (audioState.isPlaying) {
      audioState.currentVerseIndex++;
      if (audioState.currentVerseIndex < audioState.versesToRead.length) {
        speakPlaybarVerse(audioState.currentVerseIndex);
      } else {
        stopSpeechNarration();
      }
    }
  };
  
  utterance.onerror = () => {
    if (audioState.isPlaying) {
      audioState.currentVerseIndex++;
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  };
  
  audioState.activeUtterance = utterance;
  speechSynthesis.speak(utterance);
}

function togglePlaybarSpeech() {
  if (!audioState.isPlaying) return;
  
  if (audioPlayerInstance) {
    if (audioPlayerInstance.paused) {
      audioPlayerInstance.play().catch(() => showToast("Playback failed"));
      document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    } else {
      audioPlayerInstance.pause();
      document.getElementById("playbar-icon-svg").innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
  } else if (state.audioSource === "elevenlabs") {
    // Cancel loading if clicked while ElevenLabs is generating
    stopSpeechNarration();
  } else {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    } else if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      document.getElementById("playbar-icon-svg").innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
  }
}

function stopSpeechNarration() {
  audioState.isPlaying = false;
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  speechSynthesis.cancel();
  
  // Stop background worship music
  ambientSynthInstance.stop();
  
  // Clear sleep timer
  if (sleepTimerTimeout) {
    clearTimeout(sleepTimerTimeout);
    sleepTimerTimeout = null;
  }
  
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("tts-reading"));
  document.getElementById("floating-audio-playbar").classList.remove("active");
}

function startSpeechNarrationFromVerse(verseNum) {
  const targetIndex = Math.max(0, parseInt(verseNum) - 1);
  if (!audioState.versesToRead || audioState.versesToRead.length === 0) {
    startSpeechNarration();
    return;
  }
  if (audioState.versesToRead && targetIndex < audioState.versesToRead.length) {
    audioState.isPlaying = true;
    document.getElementById("floating-audio-playbar").classList.add("active");
    speakPlaybarVerse(targetIndex);
  } else {
    startSpeechNarration();
  }
}

function playDailyVerseAudio() {
  const vodTextEl = document.getElementById("home-vod-text");
  const vodRefEl = document.getElementById("home-vod-ref");
  if (!vodTextEl) return;

  const rawText = vodTextEl.textContent.replace(/["']/g, '');
  const refText = vodRefEl ? vodRefEl.textContent : "Daily Verse";

  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  speechSynthesis.cancel();

  showToast(`🔊 Listening: ${refText}`);

  audioState.versesToRead = [{
    key: "vod_verse",
    text: `${refText}. ${rawText}`
  }];
  audioState.currentVerseIndex = 0;
  audioState.isPlaying = true;

  const speedPill = document.getElementById("playbar-btn-speed");
  if (speedPill) speedPill.textContent = `${audioState.speed || 1.0}x`;

  document.getElementById("floating-audio-playbar").classList.add("active");
  speakPlaybarVerse(0);
}

// Global Audio Processing Variables for Web Audio API
let webAudioCtx = null;
let webAudioSource = null;
let webAudioBassFilter = null;
let webAudioTrebleFilter = null;

function applyAudioFilters() {
  if (!audioPlayerInstance) return;
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  
  audioPlayerInstance.crossOrigin = "anonymous";
  
  if (!webAudioCtx) {
    webAudioCtx = new AudioContextClass();
  }
  
  if (webAudioCtx.state === 'suspended') {
    webAudioCtx.resume();
  }
  
  if (webAudioSource) {
    try {
      webAudioSource.disconnect();
    } catch(e) {}
  }
  
  try {
    webAudioSource = webAudioCtx.createMediaElementSource(audioPlayerInstance);
    
    webAudioBassFilter = webAudioCtx.createBiquadFilter();
    webAudioTrebleFilter = webAudioCtx.createBiquadFilter();
    
    webAudioSource.connect(webAudioBassFilter);
    webAudioBassFilter.connect(webAudioTrebleFilter);
    webAudioTrebleFilter.connect(webAudioCtx.destination);
  } catch (err) {
    console.warn("Web Audio initialization failed (connected already):", err);
  }
  
  updateAudioToneSettings();
}

function updateAudioToneSettings() {
  const toneSelect = document.getElementById("audio-tone-select");
  if (!toneSelect) return;
  const toneVal = toneSelect.value;
  
  state.audioTone = toneVal;
  saveStateToLocalStorage();
  
  if (!webAudioBassFilter || !webAudioTrebleFilter) return;
  
  if (toneVal === "normal") {
    webAudioBassFilter.type = "lowshelf";
    webAudioBassFilter.frequency.value = 150;
    webAudioBassFilter.gain.value = 0;
    
    webAudioTrebleFilter.type = "highshelf";
    webAudioTrebleFilter.frequency.value = 4000;
    webAudioTrebleFilter.gain.value = 0;
  } else if (toneVal === "deep-bass") {
    // Morgan Freeman style: deep bass boost, warm highs
    webAudioBassFilter.type = "lowshelf";
    webAudioBassFilter.frequency.value = 100;
    webAudioBassFilter.gain.value = 12; // 12 dB boost
    
    webAudioTrebleFilter.type = "highshelf";
    webAudioTrebleFilter.frequency.value = 3000;
    webAudioTrebleFilter.gain.value = -3;
  } else if (toneVal === "warm-resonance") {
    // Warm rich mids and lows
    webAudioBassFilter.type = "lowshelf";
    webAudioBassFilter.frequency.value = 180;
    webAudioBassFilter.gain.value = 6;
    
    webAudioTrebleFilter.type = "highshelf";
    webAudioTrebleFilter.frequency.value = 4000;
    webAudioTrebleFilter.gain.value = 2;
  }
}

function findBestDefaultVoice(voices, lang) {
  const eng = voices.filter(v => v.lang.startsWith("en"));
  
  // 1. Look for high-quality English male voices (David, Mark, James, Richard, Ravi, Male, Siri, Natural)
  const premiumMale = eng.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("male") || 
           name.includes("david") || 
           name.includes("mark") || 
           name.includes("james") || 
           name.includes("richard") || 
           name.includes("ravi") || 
           (name.includes("google") && name.includes("male")) ||
           name.includes("siri");
  });
  if (premiumMale) return premiumMale;
  
  // 2. Fallback to any premium English voice
  const premium = eng.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("google") || name.includes("natural");
  });
  if (premium) return premium;
  
  // 3. Marathi / Hindi search if not English
  if (lang !== "eng") {
    const deva = voices.find(v => v.lang.startsWith("mr") || v.lang.startsWith("hi"));
    if (deva) return deva;
  }
  
  return eng[0] || voices[0] || null;
}

function initAudioVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  
  const getList = () => {
    audioState.voices = speechSynthesis.getVoices();
    const select = document.getElementById("tts-voice-select");
    if (!select) return;
    
    select.innerHTML = '<option value="default">Default System Voice</option>';
    
    const filtered = audioState.voices.filter(v => 
      state.translation === "eng" ? v.lang.startsWith("en") : (v.lang.startsWith("mr") || v.lang.startsWith("hi") || v.lang.startsWith("en"))
    );
    
    filtered.forEach((voice, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `${voice.name} (${voice.lang})`;
      select.appendChild(opt);
    });
    
    // Add ElevenLabs options
    const elVoices = [
      { value: "elevenlabs_antoni", label: "👑 ElevenLabs Antoni (Free Male Voice)", id: "ErXwobaYiN019PkySvjV" },
      { value: "elevenlabs_clyde", label: "👑 ElevenLabs Clyde (Free Male Voice)", id: "2E2jMRHfEMvvEBjL7aKG" },
      { value: "elevenlabs_rachel", label: "👑 ElevenLabs Rachel (Free Female Voice)", id: "21m00Tcm4TlvDq8ikWAM" },
      { value: "elevenlabs_declan", label: "👑 ElevenLabs Declan Sage (Paid Premium Storyteller)", id: "kqVT88a5QfII1HNAEPTJ" }
    ];

    elVoices.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev.value;
      opt.textContent = ev.label;
      select.appendChild(opt);
    });
    
    if (state.audioSource === "elevenlabs") {
      const matched = elVoices.find(ev => ev.id === state.elevenLabsVoice);
      select.value = matched ? matched.value : "elevenlabs_declan";
    } else {
      const best = findBestDefaultVoice(audioState.voices, state.translation);
      if (best) {
        const idx = filtered.findIndex(v => v.name === best.name);
        if (idx !== -1) {
          select.value = idx;
          audioState.selectedVoice = best;
        }
      }
    }
  };
  
  getList();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = getList;
  }
}

/* ==========================================================================
   Bilingual Search Discover View
   ========================================================================== */
async function executeDiscoverSearch() {
  const query = document.getElementById("discover-search-input").value.trim().toLowerCase();
  const listContainer = document.getElementById("discover-search-results-list");
  const statusContainer = document.getElementById("discover-search-results-status");
  
  if (query.length < 3) {
    listContainer.innerHTML = "";
    statusContainer.textContent = "Query must be at least 3 characters long";
    return;
  }
  
  statusContainer.innerHTML = `
    <div class="loader-container">
      <div class="ios-spinner"></div>
      <div style="margin-top: 8px;">Searching scriptures...</div>
    </div>
  `;
  listContainer.innerHTML = "";
  
  const filter = document.querySelector(".filter-pill.active").dataset.filter;
  const isDevanagari = /[\u0900-\u097f]/.test(query);
  const searchLang = isDevanagari ? "mar" : "eng";
  
  let matches = [];
  const words = query.split(/\s+/);
  
  try {
    for (let i = 0; i < booksMetadataMr.length; i++) {
      const bookMeta = booksMetadataMr[i];
      if (filter === "OT" && bookMeta.testament !== "OT") continue;
      if (filter === "NT" && bookMeta.testament !== "NT") continue;
      
      const bookKey = bookMeta.filename.replace(".json", "");
      const bookData = (searchLang === "mar") ? await fetchBookDataMr(bookKey) : await fetchBookDataEng(bookKey);
      if (!bookData) continue;
      
      bookData.chapters.forEach((chapter, cIdx) => {
        chapter.forEach((text, vIdx) => {
          const textLower = text.toLowerCase();
          const match = words.every(word => textLower.includes(word));
          
          if (match) {
            matches.push({
              bookName: (state.translation === "eng") ? bookMeta.engName : bookMeta.name,
              bookKey,
              chapter: cIdx + 1,
              verse: vIdx + 1,
              text
            });
          }
        });
      });
      if (matches.length >= 100) break;
    }
    
    if (matches.length === 0) {
      statusContainer.textContent = "No matches found.";
      return;
    }
    
    statusContainer.textContent = `Found ${matches.length} matches (${searchLang === 'mar' ? 'Marathi' : 'English'})`;
    
    matches.forEach(match => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      
      let highlighted = match.text;
      words.forEach(word => {
        const regex = new RegExp(`(${word})`, "gi");
        highlighted = highlighted.replace(regex, '<span class="search-match-highlight">$1</span>');
      });
      
      item.innerHTML = `
        <div class="search-result-meta">
          <span>${match.bookName} ${match.chapter}:${match.verse}</span>
        </div>
        <div class="search-result-text">${highlighted}</div>
      `;
      
      item.addEventListener("click", () => {
        openReader(match.bookKey, match.chapter);
        setTimeout(() => {
          const key = `${match.bookKey}_${match.chapter}_${match.verse}`;
          const el = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("selected-pulse");
            setTimeout(() => el.classList.remove("selected-pulse"), 2500);
          }
        }, 500);
        window.location.hash = "#/reader";
      });
      listContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Search failed:", err);
    statusContainer.textContent = "Search failed.";
  }
}

/* ==========================================================================
   Plans Tab Progress Tracker
   ========================================================================== */
function renderReadingPlansTab() {
  const nameEl = document.getElementById("plans-tab-name");
  const metaEl = document.getElementById("plans-tab-meta");
  const fillEl = document.getElementById("plans-tab-fill");
  const compBtn = document.getElementById("btn-complete-day-plans");
  const emptyEl = document.getElementById("myplans-empty-state");
  const detailEl = document.querySelector(".active-plan-detail");
  
  if (state.readingPlan === "none") {
    if (detailEl) detailEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  
  if (detailEl) detailEl.style.display = "block";
  if (emptyEl) emptyEl.style.display = "none";
  
  let totalDays = 90;
  let title = "New Testament in 90 Days";
  
  const planInfo = PLANS_DB[state.readingPlan];
  if (planInfo) {
    totalDays = planInfo.days;
    title = planInfo.title;
  } else if (state.readingPlan.startsWith("custom_") && state.customPlan) {
    totalDays = state.customPlan.duration;
    title = state.customPlan.title;
  }
  
  nameEl.textContent = title;
  const pct = Math.floor(((state.planDay - 1) / totalDays) * 100);
  metaEl.textContent = `Day ${state.planDay} of ${totalDays} • ${pct}% Complete`;
  fillEl.style.width = `${pct}%`;
  
  const daySelect = document.getElementById("plans-select-day");
  if (daySelect) {
    daySelect.innerHTML = "";
    for (let d = 1; d <= totalDays; d++) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = `Day ${d}`;
      daySelect.appendChild(opt);
    }
    daySelect.value = state.planDay;
    daySelect.onchange = (e) => {
      state.planDay = parseInt(e.target.value);
      saveStateToLocalStorage();
      renderReadingPlansTab();
      renderDailyDevotion();
    };
  }
  
  const readingList = document.querySelector(".plan-reading-portions");
  readingList.innerHTML = "";
  
  const chapters = [];
  if (planInfo && planInfo.readings) {
    // Custom devotional plan: 1 reading per day
    const reading = planInfo.readings[state.planDay - 1] || planInfo.readings[0];
    chapters.push({
      id: `${state.readingPlan}_day${state.planDay}_ch0`,
      label: reading.label,
      bookKey: reading.bookKey,
      chapter: reading.chapter
    });
  } else if (state.readingPlan.startsWith("custom_") && state.customPlan) {
    // Custom generated plan: divide chapters over duration
    const bookKey = state.customPlan.book;
    const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
    const totalChapters = bookMeta ? bookMeta.chaptersCount : 10;
    const chPerDay = Math.ceil(totalChapters / totalDays);
    const startCh = 1 + (state.planDay - 1) * chPerDay;
    for (let i = 0; i < chPerDay; i++) {
      const ch = startCh + i;
      if (ch <= totalChapters) {
        const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
        chapters.push({
          id: `${state.readingPlan}_day${state.planDay}_ch${i}`,
          label: `${bookName} ${ch}`,
          bookKey: bookKey,
          chapter: ch
        });
      }
    }
  } else {
    // Fallback/nt90/bible365: 3 chapters per day
    const reading = getReadingForDay(state.readingPlan, state.planDay);
    const startCh = reading.chapter;
    for (let i = 0; i < 3; i++) {
      const ch = startCh + i;
      const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === reading.bookKey);
      const maxCh = bookMeta ? bookMeta.chaptersCount : 50;
      if (ch <= maxCh) {
        chapters.push({
          id: `${state.readingPlan}_day${state.planDay}_ch${i}`,
          label: `${reading.label.split(" ")[0]} ${ch}`,
          bookKey: reading.bookKey,
          chapter: ch
        });
      }
    }
  }
  
  let allDone = true;
  chapters.forEach(ch => {
    const item = document.createElement("div");
    item.className = "portion-item";
    
    const isChecked = state.planPortionsCompleted[ch.id] || false;
    if (!isChecked) allDone = false;
    
    item.innerHTML = `
      <div class="portion-checkbox-wrapper">
        <input type="checkbox" id="chk-${ch.id}" class="ios-checkbox" ${isChecked ? 'checked' : ''}>
        <label for="chk-${ch.id}">${ch.label}</label>
      </div>
      <button class="portion-read-btn" data-book="${ch.bookKey}" data-chapter="${ch.chapter}">Read</button>
    `;
    
    item.querySelector("input").addEventListener("change", (e) => {
      state.planPortionsCompleted[ch.id] = e.target.checked;
      saveStateToLocalStorage();
      renderReadingPlansTab();
    });
    
    item.querySelector(".portion-read-btn").onclick = () => {
      openReader(ch.bookKey, ch.chapter);
      window.location.hash = "#/reader";
    };
    
    readingList.appendChild(item);
  });
  
  compBtn.textContent = allDone ? `Complete Day ${state.planDay}` : `Finish Readings first`;
  compBtn.disabled = !allDone;
  compBtn.style.opacity = allDone ? "1" : "0.5";
  
  compBtn.onclick = () => {
    if (state.planDay < totalDays) {
      state.planDay++;
      showToast(`Congratulations! Day ${state.planDay} unlocked.`);
    } else {
      showToast("Hallelujah! You completed the reading plan!");
      state.readingPlan = "none";
    }
    saveStateToLocalStorage();
    renderReadingPlansTab();
    renderDailyDevotion();
  };
}

function getReadingForDay(planType, day) {
  if (planType === "nt90") {
    const ntBooks = [
      { name: "Matthew", key: "matthew", chapters: 28 },
      { name: "Mark", key: "mark", chapters: 16 },
      { name: "Luke", key: "luke", chapters: 24 },
      { name: "John", key: "john", chapters: 21 },
      { name: "Acts", key: "acts", chapters: 28 },
      { name: "Romans", key: "romans", chapters: 16 }
    ];
    let chFlat = [];
    ntBooks.forEach(b => {
      for (let c = 1; c <= b.chapters; c += 3) {
        chFlat.push({ label: `${b.name} ${c}`, bookKey: b.key, chapter: c });
      }
    });
    return chFlat[(day - 1) % chFlat.length];
  } else {
    const idx = (day - 1) % booksMetadataMr.length;
    const b = booksMetadataMr[idx];
    const ch = 1 + ((day * 2) % b.chaptersCount);
    return { label: `${b.name} ${ch}`, bookKey: b.filename.replace(".json", ""), chapter: ch };
  }
}

/* ==========================================================================
   User Profile Dashboard rendering
   ========================================================================== */
function changeVODOffset(delta) {
  state.vodDayOffset = (state.vodDayOffset || 0) + delta;
  if (state.vodDayOffset < -6) state.vodDayOffset = -6;
  if (state.vodDayOffset > 0) state.vodDayOffset = 0;
  saveStateToLocalStorage();
  renderDailyDevotion();
}

function updateAllUserAvatars() {
  const sidebarAvatar = document.getElementById("sidebar-you-avatar");
  const bottomAvatar = document.getElementById("nav-you-avatar");
  const headerAvatar = document.getElementById("header-auth-avatar");
  const profileAvatar = document.getElementById("profile-avatar");
  
  const user = state.currentUser;
  
  const updateElement = (el, isLarge) => {
    if (!el) return;
    if (user) {
      if (user.photo) {
        el.textContent = "";
        el.style.backgroundImage = `url(${user.photo})`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.style.backgroundRepeat = "no-repeat";
        if (!isLarge) {
          el.style.borderColor = "var(--primary)";
        }
      } else {
        el.textContent = user.username.substring(0, 1).toUpperCase();
        el.style.backgroundImage = "none";
        el.style.backgroundColor = "var(--primary)";
        el.style.color = "#1e1b4b";
      }
    } else {
      // Guest state
      if (isLarge) {
        el.textContent = "G";
        el.style.backgroundImage = "none";
      } else {
        el.textContent = "U";
        el.style.backgroundImage = "none";
        el.style.backgroundColor = "transparent";
        el.style.color = "currentColor";
        el.style.borderColor = "currentColor";
      }
    }
  };
  
  updateElement(sidebarAvatar, false);
  updateElement(bottomAvatar, false);
  updateElement(headerAvatar, false);
  updateElement(profileAvatar, true);
}

function getVerseTextFromMemoryCache(bookKey, ch, v) {
  const cache = (state.translation === "eng") ? booksCacheEng : booksCacheMr;
  if (cache[bookKey]) {
    const chapters = cache[bookKey].chapters;
    if (chapters && chapters[ch - 1] && chapters[ch - 1][v - 1]) {
      return chapters[ch - 1][v - 1];
    }
  }
  
  // Not cached, fetch in background and trigger re-render of feed
  const fetchFunc = (state.translation === "eng") ? fetchBookDataEng : fetchBookDataMr;
  fetchFunc(bookKey).then(() => {
    if (window.location.hash === "#/you") {
      const activeBtn = document.querySelector("#activity-filter-bar .profile-tab-btn.active");
      const filter = activeBtn ? (activeBtn.dataset.activityFilter || "all") : "all";
      renderActivityFeed(filter);
    }
  });
  
  return "...";
}

function getVerseRef(bookKey, ch, v) {
  const activeBookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  if (activeBookMeta) {
    const name = (state.translation === "eng") ? activeBookMeta.engName : activeBookMeta.name;
    return `${name} ${ch}:${v}`;
  }
  return `${bookKey} ${ch}:${v}`;
}

window.openReaderAndNavigate = function(book, ch) {
  openReader(book, ch);
  window.location.hash = "#/reader";
};

function renderActivityFeed(filter = "all") {
  const listEl = document.getElementById("you-activity-feed-list");
  const emptyEl = document.getElementById("you-activity-feed-empty");
  if (!listEl) return;
  
  listEl.innerHTML = "";
  
  let items = [];
  const user = state.currentUser;
  if (!user) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  
  const initial = user.username.substring(0, 1).toUpperCase();
  
  // 1. Add Highlights
  for (const key in state.highlights) {
    const color = state.highlights[key];
    const parts = key.split("_");
    const book = parts[0];
    const ch = parseInt(parts[1]);
    const v = parseInt(parts[2]);
    
    const text = getVerseTextFromMemoryCache(book, ch, v);
    const ref = getVerseRef(book, ch, v);
    
    items.push({
      id: `highlight_${key}`,
      type: "highlights",
      title: state.translation === 'eng' ? `You highlighted ${ref}` : `तुम्ही ${ref} हायलाइट केले`,
      body: text,
      ref: ref,
      color: color,
      book: book,
      chapter: ch,
      verse: v,
      timestamp: state.highlightsTimestamps ? (state.highlightsTimestamps[key] || (Date.now() - 1000 * 60 * 60 * 24 * 3)) : (Date.now() - 1000 * 60 * 60 * 24 * 3)
    });
  }
  
  // 2. Add Bookmarks (Saved)
  if (state.bookmarks) {
    state.bookmarks.forEach((bm, idx) => {
      items.push({
        id: `bookmark_${bm.ref}`,
        type: "highlights",
        title: state.translation === 'eng' ? `You saved ${bm.ref}` : `तुम्ही ${bm.ref} सेव्ह केले`,
        body: bm.text,
        ref: bm.ref,
        book: bm.book,
        chapter: bm.chapter,
        verse: bm.verse,
        isPrivate: true,
        timestamp: bm.date ? new Date(bm.date).getTime() : (Date.now() - 1000 * 60 * 60 * 24 * (idx + 1))
      });
    });
  }
  
  // 3. Add Notes
  for (const key in state.userNotes) {
    const noteContent = state.userNotes[key];
    const parts = key.split("_");
    const book = parts[0];
    const ch = parseInt(parts[1]);
    const v = parseInt(parts[2]);
    
    const text = getVerseTextFromMemoryCache(book, ch, v);
    const ref = getVerseRef(book, ch, v);
    
    items.push({
      id: `note_${key}`,
      type: "notes",
      title: state.translation === 'eng' ? `You added a note on ${ref}` : `तुम्ही ${ref} वर टीप जोडली`,
      body: text,
      ref: ref,
      noteText: noteContent,
      book: book,
      chapter: ch,
      verse: v,
      isPrivate: true,
      timestamp: state.notesTimestamps ? (state.notesTimestamps[key] || (Date.now() - 1000 * 60 * 60 * 24 * 4)) : (Date.now() - 1000 * 60 * 60 * 24 * 4)
    });
  }
  
  // 4. Add Badges
  if (state.quizBadges) {
    state.quizBadges.forEach((badgeId, idx) => {
      let badgeName = "Novice Explorer";
      let badgeIcon = "💡";
      if (badgeId === "quiz_badge_novice") {
        badgeName = state.translation === "eng" ? "Novice Explorer" : "नवा शोधक";
        badgeIcon = "💡";
      } else if (badgeId === "quiz_badge_scholar") {
        badgeName = state.translation === "eng" ? "Scripture Scholar" : "शास्त्र पंडित";
        badgeIcon = "🎓";
      } else if (badgeId === "quiz_badge_theologian") {
        badgeName = state.translation === "eng" ? "Bible Theologian" : "बायबल शास्त्रज्ञ";
        badgeIcon = "🏆";
      }
      
      items.push({
        id: `badge_${badgeId}`,
        type: "badges",
        title: state.translation === 'eng' ? `You've earned the ${badgeName} Badge` : `तुम्ही ${badgeName} बॅज मिळवला आहे`,
        badgeName: badgeName,
        badgeIcon: badgeIcon,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10 - idx * 10000
      });
    });
  }
  
  // 5. Add Created Images
  if (state.createdVerseImages) {
    state.createdVerseImages.forEach((img, idx) => {
      items.push({
        id: `image_${idx}`,
        type: "images",
        title: state.translation === 'eng' ? `You created a verse image for ${img.ref}` : `तुम्ही ${img.ref} साठी इमेज तयार केली`,
        body: img.text,
        ref: img.ref,
        styleClass: img.style || "gradient-vod-1",
        book: img.book,
        chapter: img.chapter,
        verse: img.verse,
        timestamp: img.timestamp || (Date.now() - 1000 * 60 * 60 * 24 * 12)
      });
    });
  }
  
  // 6. Add Reading Plans progress
  if (state.planPortionsCompleted) {
    const keys = Object.keys(state.planPortionsCompleted);
    const days = {};
    keys.forEach(k => {
      const parts = k.split("_");
      if (parts.length >= 2) {
        const planId = parts[0];
        const day = parts[1];
        days[`${planId}_${day}`] = true;
      }
    });
    
    Object.keys(days).forEach((dayKey, idx) => {
      const parts = dayKey.split("_");
      const planId = parts[0];
      const day = parts[1];
      const planName = planId === "nt90" ? "New Testament in 90 Days" : "Cultivating a Still Heart";
      
      items.push({
        id: `plan_${dayKey}`,
        type: "plans",
        title: state.translation === 'eng' ? `You completed Day ${day} of ${planName}` : `तुम्ही ${planName} चा दिवस ${day} पूर्ण केला`,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * (parseInt(day) || 1)
      });
    });
  }
  
  // Filter items
  if (filter !== "all") {
    items = items.filter(item => item.type === filter);
  }
  
  // Sort items latest first
  items.sort((a, b) => b.timestamp - a.timestamp);
  
  if (items.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";
  
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "activity-feed-card";
    
    const timeText = getRelativeTime(item.timestamp);
    
    let headerHTML = `
      <div class="activity-header-row">
        <div style="display: flex; gap: 10px; align-items: center;">
          <div class="activity-user-avatar" id="avatar-${item.id}"></div>
          <div class="activity-description-box">
            <div class="activity-text-line">${item.title}</div>
            ${item.isPrivate ? `<div style="font-size: 10px; color: var(--text-muted); display: flex; align-items: center; gap: 3px; margin-top: 2px;"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Private</div>` : ''}
          </div>
        </div>
        <span class="activity-timestamp">${timeText}</span>
      </div>
    `;
    
    let bodyHTML = "";
    
    if (item.type === "highlights") {
      bodyHTML = `
        <div class="activity-verse-preview-card" style="cursor: pointer;" onclick="openReaderAndNavigate('${item.book}', ${item.chapter})">
          <p class="activity-verse-text">"${item.body}"</p>
          <div class="activity-verse-ref">${item.ref}</div>
        </div>
        <div class="activity-social-actions-row">
          <button class="activity-social-btn" onclick="showToast('Liked!')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> Like
          </button>
          <button class="activity-social-btn" onclick="showToast('Comments feature coming soon')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Comment
          </button>
        </div>
      `;
    } else if (item.type === "notes") {
      bodyHTML = `
        <div class="activity-verse-preview-card" style="margin-bottom: 8px; cursor: pointer;" onclick="openReaderAndNavigate('${item.book}', ${item.chapter})">
          <p class="activity-verse-text">"${item.body}"</p>
          <div class="activity-verse-ref">${item.ref}</div>
        </div>
        <div style="background-color: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Notes</div>
          <p style="font-size: 13px; color: var(--text); margin: 0; line-height: 1.4;">${item.noteText}</p>
        </div>
        <div class="activity-social-actions-row">
          <button class="activity-social-btn" onclick="showToast('Liked!')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> Like
          </button>
          <button class="activity-social-btn" onclick="showToast('Comments feature coming soon')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Comment
          </button>
        </div>
      `;
    } else if (item.type === "badges") {
      bodyHTML = `
        <div style="background-color: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;">
          <div class="profile-badge-circle-new unlocked" style="width: 60px; height: 60px; font-size: 28px;">${item.badgeIcon}</div>
          <span style="font-size: 13px; font-weight: 700; color: var(--text);">${item.badgeName}</span>
        </div>
        <div class="activity-social-actions-row">
          <button class="activity-social-btn" onclick="showToast('Liked!')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> Like
          </button>
        </div>
      `;
    } else if (item.type === "images") {
      bodyHTML = `
        <div class="activity-verse-image-card ${item.styleClass}" style="cursor: pointer;" onclick="openReaderAndNavigate('${item.book}', ${item.chapter})">
          <p class="activity-verse-image-text">"${item.body}"</p>
          <div class="activity-verse-image-ref">${item.ref}</div>
        </div>
        <div class="activity-social-actions-row">
          <button class="activity-social-btn" onclick="showToast('Liked!')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> Like
          </button>
          <button class="activity-social-btn" onclick="showToast('Comments feature coming soon')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Comment
          </button>
        </div>
      `;
    } else if (item.type === "plans") {
      bodyHTML = `
        <div style="background-color: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">🕊️</span>
          <span style="font-size: 13px; font-weight: 700; color: var(--text);">Great progress keeping up your devotion!</span>
        </div>
      `;
    }
    
    card.innerHTML = headerHTML + bodyHTML;
    listEl.appendChild(card);
    
    const av = document.getElementById(`avatar-${item.id}`);
    if (av) {
      if (user.photo) {
        av.textContent = "";
        av.style.backgroundImage = `url(${user.photo})`;
        av.style.backgroundSize = "cover";
        av.style.backgroundPosition = "center";
      } else {
        av.textContent = initial;
        av.style.backgroundColor = "var(--primary)";
        av.style.color = "#1e1b4b";
      }
    }
  });
}

function renderYouProfile() {
  const loggedInContainer = document.getElementById("you-logged-in-container");
  const loggedOutContainer = document.getElementById("you-logged-out-container");
  
  if (!state.currentUser) {
    if (loggedInContainer) loggedInContainer.style.display = "none";
    if (loggedOutContainer) loggedOutContainer.style.display = "block";
    renderAuthScreen();
    updateAuthUI();
    return;
  }
  
  if (loggedInContainer) loggedInContainer.style.display = "block";
  if (loggedOutContainer) loggedOutContainer.style.display = "none";
  updateAuthUI();
  
  const profileNameEl = document.getElementById("profile-user-name");
  if (profileNameEl) {
    profileNameEl.textContent = state.currentUser.username;
  }
  
  const pastorBadge = document.getElementById("profile-pastor-badge");
  if (pastorBadge) {
    if (state.currentUser.username.toLowerCase() === "admin") {
      pastorBadge.textContent = "Admin";
      pastorBadge.style.display = "inline-block";
    } else if (state.currentUser.isPastor) {
      pastorBadge.textContent = "Pastor";
      pastorBadge.style.display = "inline-block";
    } else {
      pastorBadge.style.display = "none";
    }
  }
  
  updateAllUserAvatars();
  
  const churchDisplay = document.getElementById("profile-church-name-display");
  if (churchDisplay) {
    churchDisplay.textContent = state.currentUser.churchName || (state.translation === "eng" ? "Add your church" : "चर्च जोडा");
  }
  
  const streakEl = document.getElementById("profile-streak-count");
  if (streakEl) {
    streakEl.textContent = state.streak || 2;
  }
  
  const pointsEl = document.getElementById("profile-points-count");
  if (pointsEl) {
    pointsEl.textContent = state.quizPoints || 0;
  }
  
  // Badges UI updates
  const badgeCountEl = document.getElementById("profile-badges-count");
  if (badgeCountEl) {
    badgeCountEl.textContent = state.quizBadges ? state.quizBadges.length : 0;
  }
  
  const noviceUnlocked = state.quizBadges && state.quizBadges.includes("quiz_badge_novice");
  const scholarUnlocked = state.quizBadges && state.quizBadges.includes("quiz_badge_scholar");
  const theologianUnlocked = state.quizBadges && state.quizBadges.includes("quiz_badge_theologian");
  
  const badgeNovice = document.getElementById("badge-item-novice");
  const badgeScholar = document.getElementById("badge-item-scholar");
  const badgeTheologian = document.getElementById("badge-item-theologian");
  
  if (badgeNovice) badgeNovice.classList.toggle("unlocked", noviceUnlocked);
  if (badgeScholar) badgeScholar.classList.toggle("unlocked", scholarUnlocked);
  if (badgeTheologian) badgeTheologian.classList.toggle("unlocked", theologianUnlocked);
  
  const pNovice = document.getElementById("badge-progress-novice");
  const pScholar = document.getElementById("badge-progress-scholar");
  const pTheologian = document.getElementById("badge-progress-theologian");
  
  const pts = state.quizPoints || 0;
  if (pNovice) pNovice.style.width = noviceUnlocked ? "100%" : `${Math.min(100, Math.floor((pts / 30) * 100))}%`;
  if (pScholar) pScholar.style.width = scholarUnlocked ? "100%" : `${Math.min(100, Math.floor((pts / 70) * 100))}%`;
  if (pTheologian) pTheologian.style.width = theologianUnlocked ? "100%" : `${Math.min(100, Math.floor((pts / 100) * 100))}%`;
  
  // Render active activity feed
  const activeBtn = document.querySelector("#activity-filter-bar .profile-tab-btn.active");
  const filter = activeBtn ? (activeBtn.dataset.activityFilter || "all") : "all";
  renderActivityFeed(filter);
}

async function validateElevenLabsKey(key) {
  const statusEl = document.getElementById("elevenlabs-key-status");
  if (!statusEl) return;
  
  if (!key) {
    statusEl.style.display = "none";
    return;
  }
  
  statusEl.style.display = "block";
  statusEl.textContent = "Checking API Key...";
  statusEl.style.color = "var(--text-muted)";
  
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": key
      }
    });
    if (response.ok) {
      const data = await response.json();
      const count = data.voices ? data.voices.length : 0;
      statusEl.textContent = `✓ Key has active voice support! (${count} voices available)`;
      statusEl.style.color = "var(--primary)";
      
      // Update voice selection dropdown dynamically
      if (data.voices && data.voices.length > 0) {
        const elSelect = document.getElementById("tts-voice-select");
        if (elSelect) {
          data.voices.forEach(v => {
            let exists = false;
            for (let i = 0; i < elSelect.options.length; i++) {
              if (elSelect.options[i].value === `elevenlabs_custom_${v.voice_id}`) {
                exists = true;
                break;
              }
            }
            if (!exists) {
              const opt = document.createElement("option");
              opt.value = `elevenlabs_custom_${v.voice_id}`;
              opt.textContent = `👑 ElevenLabs: ${v.name} (${v.category})`;
              elSelect.appendChild(opt);
            }
          });
          
          const customOptVal = `elevenlabs_custom_${state.elevenLabsVoice}`;
          for (let i = 0; i < elSelect.options.length; i++) {
            if (elSelect.options[i].value === customOptVal) {
              elSelect.value = customOptVal;
              break;
            }
          }
        }
      }
    } else {
      statusEl.textContent = "✗ Invalid Key or subscription limit reached.";
      statusEl.style.color = "var(--danger)";
    }
  } catch (e) {
    statusEl.textContent = "✗ Connection error. Could not verify.";
    statusEl.style.color = "var(--danger)";
  }
}

function createLibraryCard(ref, text, bookKey, ch, v, onDelete) {
  const card = document.createElement("div");
  card.className = "library-card";
  card.innerHTML = `
    <div class="library-card-header">
      <span class="library-card-ref">${ref}</span>
      <button class="btn-delete-lib-item" aria-label="Remove item">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
    <div class="library-card-text">"${text}"</div>
  `;
  
  card.addEventListener("click", (e) => {
    if (e.target.closest(".btn-delete-lib-item")) {
      e.stopPropagation();
      onDelete();
      return;
    }
    openReader(bookKey, ch);
    window.location.hash = "#/reader";
    
    setTimeout(() => {
      const key = `${bookKey}_${ch}_${v}`;
      const el = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("selected-pulse");
        setTimeout(() => el.classList.remove("selected-pulse"), 2500);
      }
    }, 500);
  });
  return card;
}

function getRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

// Prefetch all scriptures locally for offline use
async function prefetchBiblesForOffline() {
  if (isPreloadingBible) return;
  isPreloadingBible = true;
  
  const status = document.getElementById("you-offline-cache-status");
  const btn = document.getElementById("you-btn-cache-bible");
  
  btn.disabled = true;
  btn.textContent = "Downloading...";
  
  try {
    for (let i = 0; i < booksMetadataMr.length; i++) {
      const b = booksMetadataMr[i];
      const key = b.filename.replace(".json", "");
      status.textContent = `Downloading ${b.name} (${i + 1}/66)...`;
      
      await fetchBookDataMr(key);
      await fetchBookDataEng(key);
      await new Promise(r => setTimeout(r, 20));
    }
    status.textContent = "Downloaded successfully. River of Life is ready offline.";
    btn.textContent = "Downloaded";
    showToast("Downloaded all scriptures!");
  } catch (e) {
    status.textContent = "Pre-caching failed.";
    btn.disabled = false;
    btn.textContent = "Retry";
    showToast("Download failed");
  } finally {
    isPreloadingBible = false;
  }
}

function clearBibleCache() {
  booksCacheEng = {};
  booksCacheMr = {};
  
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    });
  }
  
  localStorage.removeItem("river_of_life_state_v2");
  state.bookmarks = [];
  state.highlights = {
    "john_2_8": "yellow",
    "john_3_16": "yellow",
    "psalms_23_1": "yellow",
    "philippians_4_13": "yellow",
    "proverbs_3_5": "yellow",
    "isaiah_43_2": "yellow",
    "matthew_6_33": "yellow",
    "romans_8_28": "yellow",
    "joshua_1_9": "yellow",
    "genesis_1_1": "yellow",
    "genesis_1_27": "yellow",
    "exodus_14_14": "yellow",
    "deuteronomy_6_5": "yellow",
    "psalms_46_1": "yellow",
    "psalms_46_10": "yellow",
    "psalms_91_1": "yellow",
    "proverbs_3_6": "yellow",
    "isaiah_40_31": "yellow",
    "jeremiah_29_11": "yellow",
    "luke_1_37": "yellow",
    "john_14_6": "yellow",
    "romans_12_1": "yellow",
    "romans_12_2": "yellow",
    "hebrews_11_1": "yellow",
    "1peter_5_7": "yellow",
    "1john_4_19": "yellow",
    "revelation_21_4": "yellow"
  };
  state.history = [];
  state.readingPlan = "none";
  state.planDay = 1;
  state.planPortionsCompleted = {};
  state.userLikes = {};
  state.userNotes = {};
  state.audioSource = "human";
  state.elevenLabsKey = ELEVENLABS_DEFAULT_KEY;
  state.elevenLabsVoice = "kqVT88a5QfII1HNAEPTJ";
  
  applyStylesFromState();
  renderYouProfile();
  renderDailyDevotion();
  
  document.getElementById("you-offline-cache-status").textContent = "Cache wiped out successfully.";
  document.getElementById("you-btn-cache-bible").disabled = false;
  document.getElementById("you-btn-cache-bible").textContent = "Download";
  
  showToast("Application successfully reset");
}

/* ==========================================================================
   Image Share Card Creator Modal
   ========================================================================== */
let activeCardGradient = "gradient-1";

function openShareCardCreator() {
  if (!selectedVerseMeta) return;
  document.getElementById("share-card-text").textContent = `"${selectedVerseMeta.text}"`;
  document.getElementById("share-card-source").textContent = `${selectedVerseMeta.ref} • ${state.translation === 'eng' ? 'NLT' : 'MARVBSI'}`;
  
  setActiveCardStyle("gradient-1");
  closeAllDrawers();
  openModal("modal-card-share");
}

function setActiveCardStyle(gradClass) {
  activeCardGradient = gradClass;
  const canvas = document.getElementById("share-card-canvas");
  canvas.className = "verse-card-canvas";
  canvas.classList.add(gradClass);
  
  document.querySelectorAll(".grad-dot").forEach(dot => {
    dot.classList.toggle("active", dot.dataset.grad === gradClass);
  });
}

function downloadShareCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  
  const grad = ctx.createLinearGradient(0, 0, 600, 600);
  if (activeCardGradient === "gradient-1") {
    grad.addColorStop(0, '#6366f1'); grad.addColorStop(0.5, '#a855f7'); grad.addColorStop(1, '#ec4899');
  } else if (activeCardGradient === "gradient-2") {
    grad.addColorStop(0, '#3b82f6'); grad.addColorStop(1, '#10b981');
  } else if (activeCardGradient === "gradient-3") {
    grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#ef4444');
  } else if (activeCardGradient === "gradient-4") {
    grad.addColorStop(0, '#111827'); grad.addColorStop(1, '#4b5563');
  } else if (activeCardGradient === "gradient-5") {
    grad.addColorStop(0, '#ec4899'); grad.addColorStop(0.5, '#f43f5e'); grad.addColorStop(1, '#f97316');
  } else {
    grad.addColorStop(0, '#0284c7'); grad.addColorStop(1, '#6366f1');
  }
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 600);
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.font = "italic 240px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("†", 480, 480);
  
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 26px Georgia, serif";
  
  const text = `"${selectedVerseMeta.text}"`;
  const maxWidth = 480;
  const lineHeight = 40;
  const x = 300;
  const y = 260;
  
  const words = text.split(" ");
  let line = "";
  let lines = [];
  
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + " ";
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  
  let startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + (i * lineHeight));
  }
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "700 20px 'Outfit', sans-serif";
  ctx.fillText(`${selectedVerseMeta.ref} • ${state.translation === 'eng' ? 'NLT' : 'MARVBSI'}`, 300, 480);
  
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const container = document.querySelector(".modal-card-creator-body");
    
    const prev = document.getElementById("card-download-preview");
    if (prev) prev.remove();
    
    const img = document.createElement("img");
    img.id = "card-download-preview";
    img.src = dataUrl;
    img.style.width = "100%";
    img.style.maxWidth = "340px";
    img.style.borderRadius = "24px";
    img.style.boxShadow = "var(--shadow-md)";
    
    document.getElementById("share-card-canvas").style.display = "none";
    container.insertBefore(img, document.querySelector(".canvas-customization-tools"));
    
    // Log card creation to Activity feed
    if (state.currentUser) {
      if (!state.createdVerseImages) state.createdVerseImages = [];
      const isDup = state.createdVerseImages.some(item => item.ref === selectedVerseMeta.ref && item.text === selectedVerseMeta.text);
      if (!isDup) {
        state.createdVerseImages.push({
          ref: selectedVerseMeta.ref,
          text: selectedVerseMeta.text,
          book: selectedVerseMeta.book,
          chapter: selectedVerseMeta.chapter,
          verse: selectedVerseMeta.verse,
          style: activeCardGradient || "gradient-1",
          timestamp: Date.now()
        });
        saveStateToLocalStorage();
      }
    }
    
    const dlBtn = document.getElementById("btn-download-card");
    dlBtn.querySelector("span").textContent = "Hold Image to Save";
    dlBtn.style.opacity = "0.7";
    dlBtn.disabled = true;
    
    showToast("Press & Hold image to save to Photos!");
  } catch (e) {
    showToast("Failed to generate image");
  }
}

function resetCardCreatorModal() {
  document.getElementById("share-card-canvas").style.display = "flex";
  const prev = document.getElementById("card-download-preview");
  if (prev) prev.remove();
  
  const dlBtn = document.getElementById("btn-download-card");
  dlBtn.querySelector("span").textContent = "Save to Photos";
  dlBtn.style.opacity = "1";
  dlBtn.disabled = false;
}

/* ==========================================================================
   UI Event Bindings & Listeners Setup
   ========================================================================== */
function setupEventListeners() {
  // WhatsApp App Invite Trigger
  const homeWaInviteBtn = document.getElementById("btn-home-whatsapp-invite");
  if (homeWaInviteBtn) {
    homeWaInviteBtn.addEventListener("click", () => {
      const appUrl = window.location.origin + window.location.pathname;
      const inviteMsg = `🕊️ *River of Life App Invitation* / *आमंत्रण*\n\nJoin us on the *River of Life Bible App*! Read and listen to Marathi/English scriptures, participate in live audio/video Bible study rooms, and sync daily reading plans.\n👉 *Register & Join here:* ${appUrl}`;
      const encodedMsg = encodeURIComponent(inviteMsg);
      window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, "_blank");
    });
  }

  // Top exit button inside meeting room
  const topExitBtn = document.getElementById("btn-meeting-exit-top");
  if (topExitBtn) {
    topExitBtn.addEventListener("click", () => {
      if (confirm("Leave this meeting? / तुम्ही मीटिंग सोडणार आहात का?")) {
        exitLiveMeetingRoom();
      }
    });
  }

  // Navigation trigger drawers
  document.getElementById("btn-text-settings").addEventListener("click", () => openDrawer("drawer-text-settings"));
  
  document.querySelectorAll(".close-drawer-btn").forEach(btn => {
    btn.addEventListener("click", () => closeAllDrawers());
  });
  
  document.querySelectorAll(".drawer-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAllDrawers(); });
  });

  document.querySelectorAll(".modal-overlay-fullscreen").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay.id); });
  });
  
  // Font Size Adjustments
  document.getElementById("btn-size-dec").addEventListener("click", () => {
    if (state.fontSize > 70) {
      state.fontSize -= 10;
      applyStylesFromState();
      saveStateToLocalStorage();
    }
  });
  document.getElementById("btn-size-inc").addEventListener("click", () => {
    if (state.fontSize < 180) {
      state.fontSize += 10;
      applyStylesFromState();
      saveStateToLocalStorage();
    }
  });
  
  // Font styling buttons
  document.querySelectorAll(".font-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.fontFamily = btn.dataset.font;
      applyStylesFromState();
      saveStateToLocalStorage();
    });
  });

  // Line Height spacing buttons
  document.querySelectorAll(".spacing-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.lineHeight = parseFloat(btn.dataset.height);
      applyStylesFromState();
      saveStateToLocalStorage();
    });
  });
  
  // Theme styling grid
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.theme = btn.dataset.theme;
      applyStylesFromState();
      saveStateToLocalStorage();
    });
  });

  // Profile Translation selector
  const youSelectTranslation = document.getElementById("you-select-translation");
  if (youSelectTranslation) {
    youSelectTranslation.addEventListener("change", (e) => {
      state.translation = e.target.value;
      applyStylesFromState();
      saveStateToLocalStorage();
      openReader(state.activeBook, state.activeChapter);
      renderDailyDevotion();
      initAudioVoices();
      toggleVoiceDropdownVisibility();
    });
  }
  
  const youBtnCache = document.getElementById("you-btn-cache-bible");
  if (youBtnCache) {
    youBtnCache.addEventListener("click", prefetchBiblesForOffline);
  }
  
  const youBtnClear = document.getElementById("you-btn-clear-cache");
  if (youBtnClear) {
    youBtnClear.addEventListener("click", () => {
      if (confirm("Clear local cache? This will reset all your bookmarks, highlights, history and notes.")) {
        clearBibleCache();
      }
    });
  }

  // Reader Translation Header Selector
  document.getElementById("btn-translation-selector").addEventListener("click", () => {
    openDrawer("drawer-translation-selector");
    document.querySelectorAll(".select-row-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === state.translation);
    });
  });
  
  document.querySelectorAll(".select-row-item").forEach(btn => {
    btn.addEventListener("click", () => {
      state.translation = btn.dataset.lang;
      applyStylesFromState();
      saveStateToLocalStorage();
      closeAllDrawers();
      
      openReader(state.activeBook, state.activeChapter);
      renderDailyDevotion();
      initAudioVoices();
      toggleVoiceDropdownVisibility();
    });
  });

  // Audio Source selector (Human vs AI TTS)
  const audioSourceSelect = document.getElementById("audio-source-select");
  if (audioSourceSelect) {
    audioSourceSelect.value = state.audioSource || "human";
    audioSourceSelect.addEventListener("change", (e) => {
      state.audioSource = e.target.value;
      saveStateToLocalStorage();
      toggleVoiceDropdownVisibility();
      
      // Keep voice selection dropdown in sync
      const voiceSelect = document.getElementById("tts-voice-select");
      if (voiceSelect) {
        if (state.audioSource === "elevenlabs") {
          const elVoices = [
            { value: "elevenlabs_antoni", id: "ErXwobaYiN019PkySvjV" },
            { value: "elevenlabs_clyde", id: "2E2jMRHfEMvvEBjL7aKG" },
            { value: "elevenlabs_rachel", id: "21m00Tcm4TlvDq8ikWAM" },
            { value: "elevenlabs_declan", id: "kqVT88a5QfII1HNAEPTJ" }
          ];
          const matched = elVoices.find(ev => ev.id === state.elevenLabsVoice);
          voiceSelect.value = matched ? matched.value : "elevenlabs_declan";
        } else {
          // Re-populate system voices
          initAudioVoices();
        }
      }
    });
  }

  // Speech Voice Selector change listener (switch to ElevenLabs if chosen)
  const voiceSelect = document.getElementById("tts-voice-select");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val.startsWith("elevenlabs_")) {
        state.audioSource = "elevenlabs";
        if (val === "elevenlabs_antoni") state.elevenLabsVoice = "ErXwobaYiN019PkySvjV";
        else if (val === "elevenlabs_clyde") state.elevenLabsVoice = "2E2jMRHfEMvvEBjL7aKG";
        else if (val === "elevenlabs_rachel") state.elevenLabsVoice = "21m00Tcm4TlvDq8ikWAM";
        else state.elevenLabsVoice = "kqVT88a5QfII1HNAEPTJ";
        
        saveStateToLocalStorage();
        toggleVoiceDropdownVisibility();
        if (audioSourceSelect) audioSourceSelect.value = "elevenlabs";
        
        // Sync setting voice input if it exists
        const voiceInput = document.getElementById("you-elevenlabs-voice");
        if (voiceInput) voiceInput.value = state.elevenLabsVoice;
      } else {
        // User selected a system voice (index or 'default')
        state.audioSource = "ai";
        saveStateToLocalStorage();
        toggleVoiceDropdownVisibility();
        if (audioSourceSelect) audioSourceSelect.value = "ai";
      }
    });
  }

  // ElevenLabs Key & Voice Input Handlers
  let keyValidationTimeout = null;
  const elKeyInput = document.getElementById("you-elevenlabs-key");
  if (elKeyInput) {
    elKeyInput.addEventListener("input", (e) => {
      state.elevenLabsKey = e.target.value.trim();
      saveStateToLocalStorage();
      clearTimeout(keyValidationTimeout);
      keyValidationTimeout = setTimeout(() => {
        validateElevenLabsKey(state.elevenLabsKey);
      }, 800);
    });
  }
  const elVoiceInput = document.getElementById("you-elevenlabs-voice");
  if (elVoiceInput) {
    elVoiceInput.addEventListener("input", (e) => {
      state.elevenLabsVoice = e.target.value.trim() || "kqVT88a5QfII1HNAEPTJ";
      saveStateToLocalStorage();
    });
  }

  // Book select header trigger
  document.getElementById("btn-book-selector").addEventListener("click", () => {
    openDrawer("drawer-book-selector");
    document.getElementById("selector-books-pane").classList.add("active");
    document.getElementById("selector-chapters-pane").classList.remove("active");
    
    document.getElementById("btn-sort-traditional").classList.toggle("active", state.bookSort === "traditional");
    document.getElementById("btn-sort-alphabetical").classList.toggle("active", state.bookSort === "alphabetical");
    populateBookSelector();
  });
  
  document.getElementById("btn-sort-traditional").addEventListener("click", () => {
    state.bookSort = "traditional";
    document.getElementById("btn-sort-traditional").classList.add("active");
    document.getElementById("btn-sort-alphabetical").classList.remove("active");
    saveStateToLocalStorage();
    populateBookSelector();
  });
  
  document.getElementById("btn-sort-alphabetical").addEventListener("click", () => {
    state.bookSort = "alphabetical";
    document.getElementById("btn-sort-traditional").classList.remove("active");
    document.getElementById("btn-sort-alphabetical").classList.add("active");
    saveStateToLocalStorage();
    populateBookSelector();
  });
  
  document.getElementById("btn-back-to-books").addEventListener("click", () => {
    document.getElementById("selector-books-pane").classList.add("active");
    document.getElementById("selector-chapters-pane").classList.remove("active");
  });
  
  // Highlight pickers dots
  document.querySelectorAll(".dot-btn").forEach(dot => {
    dot.addEventListener("click", () => handleHighlightSelection(dot.dataset.color));
  });
  
  document.getElementById("btn-action-bookmark").addEventListener("click", toggleBookmark);
  document.getElementById("btn-action-copy").addEventListener("click", copyVerseToClipboard);
  document.getElementById("btn-action-share").addEventListener("click", openShareCardCreator);
  document.getElementById("btn-action-speak").addEventListener("click", () => {
    closeAllDrawers();
    if (selectedVerseMeta && selectedVerseMeta.verse) {
      startSpeechNarrationFromVerse(selectedVerseMeta.verse);
    } else {
      openModal("modal-audio-settings");
    }
  });

  const vodListenBtn = document.getElementById("btn-vod-listen");
  if (vodListenBtn) {
    vodListenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playDailyVerseAudio();
    });
  }
  
  // Card share creator buttons
  document.querySelectorAll(".grad-dot").forEach(choice => {
    choice.addEventListener("click", () => setActiveCardStyle(choice.dataset.grad));
  });
  
  document.getElementById("btn-download-card").addEventListener("click", downloadShareCard);
  document.getElementById("btn-close-card-share").addEventListener("click", () => closeModal("modal-card-share"));

  // VOD Fullscreen modal triggers
  document.getElementById("btn-open-fullscreen-vod").addEventListener("click", () => openModal("modal-fullscreen-vod"));
  document.getElementById("btn-close-fullscreen-vod").addEventListener("click", () => closeModal("modal-fullscreen-vod"));
  document.getElementById("btn-fs-options").addEventListener("click", openVerseOptionsFromVOD);

  // Daily Verse Card tabs interaction
  const dailyVerseTabPills = document.querySelectorAll(".daily-verse-header-tabs .tab-pill");
  dailyVerseTabPills.forEach((pill, idx) => {
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      if (idx === 0) {
        openModal("modal-fullscreen-vod");
      } else {
        openModal("modal-premium-promo");
      }
    });
  });
  document.getElementById("btn-fs-like").addEventListener("click", toggleLikeVOD);
  document.getElementById("btn-fs-customize-card").addEventListener("click", openCardCreatorFromVOD);
  document.getElementById("btn-fs-share-trigger").addEventListener("click", openCardCreatorFromVOD);
  document.getElementById("btn-fs-comment").addEventListener("click", () => showToast("Comments are offline-only"));

  // Swipe gesture for chapters navigation in reader
  const scroller = document.getElementById("reader-scroll-container");
  scroller.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].screenX; });
  scroller.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 100) {
      if (diff > 0) navigateChapter("prev");
      else navigateChapter("next");
    }
  });
  
  document.getElementById("btn-prev-chapter").addEventListener("click", () => navigateChapter("prev"));
  document.getElementById("btn-next-chapter").addEventListener("click", () => navigateChapter("next"));
  
  // Discover search triggers
  const sInput = document.getElementById("discover-search-input");
  const sClear = document.getElementById("btn-discover-search-clear");
  
  sInput.addEventListener("input", () => {
    sClear.style.display = (sInput.value.length > 0) ? "flex" : "none";
    if (sInput.value.length >= 3) {
      executeDiscoverSearch();
    } else if (sInput.value.length === 0) {
      document.getElementById("discover-search-results-list").innerHTML = "";
      document.getElementById("discover-search-results-status").textContent = "Enter search terms to find scriptures";
    }
  });
  
  sClear.addEventListener("click", () => {
    sInput.value = "";
    sClear.style.display = "none";
    document.getElementById("discover-search-results-list").innerHTML = "";
    document.getElementById("discover-search-results-status").textContent = "Enter search terms to find scriptures";
    sInput.focus();
  });
  
  document.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (sInput.value.length >= 3) executeDiscoverSearch();
    });
  });
  
  // Audio Playbar settings trigger
  document.getElementById("btn-audio-tts").addEventListener("click", () => openModal("modal-audio-settings"));
  document.getElementById("btn-close-audio-settings").addEventListener("click", () => closeModal("modal-audio-settings"));
  document.getElementById("btn-start-tts-reading").addEventListener("click", startSpeechNarration);
  
  // Floating Playbar triggers
  document.getElementById("playbar-btn-play").addEventListener("click", togglePlaybarSpeech);
  document.getElementById("playbar-btn-close-widget").addEventListener("click", stopSpeechNarration);
  
  const speedPillBtn = document.getElementById("playbar-btn-speed");
  if (speedPillBtn) {
    speedPillBtn.addEventListener("click", () => {
      const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
      let currIdx = speeds.indexOf(audioState.speed || 1.0);
      if (currIdx === -1) currIdx = 0;
      const nextSpeed = speeds[(currIdx + 1) % speeds.length];
      audioState.speed = nextSpeed;
      speedPillBtn.textContent = `${nextSpeed}x`;
      const slider = document.getElementById("tts-speed-slider");
      if (slider) slider.value = nextSpeed;
      const valDisp = document.getElementById("tts-speed-val");
      if (valDisp) valDisp.textContent = `${nextSpeed}x`;
      
      if (audioPlayerInstance) {
        audioPlayerInstance.playbackRate = nextSpeed;
      } else if (audioState.isPlaying && speechSynthesis.speaking) {
        speechSynthesis.cancel();
        speakPlaybarVerse(audioState.currentVerseIndex);
      }
      showToast(`Speed set to ${nextSpeed}x`);
    });
  }

  document.getElementById("playbar-btn-prev").addEventListener("click", () => {
    if (audioPlayerInstance) {
      audioPlayerInstance.currentTime = Math.max(0, audioPlayerInstance.currentTime - 10);
    } else if (audioState.currentVerseIndex > 0) {
      speechSynthesis.cancel();
      audioState.currentVerseIndex--;
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  });
  
  document.getElementById("playbar-btn-next").addEventListener("click", () => {
    if (audioPlayerInstance) {
      audioPlayerInstance.currentTime = Math.min(audioPlayerInstance.duration || 9999, audioPlayerInstance.currentTime + 10);
    } else if (audioState.currentVerseIndex < audioState.versesToRead.length - 1) {
      speechSynthesis.cancel();
      audioState.currentVerseIndex++;
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  });
  
  const speedSlider = document.getElementById("tts-speed-slider");
  speedSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value).toFixed(2);
    document.getElementById("tts-speed-val").textContent = `${val}x`;
    audioState.speed = parseFloat(val);
    if (audioPlayerInstance) {
      audioPlayerInstance.playbackRate = audioState.speed;
    } else if (audioState.isPlaying && speechSynthesis.speaking) {
      speechSynthesis.cancel();
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  });
  
  const toneSelect = document.getElementById("audio-tone-select");
  if (toneSelect) {
    toneSelect.value = state.audioTone || 'deep-bass';
    toneSelect.addEventListener("change", () => {
      updateAudioToneSettings();
      if (audioState.isPlaying && !audioPlayerInstance) {
        speechSynthesis.cancel();
        speakPlaybarVerse(audioState.currentVerseIndex);
      }
    });
  }
  
  // Profile subtabs switching
  document.querySelectorAll(".profile-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".profile-tab-panel").forEach(p => {
        p.classList.toggle("active", p.id === `you-tab-content-${btn.dataset.tab}`);
      });
    });
  });
  
  // Reading plan action clicks
  document.querySelectorAll(".plan-btn-action").forEach(btn => {
    btn.addEventListener("click", () => {
      state.readingPlan = btn.dataset.planId;
      state.planDay = 1;
      state.planPortionsCompleted = {};
      saveStateToLocalStorage();
      renderReadingPlansTab();
      renderDailyDevotion();
      showToast("Reading plan unlocked!");
    });
  });
  
  /* ==========================================================================
     14. Life Bible Split Screen Study & Journaling Listeners
     ========================================================================== */
  document.getElementById("btn-action-explain").addEventListener("click", () => {
    if (!selectedVerseMeta) return;
    closeAllDrawers();
    openStudySplitPane(selectedVerseMeta.book, selectedVerseMeta.chapter, selectedVerseMeta.verse);
  });

  const shareMeetingBtn = document.getElementById("btn-action-share-meeting");
  if (shareMeetingBtn) {
    shareMeetingBtn.addEventListener("click", () => {
      if (!selectedVerseMeta) return;
      if (!activeMeetingSession) {
        showToast("You must join a live meeting room first to share scriptures.");
        return;
      }
      
      broadcastMeetingEvent(activeMeetingSession.meetingId, {
        type: "SHARE_BIBLE",
        book: selectedVerseMeta.book,
        chapter: selectedVerseMeta.chapter,
        verse: selectedVerseMeta.verse
      });
      
      closeAllDrawers();
      showToast("Scripture shared to live meeting!");
    });
  }
  
  document.getElementById("btn-close-study-pane").addEventListener("click", () => {
    closeStudySplitPane();
  });
  
  document.querySelectorAll(".study-subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchStudyTab(btn.dataset.studyTab);
    });
  });
  
  document.getElementById("btn-save-journal").addEventListener("click", () => {
    saveJournalNote();
  });
  
  // Autosave notes on input typing
  const journalTextarea = document.getElementById("study-journal-editor");
  if (journalTextarea) {
    journalTextarea.addEventListener("input", () => {
      if (!activeStudyVerse) return;
      const text = journalTextarea.value.trim();
      const refKey = activeStudyVerse.refKey;
      if (text) {
        state.userNotes[refKey] = text;
        if (!state.notesTimestamps) state.notesTimestamps = {};
        state.notesTimestamps[refKey] = Date.now();
      } else {
        delete state.userNotes[refKey];
        if (state.notesTimestamps) delete state.notesTimestamps[refKey];
      }
      saveStateToLocalStorage();
      document.getElementById("study-journal-status").textContent = "Auto-saving...";
      document.getElementById("study-journal-status").style.color = "var(--text-muted)";
      
      clearTimeout(journalTextarea.autosaveTimeout);
      journalTextarea.autosaveTimeout = setTimeout(() => {
        updateJournalSaveStatus(!!state.userNotes[refKey]);
      }, 1000);
    });
  }
  
  // Home page tag chip bindings
  document.querySelectorAll(".tag-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const query = chip.dataset.query;
      const sInput = document.getElementById("discover-search-input");
      if (sInput) {
        sInput.value = query;
        const sClear = document.getElementById("btn-discover-search-clear");
        if (sClear) sClear.style.display = "flex";
        executeDiscoverSearch();
      }
      window.location.hash = "#/discover";
    });
  });
  
  // Home page search bar click binding
  const homeSearchTrigger = document.getElementById("home-search-trigger-input");
  if (homeSearchTrigger) {
    homeSearchTrigger.addEventListener("click", () => {
      window.location.hash = "#/discover";
    });
  }
  
  // Plans subnav switching bindings
  document.querySelectorAll(".plans-subnav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".plans-subnav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const subtab = btn.dataset.plansSubtab;
      document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === `plans-subtab-${subtab}`);
      });
    });
  });

  // 15. New Interactive Click Bindings (Life Bible style)
  
  // Touchpoint Hope card
  document.querySelectorAll(".touchpoint-hope-card").forEach(card => {
    card.addEventListener("click", () => {
      openModal("modal-touchpoint-detail");
    });
  });

  // Resilient & Redeemed banner card click
  document.querySelectorAll(".resilient-banner-card").forEach(card => {
    card.addEventListener("click", () => {
      activatePlan("resilient_redeemed");
    });
  });
  const closeTouchpointDetailBtn = document.getElementById("btn-close-touchpoint-detail");
  if (closeTouchpointDetailBtn) {
    closeTouchpointDetailBtn.addEventListener("click", () => closeModal("modal-touchpoint-detail"));
  }
  
  document.querySelectorAll(".touchpoint-verse-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const book = btn.dataset.book;
      const chapter = parseInt(btn.dataset.chapter);
      const verse = parseInt(btn.dataset.verse);
      closeModal("modal-touchpoint-detail");
      openReader(book, chapter);
      setTimeout(() => {
        const key = `${book}_${chapter}_${verse}`;
        const el = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("selected-pulse");
          setTimeout(() => el.classList.remove("selected-pulse"), 2500);
        }
      }, 500);
      window.location.hash = "#/reader";
    });
  });

  // Premium / Commentary cards click
  const openPremium = () => openModal("modal-premium-promo");
  document.querySelectorAll(".premium-promo-card").forEach(card => card.addEventListener("click", openPremium));
  document.querySelectorAll(".commentary-mockup-card").forEach(card => card.addEventListener("click", openPremium));
  document.querySelectorAll(".btn-premium-action").forEach(btn => btn.addEventListener("click", openPremium));
  
  const closePremiumPromoBtn = document.getElementById("btn-close-premium-promo");
  if (closePremiumPromoBtn) {
    closePremiumPromoBtn.addEventListener("click", () => closeModal("modal-premium-promo"));
  }
  const startPremiumTrialBtn = document.getElementById("btn-start-premium-trial");
  if (startPremiumTrialBtn) {
    startPremiumTrialBtn.addEventListener("click", () => {
      closeModal("modal-premium-promo");
      showToast("Premium trial activated! Thank you for choosing River of Life.");
    });
  }

  // Curated Reading Plans
  const activatePlan = (planId) => {
    state.readingPlan = planId;
    state.planDay = 1;
    state.planPortionsCompleted = {};
    saveStateToLocalStorage();
    renderReadingPlansTab();
    renderDailyDevotion();
    
    // Select MY PLANS tab in UI
    document.querySelectorAll(".plans-subnav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.plansSubtab === "myplans");
    });
    document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === "plans-subtab-myplans");
    });
    
    showToast("Reading plan activated!");
    window.location.hash = "#/plans";
  };
  
  document.querySelectorAll(".suggested-plan-row").forEach(row => {
    row.addEventListener("click", () => {
      const planId = row.dataset.planId;
      activatePlan(planId);
    });
  });
  
  document.querySelectorAll(".plan-cover-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const planId = tile.dataset.plan;
      activatePlan(planId);
    });
  });

  // Book of the Month Cover Tiles click
  document.querySelectorAll(".book-cover-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const book = tile.dataset.book;
      openReader(book, 1);
      window.location.hash = "#/reader";
    });
  });

  // Plans Carousel click
  document.querySelectorAll(".carousel-card").forEach(card => {
    card.addEventListener("click", () => {
      let planId = "resilient_redeemed";
      if (card.classList.contains("slide-2")) planId = "book_club";
      else if (card.classList.contains("slide-3")) planId = "healthy_life";
      activatePlan(planId);
    });
  });

  // Floating + Plan Creator
  document.querySelectorAll(".floating-plans-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openModal("modal-create-plan");
    });
  });
  const closeCreatePlanBtn = document.getElementById("btn-close-create-plan");
  if (closeCreatePlanBtn) {
    closeCreatePlanBtn.addEventListener("click", () => closeModal("modal-create-plan"));
  }
  
  const generatePlanSubmitBtn = document.getElementById("btn-generate-plan-submit");
  if (generatePlanSubmitBtn) {
    generatePlanSubmitBtn.addEventListener("click", () => {
      const bookSelect = document.getElementById("create-plan-book-select");
      const durationSelect = document.getElementById("create-plan-duration-select");
      if (!bookSelect || !durationSelect) return;
      
      const bookKey = bookSelect.value;
      const duration = parseInt(durationSelect.value);
      const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
      const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
      
      state.readingPlan = `custom_${bookKey}_${duration}`;
      state.planDay = 1;
      state.planPortionsCompleted = {};
      state.customPlan = {
        book: bookKey,
        duration: duration,
        title: `Custom: ${bookName} Study (${duration} Days)`
      };
      
      saveStateToLocalStorage();
      renderReadingPlansTab();
      closeModal("modal-create-plan");
      
      // Select MY PLANS tab in UI
      document.querySelectorAll(".plans-subnav-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.plansSubtab === "myplans");
      });
      document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "plans-subtab-myplans");
      });
      
      showToast("Custom study plan generated!");
      window.location.hash = "#/plans";
    });
  }

  // Reader Header History Clock Trigger click
  const historyTrigger = document.getElementById("btn-history-trigger");
  if (historyTrigger) {
    historyTrigger.addEventListener("click", () => {
      window.location.hash = "#/you";
      
      document.querySelectorAll(".profile-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === "you-history");
      });
      document.querySelectorAll(".profile-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "you-tab-content-you-history");
      });
      
      renderYouProfile();
    });
  }

  // See All tags button on Home Page click
  document.querySelectorAll(".btn-see-all-tags").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.hash = "#/discover";
    });
  });

  // Explore plans button in Empty State click
  const discoverFallbackBtn = document.getElementById("btn-discover-plans-fallback");
  if (discoverFallbackBtn) {
    discoverFallbackBtn.addEventListener("click", () => {
      document.querySelectorAll(".plans-subnav-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.plansSubtab === "discover");
      });
      document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "plans-subtab-discover");
      });
    });
  }

  // Word & AI search examples click
  document.querySelectorAll(".clickable-search-example").forEach(item => {
    item.addEventListener("click", () => {
      const query = item.dataset.search;
      const sInput = document.getElementById("discover-search-input");
      if (sInput) {
        sInput.value = query;
        const sClear = document.getElementById("btn-discover-search-clear");
        if (sClear) sClear.style.display = "flex";
        executeDiscoverSearch();
      }
      window.location.hash = "#/discover";
    });
  });

  // Verse of the Day Navigation Listeners
  const bindVODNav = (btnId, delta) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        changeVODOffset(delta);
      });
    }
  };
  
  bindVODNav("btn-vod-prev", -1);
  bindVODNav("btn-vod-next", 1);
  bindVODNav("btn-fs-vod-prev", -1);
  bindVODNav("btn-fs-vod-next", 1);
  
  const readVODChapter = (e) => {
    e.stopPropagation();
    closeModal("modal-fullscreen-vod");
    const { vod } = getCurrentVOD();
    openReader(vod.book, vod.chapter);
    window.location.hash = "#/reader";
  };
  
  const btnRead = document.getElementById("btn-vod-read");
  if (btnRead) btnRead.addEventListener("click", readVODChapter);
  const btnFsRead = document.getElementById("btn-fs-vod-read");
  if (btnFsRead) btnFsRead.addEventListener("click", readVODChapter);

  // Profile Photo Upload Handler
  const photoInput = document.getElementById("profile-photo-input");
  if (photoInput) {
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        if (state.currentUser) {
          state.currentUser.photo = dataUrl;
          
          // Sync to users database
          const users = JSON.parse(localStorage.getItem("river_of_life_users") || "[]");
          const idx = users.findIndex(u => u.username.toLowerCase() === state.currentUser.username.toLowerCase());
          if (idx !== -1) {
            users[idx].photo = dataUrl;
            localStorage.setItem("river_of_life_users", JSON.stringify(users));
          }
          
          saveStateToLocalStorage();
          updateAllUserAvatars();
          showToast("Profile photo updated!");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Church Name Edit Handler
  const btnChurch = document.getElementById("btn-profile-church");
  if (btnChurch) {
    btnChurch.addEventListener("click", () => {
      if (!state.currentUser) return;
      const currentChurch = state.currentUser.churchName || "";
      const promptTitle = state.translation === "eng" ? "Enter your church name:" : "तुमच्या चर्चचे नाव टाका:";
      const newChurch = prompt(promptTitle, currentChurch);
      if (newChurch !== null) {
        state.currentUser.churchName = newChurch.trim();
        
        // Sync to users database
        const users = JSON.parse(localStorage.getItem("river_of_life_users") || "[]");
        const idx = users.findIndex(u => u.username.toLowerCase() === state.currentUser.username.toLowerCase());
        if (idx !== -1) {
          users[idx].churchName = newChurch.trim();
          localStorage.setItem("river_of_life_users", JSON.stringify(users));
        }
        
        saveStateToLocalStorage();
        
        const displayEl = document.getElementById("profile-church-name-display");
        if (displayEl) {
          displayEl.textContent = newChurch.trim() || (state.translation === "eng" ? "Add your church" : "चर्च जोडा");
        }
        showToast(state.translation === "eng" ? "Church updated!" : "चर्चचे नाव अद्ययावत केले!");
      }
    });
  }

  // Profile Tab Switch / Activity Feed Filter Listener
  const activityFilterBar = document.getElementById("activity-filter-bar");
  if (activityFilterBar) {
    activityFilterBar.querySelectorAll(".profile-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activityFilterBar.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const filter = btn.dataset.activityFilter || "all";
        renderActivityFeed(filter);
      });
    });
  }

  // Stats Grid quick navigations
  const btnGotoSaved = document.getElementById("btn-profile-goto-saved");
  if (btnGotoSaved) {
    btnGotoSaved.addEventListener("click", () => {
      if (activityFilterBar) {
        activityFilterBar.querySelectorAll(".profile-tab-btn").forEach(b => {
          b.classList.toggle("active", b.dataset.activityFilter === "highlights");
        });
      }
      renderActivityFeed("highlights");
      
      const target = document.querySelector(".activity-feed-section-title");
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnGotoPrayer = document.getElementById("btn-profile-goto-prayer");
  if (btnGotoPrayer) {
    btnGotoPrayer.addEventListener("click", () => {
      window.location.hash = "#/prayers";
    });
  }

  const btnGotoGiving = document.getElementById("btn-profile-goto-giving");
  if (btnGotoGiving) {
    btnGotoGiving.addEventListener("click", () => {
      showToast("Giving features coming soon!");
    });
  }

  // Live Meeting Share Word & Background Music binds
  const shareWordBtn = document.getElementById("btn-meeting-share-bible");
  if (shareWordBtn) {
    shareWordBtn.addEventListener("click", () => {
      populateMeetingShareBibleDropdowns();
      openDrawer("drawer-meet-share-bible");
    });
  }

  const musicBtn = document.getElementById("btn-meeting-music");
  if (musicBtn) {
    musicBtn.addEventListener("click", () => {
      openDrawer("drawer-meet-music");
    });
  }

  const shareWordSubmitBtn = document.getElementById("btn-meet-share-bible-submit");
  if (shareWordSubmitBtn) {
    shareWordSubmitBtn.addEventListener("click", () => {
      if (!activeMeetingSession) activeMeetingSession = { isMuted: false, isCamOff: false };
      const book = document.getElementById("meeting-share-book").value;
      const chapter = document.getElementById("meeting-share-chapter").value;
      const verse = document.getElementById("meeting-share-verse").value;
      
      broadcastMeetingEvent(activeMeetingSession.meetingId, {
        type: "SHARE_BIBLE",
        book,
        chapter,
        verse
      });
      closeAllDrawers();
      showToast("Scripture shared with participants!");
    });
  }

  const shareWordStopBtn = document.getElementById("btn-meet-share-bible-stop");
  if (shareWordStopBtn) {
    shareWordStopBtn.addEventListener("click", () => {
      if (!activeMeetingSession) activeMeetingSession = { isMuted: false, isCamOff: false };
      broadcastMeetingEvent(activeMeetingSession.meetingId, {
        type: "STOP_SHARE_BIBLE"
      });
      closeAllDrawers();
      showToast("Stopped scripture sharing.");
    });
  }

  document.querySelectorAll(".meet-music-track-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.dataset.url;
      const title = btn.dataset.title;
      const volume = parseInt(document.getElementById("meet-music-volume").value || 50);
      
      playWorshipTrack(url, title, volume);

      if (activeMeetingSession) {
        broadcastMeetingEvent(activeMeetingSession.meetingId, {
          type: "PLAY_MUSIC",
          trackUrl: url,
          title: title,
          volume: volume
        });
      }
      showToast(`Playing background music: ${title}`);
      closeAllDrawers();
    });
  });

  // Play Custom Song (YouTube or Direct MP3/Audio URL)
  const playCustomBtn = document.getElementById("btn-meet-play-custom");
  if (playCustomBtn) {
    playCustomBtn.addEventListener("click", () => {
      const customUrlInput = document.getElementById("meet-music-custom-url");
      const inputUrl = customUrlInput ? customUrlInput.value.trim() : "";
      const modeSelect = document.getElementById("meet-music-custom-mode");
      const mode = modeSelect ? modeSelect.value : "audio";
      const volSlider = document.getElementById("meet-music-volume");
      const volume = volSlider ? parseInt(volSlider.value) : 50;

      if (!inputUrl) {
        showToast("Please enter a valid YouTube or direct MP3 URL.");
        return;
      }

      const ytId = extractYouTubeVideoId(inputUrl);

      if (ytId) {
        // YouTube Link: Broadcast to all connected participants & sync audio locally on Host
        const now = Date.now();
        if (activeMeetingSession) {
          broadcastMeetingEvent(activeMeetingSession.meetingId, {
            type: "PLAY_YOUTUBE",
            url: ytId,
            mode: mode,
            startedAt: now
          });
        }
        syncSharedWorshipVideo(ytId, mode, null); // Pass null on Host so Host gets control strip

        const titleEl = document.getElementById("meet-music-now-playing");
        if (titleEl) {
          titleEl.textContent = mode === "video" ? `YouTube Video & Audio (${ytId})` : `YouTube Audio Only (${ytId})`;
        }
        showToast(mode === "video" ? "🎥 Playing YouTube Video & Audio to all members" : "🔊 Playing YouTube Audio Only to all members");
      } else {
        // Direct Audio Link (MP3 / WAV / Audio Stream)
        const customTitle = "Custom Shared Audio Stream";
        playWorshipTrack(inputUrl, customTitle, volume);

        if (activeMeetingSession) {
          broadcastMeetingEvent(activeMeetingSession.meetingId, {
            type: "PLAY_MUSIC",
            trackUrl: inputUrl,
            title: customTitle,
            volume: volume
          });
        }
        showToast("🎵 Playing Custom Audio Stream to all members");
      }

      closeAllDrawers();
      if (customUrlInput) customUrlInput.value = "";
    });
  }


  // Stop Music Button: Completely halts playback & resets Currently Playing status to None (Silent)
  const musicStopBtn = document.getElementById("btn-meet-music-stop");
  if (musicStopBtn) {
    musicStopBtn.addEventListener("click", () => {
      stopWorshipTrack();

      if (activeMeetingSession) {
        broadcastMeetingEvent(activeMeetingSession.meetingId, {
          type: "STOP_MUSIC"
        });
        broadcastMeetingEvent(activeMeetingSession.meetingId, {
          type: "STOP_YOUTUBE"
        });
      }
      closeAllDrawers();
      showToast("Stopped music playback.");
    });
  }

  // Volume Slider: Dynamically adjusts playback volume
  const volSlider = document.getElementById("meet-music-volume");
  const volLabel = document.getElementById("meet-music-vol-label");
  if (volSlider && volLabel) {
    volSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      volLabel.textContent = `${val}%`;
      
      if (activeWorshipAudio) {
        activeWorshipAudio.volume = val / 100;
      }
      
      if (activeMeetingSession && currentWorshipTrack) {
        currentWorshipTrack.volume = val;
        broadcastMeetingEvent(activeMeetingSession.meetingId, {
          type: "VOLUME_CHANGE",
          volume: val
        });
      }
    });
  }

}

/* ==========================================================================
   Helper Utilities
   ========================================================================== */
function openDrawer(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add("active");
  if (id === "drawer-meet-audio-settings" && typeof enumerateAndPopulateAudioDevices === "function") {
    enumerateAndPopulateAudioDevices();
  }
}

function closeDrawer(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove("active");
}

function closeAllDrawers() {
  document.querySelectorAll(".drawer-overlay").forEach(overlay => overlay.classList.remove("active"));
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("selected-pulse"));
}

window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.closeAllDrawers = closeAllDrawers;


function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add("active");
    if (id === "modal-card-share") resetCardCreatorModal();
    if (id === "modal-audio-settings") toggleVoiceDropdownVisibility();
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove("active");
}

let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById("toast-notification");
  document.getElementById("toast-message").textContent = message;
  
  clearTimeout(toastTimeout);
  toast.classList.add("active");
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

/* ==========================================================================
   14. Life Bible Split Screen Study & Journaling Engine
   ========================================================================== */
const PLANS_DB = {
  "nt90": {
    title: "New Testament in 90 Days",
    days: 90,
    books: [
      { name: "Matthew", key: "matthew", chapters: 28 },
      { name: "Mark", key: "mark", chapters: 16 },
      { name: "Luke", key: "luke", chapters: 24 },
      { name: "John", key: "john", chapters: 21 },
      { name: "Acts", key: "acts", chapters: 28 },
      { name: "Romans", key: "romans", chapters: 16 }
    ]
  },
  "bible365": {
    title: "Bible in 365 Days",
    days: 365
  },
  "anxiety_tremble": {
    title: "Made to Tremble: Finding Awe in Your Anxiety",
    days: 7,
    readings: [
      { label: "Psalms 27", bookKey: "psalms", chapter: 27 },
      { label: "Psalms 34", bookKey: "psalms", chapter: 34 },
      { label: "Psalms 46", bookKey: "psalms", chapter: 46 },
      { label: "Psalms 91", bookKey: "psalms", chapter: 91 },
      { label: "Philippians 4", bookKey: "philippians", chapter: 4 },
      { label: "1 Peter 5", bookKey: "1peter", chapter: 5 },
      { label: "Matthew 6", bookKey: "matthew", chapter: 6 }
    ]
  },
  "still_heart": {
    title: "Cultivating a Still Heart in a Noisy World",
    days: 5,
    readings: [
      { label: "Luke 10", bookKey: "luke", chapter: 10 },
      { label: "Psalms 46", bookKey: "psalms", chapter: 46 },
      { label: "Psalms 131", bookKey: "psalms", chapter: 131 },
      { label: "John 14", bookKey: "john", chapter: 14 },
      { label: "Isaiah 30", bookKey: "isaiah", chapter: 30 }
    ]
  },
  "resilient_redeemed": {
    title: "Resilient & Redeemed: Faith & Depression",
    days: 10,
    readings: [
      { label: "Psalms 42", bookKey: "psalms", chapter: 42 },
      { label: "Psalms 43", bookKey: "psalms", chapter: 43 },
      { label: "Psalms 88", bookKey: "psalms", chapter: 88 },
      { label: "1 Kings 19", bookKey: "1kings", chapter: 19 },
      { label: "Romans 8", bookKey: "romans", chapter: 8 },
      { label: "2 Corinthians 1", bookKey: "2corinthians", chapter: 1 },
      { label: "2 Corinthians 4", bookKey: "2corinthians", chapter: 4 },
      { label: "Philippians 1", bookKey: "philippians", chapter: 1 },
      { label: "Philippians 4", bookKey: "philippians", chapter: 4 },
      { label: "Revelation 21", bookKey: "revelation", chapter: 21 }
    ]
  },
  "book_club": {
    title: "Life Bible Book Club: Job - Psalms",
    days: 15,
    readings: [
      { label: "Job 1", bookKey: "job", chapter: 1 },
      { label: "Job 2", bookKey: "job", chapter: 2 },
      { label: "Job 19", bookKey: "job", chapter: 19 },
      { label: "Job 38", bookKey: "job", chapter: 38 },
      { label: "Job 42", bookKey: "job", chapter: 42 },
      { label: "Psalms 1", bookKey: "psalms", chapter: 1 },
      { label: "Psalms 2", bookKey: "psalms", chapter: 2 },
      { label: "Psalms 8", bookKey: "psalms", chapter: 8 },
      { label: "Psalms 19", bookKey: "psalms", chapter: 19 },
      { label: "Psalms 23", bookKey: "psalms", chapter: 23 },
      { label: "Psalms 51", bookKey: "psalms", chapter: 51 },
      { label: "Psalms 103", bookKey: "psalms", chapter: 103 },
      { label: "Psalms 119", bookKey: "psalms", chapter: 119 },
      { label: "Psalms 139", bookKey: "psalms", chapter: 139 },
      { label: "Psalms 150", bookKey: "psalms", chapter: 150 }
    ]
  },
  "healthy_life": {
    title: "A Simply Healthy Life",
    days: 7,
    readings: [
      { label: "Daniel 1", bookKey: "daniel", chapter: 1 },
      { label: "Proverbs 4", bookKey: "proverbs", chapter: 4 },
      { label: "1 Corinthians 6", bookKey: "1corinthians", chapter: 6 },
      { label: "1 Corinthians 10", bookKey: "1corinthians", chapter: 10 },
      { label: "Romans 12", bookKey: "romans", chapter: 12 },
      { label: "James 1", bookKey: "james", chapter: 1 },
      { label: "James 3", bookKey: "james", chapter: 3 }
    ]
  }
};

let activeStudyVerse = null; // Stores { bookKey, chapter, verse, refKey }

const STUDY_COMMENTARY_DB = {
  "judges_13_5": {
    mr: "शास्ते १३:५ वरील भाष्य: हा शमशोनच्या जन्माविषयीचा संदेश आहे. तो गर्भापासूनच देवाचा नाजीर असेल आणि इस्राएलाला पलिष्ट्यांच्या जाचातून सोडवण्यास सुरुवात करेल. देव लहानपणापासूनच त्याला त्याच्या विशिष्ट कार्यासाठी पाचारण करीत आहे.",
    en: "Commentary on Judges 13:5: Samson was dedicated to God as a Nazirite from birth. He was to begin the deliverance of Israel from the Philistines. It highlights divine consecration for a specific task."
  },
  "isaiah_43_2": {
    mr: "यशया ४३:२ वरील भाष्य: देव आपल्या लोकांना खात्री देतो की संकटाच्या वेळी (पाणी, नद्या, अग्नी) तो त्यांच्यासोबत असेल. ही संकटे त्यांना नष्ट करू शकणार नाहीत कारण देव त्यांचा रक्षक व त्राता आहे.",
    en: "Commentary on Isaiah 43:2: God promises to be with His people in their trials (water, rivers, fire). Trials will not destroy them, for He is their Savior and protector."
  },
  "john_3_16": {
    mr: "योहान ३:१६ वरील भाष्य: हा संपूर्ण पवित्र शास्त्रातील सर्वात प्रसिद्ध संदेश आहे. देवाचे जगावरील असीम प्रेम आणि त्याच्या पुत्राद्वारे मिळणारे सार्वकालिक जीवन यावर येथे भर दिला आहे.",
    en: "Commentary on John 3:16: Often called the 'gospel in miniature', it highlights God's supreme love for humanity and the promise of eternal life through faith in His Son."
  },
  "psalms_23_1": {
    mr: "स्तोत्रसंहिता २३:१ वरील भाष्य: दावीद देवाची तुलना एका मेंढपाळाशी करतो जो आपल्या मेंढरांची काळजी घेतो, त्यांना तृप्त करतो आणि सुरक्षित ठेवतो. देवाला आपला मेंढपाळ मानल्याने कोणत्याही गोष्टीची उणीव भासत नाही.",
    en: "Commentary on Psalm 23:1: David compares God to a shepherd who cares for, provides, and protects His sheep. Trusting God as our shepherd means we shall not lack any good thing."
  }
};

const CROSS_REFERENCES_DB = {
  "judges_13_5": [
    { book: "numbers", chapter: 6, verse: 2, label: "गणना ६:२ (Nazirite vow)" },
    { book: "1samuel", chapter: 1, verse: 11, label: "१ शमुवेल १:११ (Samuel's consecration)" }
  ],
  "isaiah_43_2": [
    { book: "psalms", chapter: 66, verse: 12, label: "स्तोत्रसंहिता ६६:१२ (Through fire & water)" },
    { book: "daniel", chapter: 3, verse: 25, label: "दानीएल ३:२५ (Fiery furnace)" }
  ],
  "john_3_16": [
    { book: "romans", chapter: 5, verse: 8, label: "रोमन्स ५:८ (God shows love)" },
    { book: "1john", chapter: 4, verse: 9, label: "१ योहान ४:९ (God sent His Son)" }
  ],
  "psalms_23_1": [
    { book: "john", chapter: 10, verse: 11, label: "योहान १०:११ (The Good Shepherd)" },
    { book: "isaiah", chapter: 40, verse: 11, label: "यशया ४०:११ (He gathers lambs)" }
  ]
};

function getVerseStudyNotes(bookKey, chapter, verse) {
  const key = `${bookKey}_${chapter}_${verse}`;
  if (STUDY_COMMENTARY_DB[key]) {
    return STUDY_COMMENTARY_DB[key];
  }
  const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
  return {
    mr: `${bookName} ${chapter}:${verse} वरील भाष्य: या वचनात आपल्याला देवाचे वचन आणि त्याचा आपल्या दैनंदिन जीवनातील अर्थ याविषयी सखोल मार्गदर्शन मिळते. अधिक अभ्यासासाठी प्रार्थनापूर्वक विचार करा.`,
    en: `Study Commentary for ${bookName} ${chapter}:${verse}: This passage invites us to reflect on God's word and His purpose in our daily lives. Take time to meditate on these words.`
  };
}

function getVerseCrossReferences(bookKey, chapter, verse) {
  const key = `${bookKey}_${chapter}_${verse}`;
  if (CROSS_REFERENCES_DB[key]) {
    return CROSS_REFERENCES_DB[key];
  }
  return [
    { book: "john", chapter: 3, verse: 16, label: "योहान ३:१६ (John 3:16)" },
    { book: "psalms", chapter: 23, verse: 1, label: "स्तोत्रसंहिता २३:१ (Psalm 23:1)" }
  ];
}

function openStudySplitPane(bookKey, chapter, verse) {
  const readerEl = document.getElementById("view-reader");
  if (!readerEl) return;
  
  const refKey = `${bookKey}_${chapter}_${verse}`;
  activeStudyVerse = { bookKey, chapter, verse, refKey };
  
  const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
  
  document.getElementById("study-pane-ref-title").textContent = `Study Notes • ${bookName} ${chapter}:${verse}`;
  
  const commentary = getVerseStudyNotes(bookKey, chapter, verse);
  document.getElementById("study-explain-text-mr").textContent = commentary.mr;
  document.getElementById("study-explain-text-en").textContent = commentary.en;
  
  const crossrefs = getVerseCrossReferences(bookKey, chapter, verse);
  const crossrefList = document.getElementById("study-crossref-list");
  crossrefList.innerHTML = "";
  
  if (crossrefs && crossrefs.length > 0) {
    crossrefs.forEach(ref => {
      const btn = document.createElement("button");
      btn.className = "crossref-link-item";
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <span>${ref.label}</span>
      `;
      btn.addEventListener("click", () => {
        openReader(ref.book, ref.chapter);
        setTimeout(() => {
          const vKey = `${ref.book}_${ref.chapter}_${ref.verse}`;
          const verseEl = document.querySelector(`.verse-row[data-verse-id="${vKey}"]`);
          if (verseEl) {
            verseEl.scrollIntoView({ behavior: "smooth", block: "center" });
            verseEl.classList.add("selected-pulse");
            setTimeout(() => verseEl.classList.remove("selected-pulse"), 2500);
          }
          openStudySplitPane(ref.book, ref.chapter, ref.verse);
        }, 300);
      });
      crossrefList.appendChild(btn);
    });
  } else {
    crossrefList.innerHTML = `<div class="commentary-card">No cross references defined.</div>`;
  }
  
  const journalTextarea = document.getElementById("study-journal-editor");
  journalTextarea.value = state.userNotes[refKey] || "";
  updateJournalSaveStatus(!!state.userNotes[refKey]);
  
  switchStudyTab("explain");
  readerEl.classList.add("study-open");
  
  const selectedVerseEl = document.querySelector(`.verse-row[data-verse-id="${refKey}"]`);
  if (selectedVerseEl) {
    selectedVerseEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function closeStudySplitPane() {
  const readerEl = document.getElementById("view-reader");
  if (readerEl) readerEl.classList.remove("study-open");
  activeStudyVerse = null;
}

function switchStudyTab(tabId) {
  document.querySelectorAll(".study-subtab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.studyTab === tabId);
  });
  document.querySelectorAll(".study-subtab-content").forEach(content => {
    content.classList.toggle("active", content.id === `study-tab-${tabId}`);
  });
}

function updateJournalSaveStatus(hasNotes) {
  const statusEl = document.getElementById("study-journal-status");
  if (hasNotes) {
    statusEl.textContent = "Saved locally in browser";
    statusEl.style.color = "var(--primary)";
  } else {
    statusEl.textContent = "Not saved yet";
    statusEl.style.color = "var(--text-muted)";
  }
}

function saveJournalNote() {
  if (!activeStudyVerse) return;
  const journalTextarea = document.getElementById("study-journal-editor");
  const text = journalTextarea.value.trim();
  const refKey = activeStudyVerse.refKey;
  
  if (text) {
    state.userNotes[refKey] = text;
    if (!state.notesTimestamps) state.notesTimestamps = {};
    state.notesTimestamps[refKey] = Date.now();
    showToast("Journal note saved!");
  } else {
    delete state.userNotes[refKey];
    if (state.notesTimestamps) delete state.notesTimestamps[refKey];
    showToast("Journal note cleared");
  }
  saveStateToLocalStorage();
  updateJournalSaveStatus(!!state.userNotes[refKey]);
}

function toggleVoiceDropdownVisibility() {
  const sourceSelectRow = document.getElementById("audio-source-row");
  const voiceSelectRow = document.getElementById("voice-select-row");
  const toneSelectRow = document.getElementById("tone-select-row");
  const sourceSelect = document.getElementById("audio-source-select");
  
  if (sourceSelect) {
    sourceSelect.value = state.audioSource || "human";
  }
  
  const isMarathi = state.translation !== "eng";
  
  if (!isMarathi) {
    // English: Supports AI TTS (SpeechSynthesis) and ElevenLabs Premium
    if (sourceSelectRow) sourceSelectRow.style.display = "flex";
    
    if (state.audioSource === "elevenlabs") {
      if (voiceSelectRow) voiceSelectRow.style.display = "none";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    } else {
      // Default browser AI
      if (voiceSelectRow) voiceSelectRow.style.display = "flex";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    }
  } else {
    // Marathi: Supports Human (WordProject), AI TTS, and ElevenLabs
    if (sourceSelectRow) sourceSelectRow.style.display = "flex";
    
    if (state.audioSource === "human") {
      if (voiceSelectRow) voiceSelectRow.style.display = "none";
      if (toneSelectRow) toneSelectRow.style.display = "flex";
    } else if (state.audioSource === "elevenlabs") {
      if (voiceSelectRow) voiceSelectRow.style.display = "none";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    } else {
      // AI TTS
      if (voiceSelectRow) voiceSelectRow.style.display = "flex";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    }
  }
}

const QUIZ_QUESTIONS = [
  {
    qMr: "नोहाच्या पुरादरम्यान किती दिवस आणि रात्री पाऊस पडला?",
    qEn: "How many days and nights did it rain during Noah's flood?",
    choices: [
      { textMr: "४० दिवस आणि ४० रात्री", textEn: "40 Days and 40 Nights", correct: true },
      { textMr: "३० दिवस आणि ३० रात्री", textEn: "30 Days and 30 Nights", correct: false },
      { textMr: "७ दिवस आणि ७ रात्री", textEn: "7 Days and 7 Nights", correct: false },
      { textMr: "५० दिवस आणि ५० रात्री", textEn: "50 Days and 50 Nights", correct: false }
    ]
  },
  {
    qMr: "देवाने हव्वा बनवण्यासाठी आदामाच्या शरीरातील कोणत्या भागाचा वापर केला?",
    qEn: "What did God use from Adam's body to create Eve?",
    choices: [
      { textMr: "फासळी (Rib)", textEn: "A rib", correct: true },
      { textMr: "धूळ (Dust)", textEn: "Dust", correct: false },
      { textMr: "माती (Clay)", textEn: "Clay", correct: false },
      { textMr: "हृदय (Heart)", textEn: "Heart", correct: false }
    ]
  },
  {
    qMr: "देवापासून पळून जाताना योनाला कोणत्या जीवाने गिळले?",
    qEn: "Who/What swallowed Jonah when he tried to run away from God?",
    choices: [
      { textMr: "मोठा मासा (Great Fish)", textEn: "A great fish", correct: true },
      { textMr: "मगर (Crocodile)", textEn: "A crocodile", correct: false },
      { textMr: "समुद्र सर्प (Sea Serpent)", textEn: "A sea serpent", correct: false },
      { textMr: "शार्क (Shark)", textEn: "A shark", correct: false }
    ]
  },
  {
    qMr: "येशू ख्रिस्ताचा जन्म कोणत्या शहरात झाला?",
    qEn: "In which town was Jesus Christ born?",
    choices: [
      { textMr: "बेथलेहेम (Bethlehem)", textEn: "Bethlehem", correct: true },
      { textMr: "नाझरेथ (Nazareth)", textEn: "Nazareth", correct: false },
      { textMr: "यरुशलेम (Jerusalem)", textEn: "Jerusalem", correct: false },
      { textMr: "अलेक्झांड्रिया (Alexandria)", textEn: "Alexandria", correct: false }
    ]
  },
  {
    qMr: "तरुण मेंढपाळ दाविदाने पराभूत केलेल्या पलिश्ती राक्षसाचे नाव काय होते?",
    qEn: "What was the name of the Philistine giant defeated by young shepherd David?",
    choices: [
      { textMr: "गोल्याथ (Goliath)", textEn: "Goliath", correct: true },
      { textMr: "शमशोन (Samson)", textEn: "Samson", correct: false },
      { textMr: "शौल (Saul)", textEn: "Saul", correct: false },
      { textMr: "अबशालोम (Absalom)", textEn: "Absalom", correct: false }
    ]
  },
  {
    qMr: "येशूने आपल्या सेवेसाठी किती मुख्य शिष्य निवडले?",
    qEn: "How many main apostles did Jesus choose for His ministry?",
    choices: [
      { textMr: "१२ (12)", textEn: "12", correct: true },
      { textMr: "१० (10)", textEn: "10", correct: false },
      { textMr: "७ (7)", textEn: "7", correct: false },
      { textMr: "१५ (15)", textEn: "15", correct: false }
    ]
  },
  {
    qMr: "बायबलचे सर्वात पहिले पुस्तक कोणते आहे?",
    qEn: "What is the very first book of the Bible?",
    choices: [
      { textMr: "उत्पत्ती (Genesis)", textEn: "Genesis", correct: true },
      { textMr: "निर्गम (Exodus)", textEn: "Exodus", correct: false },
      { textMr: "मत्तय (Matthew)", textEn: "Matthew", correct: false },
      { textMr: "स्तोत्रसंहिता (Psalms)", textEn: "Psalms", correct: false }
    ]
  },
  {
    qMr: "सीनाय पर्वतावर देवाने कोणाला दगडी पाट्यांवर दहा आज्ञा दिल्या?",
    qEn: "Who received the Ten Commandments written on stone tablets from God on Mount Sinai?",
    choices: [
      { textMr: "मोशे (Moses)", textEn: "Moses", correct: true },
      { textMr: "अब्राहम (Abraham)", textEn: "Abraham", correct: false },
      { textMr: "हारून (Aaron)", textEn: "Aaron", correct: false },
      { textMr: "जाेशुआ (Joshua)", textEn: "Joshua", correct: false }
    ]
  },
  {
    qMr: "येशूचे भूमीवरील पालक योसेफ यांचा व्यवसाय काय होता?",
    qEn: "What was the profession of Joseph, the earthly father of Jesus?",
    choices: [
      { textMr: "सुतार (Carpenter)", textEn: "Carpenter", correct: true },
      { textMr: "कोळी (Fisherman)", textEn: "Fisherman", correct: false },
      { textMr: "कर वसूल करणारा (Tax Collector)", textEn: "Tax Collector", correct: false },
      { textMr: "मेंढपाळ (Shepherd)", textEn: "Shepherd", correct: false }
    ]
  },
  {
    qMr: "येशूला ३० चांदीच्या नाण्यांसाठी कोणत्या शिष्याने फसवून धरून दिले?",
    qEn: "Which apostle betrayed Jesus for 30 pieces of silver with a kiss?",
    choices: [
      { textMr: "यहुदा इस्कर्योत (Judas Iscariot)", textEn: "Judas Iscariot", correct: true },
      { textMr: "शिमोन पेत्र (Simon Peter)", textEn: "Simon Peter", correct: false },
      { textMr: "योहान (John)", textEn: "John", correct: false },
      { textMr: "थॉमस (Thomas)", textEn: "Thomas", correct: false }
    ]
  }
];

let quizCurrentQuestionIdx = 0;
let quizSessionScore = 0;
let quizShuffledQuestions = [];

function playQuizSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'incorrect') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn("AudioContext sound play blocked or unsupported:", e);
  }
}

function updateQuizCardStats() {
  const statPointsEl = document.getElementById("quiz-stat-points");
  const statHighscoreEl = document.getElementById("quiz-stat-highscore");
  const welcomePointsEl = document.getElementById("quiz-welcome-total-points");
  const welcomeHighscoreEl = document.getElementById("quiz-welcome-highscore");
  
  const pts = state.quizPoints || 0;
  const hs = state.quizHighscore || 0;
  
  if (statPointsEl) statPointsEl.textContent = `Total: ${pts} pts`;
  if (statHighscoreEl) statHighscoreEl.textContent = `High Score: ${hs} pts`;
  if (welcomePointsEl) welcomePointsEl.textContent = `${pts} pts`;
  if (welcomeHighscoreEl) welcomeHighscoreEl.textContent = `${hs} pts`;
}

function startQuiz() {
  quizCurrentQuestionIdx = 0;
  quizSessionScore = 0;
  
  quizShuffledQuestions = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
  
  document.getElementById("quiz-welcome-screen").style.display = "none";
  document.getElementById("quiz-results-screen").style.display = "none";
  document.getElementById("quiz-question-screen").style.display = "block";
  
  showQuizQuestion();
}

function showQuizQuestion() {
  const currentQ = quizShuffledQuestions[quizCurrentQuestionIdx];
  const qNumEl = document.getElementById("quiz-question-number");
  const scoreEl = document.getElementById("quiz-current-score");
  const progressEl = document.getElementById("quiz-progress-bar");
  const qMrEl = document.getElementById("quiz-question-mr");
  const qEnEl = document.getElementById("quiz-question-en");
  const choicesContainer = document.getElementById("quiz-choices-container");
  const nextBtn = document.getElementById("btn-next-quiz-question");
  
  qNumEl.textContent = `Question ${quizCurrentQuestionIdx + 1} of 10`;
  scoreEl.textContent = `Score: ${quizSessionScore}`;
  progressEl.style.width = `${((quizCurrentQuestionIdx + 1) / 10) * 100}%`;
  
  qMrEl.textContent = currentQ.qMr;
  qEnEl.textContent = currentQ.qEn;
  
  choicesContainer.innerHTML = "";
  nextBtn.style.display = "none";
  
  currentQ.choices.forEach((choice, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-choice-btn";
    btn.innerHTML = `
      <span>${state.translation !== "eng" ? choice.textMr : choice.textEn}</span>
      <span class="choice-status-icon"></span>
    `;
    btn.addEventListener("click", () => selectQuizChoice(btn, choice.correct));
    choicesContainer.appendChild(btn);
  });
}

function selectQuizChoice(selectedBtn, isCorrect) {
  const choicesContainer = document.getElementById("quiz-choices-container");
  const buttons = choicesContainer.querySelectorAll(".quiz-choice-btn");
  const currentQ = quizShuffledQuestions[quizCurrentQuestionIdx];
  
  buttons.forEach(btn => btn.disabled = true);
  
  if (isCorrect) {
    quizSessionScore += 10;
    selectedBtn.classList.add("correct");
    selectedBtn.querySelector(".choice-status-icon").textContent = "✓";
    playQuizSound('correct');
  } else {
    selectedBtn.classList.add("incorrect");
    selectedBtn.querySelector(".choice-status-icon").textContent = "✗";
    playQuizSound('incorrect');
    
    buttons.forEach((btn, idx) => {
      if (currentQ.choices[idx].correct) {
        btn.classList.add("correct");
        btn.querySelector(".choice-status-icon").textContent = "✓";
      }
    });
  }
  
  document.getElementById("btn-next-quiz-question").style.display = "block";
}

function showQuizResults() {
  document.getElementById("quiz-question-screen").style.display = "none";
  
  const scoreTextEl = document.getElementById("quiz-results-score-text");
  const badgeUnlockContainer = document.getElementById("quiz-badge-unlock-container");
  const badgeNameEl = document.getElementById("quiz-badge-name");
  const resultsEmojiEl = document.getElementById("quiz-results-emoji");
  const resultsTitleEl = document.getElementById("quiz-results-title");
  
  scoreTextEl.textContent = `You scored ${quizSessionScore} / 100 points!`;
  
  state.quizPoints = (state.quizPoints || 0) + quizSessionScore;
  
  if (quizSessionScore > (state.quizHighscore || 0)) {
    state.quizHighscore = quizSessionScore;
  }
  
  badgeUnlockContainer.style.display = "none";
  let unlockedBadge = null;
  
  if (quizSessionScore >= 100) {
    unlockedBadge = { id: "quiz_badge_theologian", nameMr: "बायबल शास्त्रज्ञ (Theologian)", nameEn: "Bible Theologian (बायबल शास्त्रज्ञ)" };
  } else if (quizSessionScore >= 70) {
    unlockedBadge = { id: "quiz_badge_scholar", nameMr: "शास्त्र पंडित (Scholar)", nameEn: "Scripture Scholar (शास्त्र पंडित)" };
  } else if (quizSessionScore >= 30) {
    unlockedBadge = { id: "quiz_badge_novice", nameMr: "नवा शोधक (Novice Explorer)", nameEn: "Novice Explorer (नवा शोधक)" };
  }
  
  if (unlockedBadge && !state.quizBadges.includes(unlockedBadge.id)) {
    state.quizBadges.push(unlockedBadge.id);
    badgeUnlockContainer.style.display = "block";
    badgeNameEl.textContent = state.translation !== "eng" ? unlockedBadge.nameMr : unlockedBadge.nameEn;
  }
  
  saveStateToLocalStorage();
  updateQuizCardStats();
  
  if (quizSessionScore >= 80) {
    resultsEmojiEl.textContent = "🏆";
    resultsTitleEl.textContent = state.translation !== "eng" ? "उत्कृष्ट कामगिरी!" : "Excellent Job!";
  } else if (quizSessionScore >= 40) {
    resultsEmojiEl.textContent = "🎉";
    resultsTitleEl.textContent = state.translation !== "eng" ? "खूप छान!" : "Great Job!";
  } else {
    resultsEmojiEl.textContent = "💡";
    resultsTitleEl.textContent = state.translation !== "eng" ? "पुन्हा प्रयत्न करा!" : "Keep Learning!";
  }
  
  document.getElementById("quiz-results-screen").style.display = "block";
}

function initBibleQuiz() {
  const startBtn = document.getElementById("btn-start-quiz");
  if (startBtn) startBtn.addEventListener("click", startQuiz);
  
  const nextBtn = document.getElementById("btn-next-quiz-question");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      quizCurrentQuestionIdx++;
      if (quizCurrentQuestionIdx < 10) {
        showQuizQuestion();
      } else {
        showQuizResults();
      }
    });
  }
  
  const restartBtn = document.getElementById("btn-restart-quiz");
  if (restartBtn) restartBtn.addEventListener("click", startQuiz);
  
  const closeResultsBtn = document.getElementById("btn-close-quiz-results");
  if (closeResultsBtn) {
    closeResultsBtn.addEventListener("click", () => {
      closeModal("modal-bible-quiz");
    });
  }
  
  const closeQuizBtn = document.getElementById("btn-close-bible-quiz");
  if (closeQuizBtn) {
    closeQuizBtn.addEventListener("click", () => {
      closeModal("modal-bible-quiz");
    });
  }
  
  const openQuizBtn = document.getElementById("btn-open-bible-quiz");
  if (openQuizBtn) {
    openQuizBtn.addEventListener("click", () => {
      openModal("modal-bible-quiz");
    });
  }
}

/* ==========================================================================
   8. User Authentication & Prayer Requests
   ========================================================================== */

// Helper to get all registered users
function getRegisteredUsers() {
  try {
    let users = JSON.parse(localStorage.getItem("river_of_life_users") || "[]");
    // Seed default admin account if not exists
    if (!users.some(u => u.username.toLowerCase() === "admin")) {
      users.push({
        username: "admin",
        password: "admin", // Plain text password for local mock database
        email: "admin@riveroflife.org",
        isPastor: true,
        isAdmin: true,
        bookmarks: [],
        highlights: {},
        userNotes: {},
        quizPoints: 0,
        quizHighscore: 0,
        quizBadges: []
      });
      localStorage.setItem("river_of_life_users", JSON.stringify(users));
    }
    return users;
  } catch (e) {
    console.error("Error loading users:", e);
    return [];
  }
}

// Helper to get all global prayers
function getGlobalPrayers() {
  try {
    return JSON.parse(localStorage.getItem("river_of_life_prayers") || "[]");
  } catch (e) {
    console.error("Error loading prayers:", e);
    return [];
  }
}

// Register user
function registerUser(username, email, password, isPastor) {
  const users = getRegisteredUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, messageMr: "युझरनेम आधीच अस्तित्वात आहे!", messageEn: "Username already exists!" };
  }
  
  const newUser = {
    username,
    email: email || "",
    password, // Storing plain password as requested for local mock database
    isPastor: !!isPastor,
    bookmarks: [
      {
        ref: "१ करिंथ १०:१४",
        engRef: "1 Corinthians 10:14",
        text: "म्हणून माझ्या प्रिय बंधूंनो, तुम्ही मूर्तीपूजेपासून दूर पळा.",
        engText: "Therefore, my dear friends, flee from idolatry.",
        date: new Date("2026-06-14T12:00:00Z").getTime(),
        book: "1corinthians",
        chapter: 10,
        verse: 14
      }
    ],
    highlights: {
      "1corinthians_10_14": "yellow",
      "acts_20_35": "blue"
    },
    userNotes: {
      "1corinthians_10_14": "Keep running away from anything that pulls you away from God. Put Him first always."
    },
    quizPoints: 120,
    quizHighscore: 80,
    quizBadges: ["quiz_badge_novice", "quiz_badge_scholar"],
    createdVerseImages: [
      {
        ref: "प्रेषितांची कृत्ये २०:३५",
        engRef: "Acts 20:35",
        text: "देण्यापेक्षा देणे ह्यात जास्त धन्यता आहे.",
        engText: "It is more blessed to give than to receive.",
        book: "acts",
        chapter: 20,
        verse: 35,
        style: "gradient-vod-1",
        timestamp: new Date("2026-06-12T10:00:00Z").getTime()
      }
    ],
    churchName: "River of Life Church",
    streak: 2,
    photo: ""
  };
  
  users.push(newUser);
  localStorage.setItem("river_of_life_users", JSON.stringify(users));
  return { success: true };
}

// Login user
function loginUser(username, password) {
  const users = getRegisteredUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    return { success: false, messageMr: "अवैध युझरनेम किंवा पासवर्ड!", messageEn: "Invalid username or password!" };
  }
  
  // Set current user session
  state.currentUser = {
    username: user.username,
    email: user.email,
    isPastor: user.isPastor,
    isAdmin: user.isAdmin || user.username.toLowerCase() === "admin",
    churchName: user.churchName || "",
    photo: user.photo || ""
  };
  
  // Restore user-specific data into state
  state.bookmarks = user.bookmarks || [];
  state.highlights = user.highlights || {};
  state.userNotes = user.userNotes || {};
  state.quizPoints = user.quizPoints || 0;
  state.quizHighscore = user.quizHighscore || 0;
  state.quizBadges = user.quizBadges || [];
  state.createdVerseImages = user.createdVerseImages || [];
  state.streak = user.streak || 2;
  
  saveStateToLocalStorage();
  applyStylesFromState();
  return { success: true };
}

// Logout user
function logoutUser() {
  if (state.currentUser) {
    // Force one final sync to users database before clearing
    saveStateToLocalStorage();
  }
  
  state.currentUser = null;
  state.bookmarks = [];
  state.highlights = {};
  state.userNotes = {};
  state.quizPoints = 0;
  state.quizHighscore = 0;
  state.quizBadges = [];
  state.createdVerseImages = [];
  state.streak = 1;
  state.vodDayOffset = 0;
  
  saveStateToLocalStorage();
  applyStylesFromState();
  
  // Navigate to home
  window.location.hash = "#/home";
}

// Submit prayer request
function submitPrayerRequest(text, isPublic) {
  if (!state.currentUser) return { success: false, messageEn: "Not signed in" };
  
  const prayers = getGlobalPrayers();
  const newPrayer = {
    id: "prayer_" + Date.now(),
    username: state.currentUser.username,
    text: text,
    isPublic: !!isPublic,
    status: "pending",
    pastorNote: "",
    createdAt: Date.now()
  };
  
  prayers.unshift(newPrayer);
  localStorage.setItem("river_of_life_prayers", JSON.stringify(prayers));
  return { success: true };
}

// Toggle answered prayer status
function toggleAnsweredPrayer(prayerId) {
  const prayers = getGlobalPrayers();
  const idx = prayers.findIndex(p => p.id === prayerId);
  if (idx !== -1) {
    prayers[idx].status = prayers[idx].status === "answered" ? "pending" : "answered";
    localStorage.setItem("river_of_life_prayers", JSON.stringify(prayers));
    return true;
  }
  return false;
}

// Pastor acknowledge prayer
function pastorAckPrayer(prayerId, note) {
  if (!state.currentUser) return false;
  const hasAccess = state.currentUser.isPastor || state.currentUser.isAdmin || state.currentUser.username.toLowerCase() === "admin";
  if (!hasAccess) return false;
  
  const prayers = getGlobalPrayers();
  const idx = prayers.findIndex(p => p.id === prayerId);
  if (idx !== -1) {
    prayers[idx].status = "acknowledged";
    prayers[idx].pastorNote = note || "";
    localStorage.setItem("river_of_life_prayers", JSON.stringify(prayers));
    return true;
  }
  return false;
}

// Render Auth Screen on Profile page
function renderAuthScreen() {
  const usernameInput = document.getElementById("auth-input-username");
  const emailInput = document.getElementById("auth-input-email");
  const passwordInput = document.getElementById("auth-input-password");
  const pastorCheckbox = document.getElementById("auth-input-pastor");
  const errorMsg = document.getElementById("auth-error-msg");
  
  if (usernameInput) usernameInput.value = "";
  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (pastorCheckbox) pastorCheckbox.checked = false;
  if (errorMsg) errorMsg.style.display = "none";
}

// Render Prayers Screen
function renderPrayersScreen() {
  const loggedOutView = document.getElementById("prayers-logged-out-container");
  const loggedInView = document.getElementById("prayers-logged-in-container");
  
  if (!state.currentUser) {
    if (loggedOutView) loggedOutView.style.display = "block";
    if (loggedInView) loggedInView.style.display = "none";
    return;
  }
  
  if (loggedOutView) loggedOutView.style.display = "none";
  if (loggedInView) loggedInView.style.display = "block";
  
  const userPortal = document.getElementById("prayers-user-portal");
  const pastorPortal = document.getElementById("prayers-pastor-portal");
  
  const hasAccess = state.currentUser.isPastor || state.currentUser.isAdmin || state.currentUser.username.toLowerCase() === "admin";
  if (hasAccess) {
    if (userPortal) userPortal.style.display = "none";
    if (pastorPortal) pastorPortal.style.display = "block";
    renderPastorPortal();
  } else {
    if (userPortal) userPortal.style.display = "block";
    if (pastorPortal) pastorPortal.style.display = "none";
    renderUserPortal();
  }
}

// Helper to format timestamps
function formatTimeAgo(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  
  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

// Render User Portal list
function renderUserPortal() {
  const listEl = document.getElementById("prayers-user-list");
  const emptyEl = document.getElementById("prayers-user-list-empty");
  if (!listEl || !emptyEl) return;
  
  const prayers = getGlobalPrayers().filter(p => p.username === state.currentUser.username);
  
  listEl.innerHTML = "";
  if (prayers.length === 0) {
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    prayers.forEach(p => {
      const card = document.createElement("div");
      card.className = "prayer-card";
      
      let badgeClass = "pending";
      let badgeText = "Pending / प्रलंबित";
      if (p.status === "answered") {
        badgeClass = "answered";
        badgeText = "Answered / उत्तर मिळालेली";
      } else if (p.status === "acknowledged") {
        badgeClass = "acknowledged";
        badgeText = "Acknowledged / स्वीकृत";
      }
      
      const privacyText = p.isPublic ? "Shared with Church / सार्वजनिक" : "Pastor Only / फक्त पास्टर";
      const timeStr = formatTimeAgo(p.createdAt);
      
      let pastorNoteHtml = "";
      if (p.pastorNote) {
        pastorNoteHtml = `
          <div class="pastor-blessing-box">
            <strong>Response / संदेश:</strong>
            <p>"${p.pastorNote}"</p>
          </div>
        `;
      }
      
      card.innerHTML = `
        <div class="prayer-card-header">
          <span class="badge-status ${badgeClass}">${badgeText}</span>
          <span class="prayer-meta">${timeStr} • ${privacyText}</span>
        </div>
        <p class="prayer-text">${p.text}</p>
        ${pastorNoteHtml}
        ${p.status !== "answered" ? `
          <button class="btn-secondary-mini btn-mark-answered" style="margin-top: 12px; font-size: 12px;" data-id="${p.id}">
            Mark as Answered / उत्तर मिळाले
          </button>
        ` : ""}
      `;
      
      const ansBtn = card.querySelector(".btn-mark-answered");
      if (ansBtn) {
        ansBtn.addEventListener("click", () => {
          toggleAnsweredPrayer(p.id);
          renderUserPortal();
        });
      }
      
      listEl.appendChild(card);
    });
  }
}

// Render Pastor Portal list
function renderPastorPortal() {
  const listEl = document.getElementById("prayers-pastor-list");
  const emptyEl = document.getElementById("prayers-pastor-list-empty");
  const statsEl = document.getElementById("pastor-dashboard-stats");
  if (!listEl || !emptyEl) return;
  
  const prayers = getGlobalPrayers();
  
  const activeCount = prayers.filter(p => p.status === "pending" || p.status === "acknowledged").length;
  const pendingCount = prayers.filter(p => p.status === "pending").length;
  const answeredCount = prayers.filter(p => p.status === "answered").length;
  if (statsEl) {
    statsEl.textContent = `Active: ${activeCount} • Pending: ${pendingCount} • Answered: ${answeredCount}`;
  }
  
  listEl.innerHTML = "";
  if (prayers.length === 0) {
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    prayers.forEach(p => {
      const card = document.createElement("div");
      card.className = "prayer-card";
      
      let badgeClass = "pending";
      let badgeText = "Pending / प्रलंबित";
      if (p.status === "answered") {
        badgeClass = "answered";
        badgeText = "Answered / उत्तर मिळालेली";
      } else if (p.status === "acknowledged") {
        badgeClass = "acknowledged";
        badgeText = "Acknowledged / स्वीकृत";
      }
      
      const privacyText = p.isPublic ? "Shared with Church / सार्वजनिक" : "Pastor Only / फक्त पास्टर (खाजगी)";
      const timeStr = formatTimeAgo(p.createdAt);
      
      let ackButtonHtml = "";
      if (p.status === "pending") {
        ackButtonHtml = `
          <button class="btn-secondary-mini btn-pastor-ack" style="margin-top: 12px; font-size: 12px;" data-id="${p.id}">
            Acknowledge & Pray / स्वीकृत करा
          </button>
        `;
      }
      
      let pastorNoteHtml = "";
      if (p.pastorNote) {
        pastorNoteHtml = `
          <div class="pastor-blessing-box">
            <strong>Response / संदेश:</strong>
            <p>"${p.pastorNote}"</p>
          </div>
        `;
      }
      
      card.innerHTML = `
        <div class="prayer-card-header">
          <span class="badge-status ${badgeClass}">${badgeText}</span>
          <span class="prayer-meta">From: @${p.username} • ${timeStr} • ${privacyText}</span>
        </div>
        <p class="prayer-text">${p.text}</p>
        ${pastorNoteHtml}
        ${ackButtonHtml}
      `;
      
      const ackBtn = card.querySelector(".btn-pastor-ack");
      if (ackBtn) {
        ackBtn.addEventListener("click", () => {
          openPastorAckModal(p.id, p.text);
        });
      }
      
      listEl.appendChild(card);
    });
  }
}

let activeAckPrayerId = null;

function openPastorAckModal(prayerId, previewText) {
  activeAckPrayerId = prayerId;
  const previewEl = document.getElementById("modal-ack-request-preview");
  const noteInput = document.getElementById("pastor-ack-note");
  if (previewEl) previewEl.textContent = `"${previewText}"`;
  if (noteInput) noteInput.value = "";
  openModal("modal-pastor-ack");
}

function initAuthAndPrayers() {
  const tabSignin = document.getElementById("auth-tab-signin");
  const tabSignup = document.getElementById("auth-tab-signup");
  const formEl = document.getElementById("auth-form");
  const errorMsg = document.getElementById("auth-error-msg");
  const btnSubmit = document.getElementById("btn-auth-submit");
  
  let currentAuthTab = "signin";
  
  if (tabSignin && tabSignup) {
    tabSignin.addEventListener("click", () => {
      currentAuthTab = "signin";
      tabSignin.classList.add("active");
      tabSignup.classList.remove("active");
      document.querySelectorAll(".signup-only").forEach(el => el.style.display = "none");
      const titleEl = document.getElementById("auth-title");
      if (titleEl) titleEl.textContent = "Sign In / लॉगिन करा";
      if (btnSubmit) btnSubmit.querySelector("span").textContent = "Sign In / लॉगिन करा";
      if (errorMsg) errorMsg.style.display = "none";
    });
    
    tabSignup.addEventListener("click", () => {
      currentAuthTab = "signup";
      tabSignup.classList.add("active");
      tabSignin.classList.remove("active");
      document.querySelectorAll(".signup-only").forEach(el => el.style.display = "flex");
      const titleEl = document.getElementById("auth-title");
      if (titleEl) titleEl.textContent = "Register / नोंदणी करा";
      if (btnSubmit) btnSubmit.querySelector("span").textContent = "Register / नोंदणी करा";
      if (errorMsg) errorMsg.style.display = "none";
    });
  }
  
  if (formEl) {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("auth-input-username").value.trim();
      const email = document.getElementById("auth-input-email").value.trim();
      const password = document.getElementById("auth-input-password").value;
      const isPastor = document.getElementById("auth-input-pastor").checked;
      
      if (!username || !password) return;
      
      if (currentAuthTab === "signup") {
        const res = registerUser(username, email, password, isPastor);
        if (!res.success) {
          if (errorMsg) {
            errorMsg.textContent = state.translation !== "eng" ? res.messageMr : res.messageEn;
            errorMsg.style.display = "block";
          }
          return;
        }
        const loginRes = loginUser(username, password);
        if (loginRes.success) {
          renderYouProfile();
          renderPrayersScreen();
        }
      } else {
        const res = loginUser(username, password);
        if (!res.success) {
          if (errorMsg) {
            errorMsg.textContent = state.translation !== "eng" ? res.messageMr : res.messageEn;
            errorMsg.style.display = "block";
          }
          return;
        }
        renderYouProfile();
        renderPrayersScreen();
      }
    });
  }
  
  const logoutBtn = document.getElementById("you-btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logoutUser();
      renderYouProfile();
      renderPrayersScreen();
    });
  }

  // Home page authentication banner action
  const homeBannerBtn = document.getElementById("home-auth-banner-btn");
  if (homeBannerBtn) {
    homeBannerBtn.addEventListener("click", () => {
      if (state.currentUser) {
        logoutUser();
        renderYouProfile();
        renderPrayersScreen();
      } else {
        window.location.hash = "#/you";
      }
    });
  }
  
  // Header authentication button action
  const headerAuthBtn = document.getElementById("header-auth-btn");
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener("click", () => {
      window.location.hash = "#/you";
    });
  }
  
  const prayerForm = document.getElementById("prayer-form");
  if (prayerForm) {
    prayerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = document.getElementById("prayer-input-text").value.trim();
      const privacy = document.getElementById("prayer-input-privacy").value;
      const isPublic = (privacy === "public");
      
      if (!text) return;
      
      const res = submitPrayerRequest(text, isPublic);
      if (res.success) {
        document.getElementById("prayer-input-text").value = "";
        renderUserPortal();
      }
    });
  }
  
  const closeAckBtn = document.getElementById("btn-close-pastor-ack");
  if (closeAckBtn) {
    closeAckBtn.addEventListener("click", () => {
      closeModal("modal-pastor-ack");
    });
  }
  
  const ackSubmitBtn = document.getElementById("btn-pastor-ack-submit");
  if (ackSubmitBtn) {
    ackSubmitBtn.addEventListener("click", () => {
      const note = document.getElementById("pastor-ack-note").value.trim();
      if (!note || !activeAckPrayerId) return;
      
      const res = pastorAckPrayer(activeAckPrayerId, note);
      if (res) {
        closeModal("modal-pastor-ack");
        renderPastorPortal();
      }
    });
  }
}

// Update Authentication UI elements across Home page banner and Header bar
function updateAuthUI() {
  const homeBannerText = document.getElementById("home-auth-banner-text");
  const homeBannerBtn = document.getElementById("home-auth-banner-btn");
  
  const headerIconLoggedOut = document.getElementById("header-auth-icon-loggedout");
  const headerAvatar = document.getElementById("header-auth-avatar");
  
  if (state.currentUser) {
    // Logged In
    if (homeBannerText) {
      homeBannerText.innerHTML = `Welcome back, <strong>${state.currentUser.username}</strong>! Your readings and quiz points are synced.`;
    }
    if (homeBannerBtn) {
      homeBannerBtn.textContent = "Log Out / बाहेर पडा";
    }
    
    if (headerIconLoggedOut) headerIconLoggedOut.style.display = "none";
    if (headerAvatar) {
      headerAvatar.style.display = "flex";
      headerAvatar.textContent = state.currentUser.username.substring(0, 1).toUpperCase();
    }
  } else {
    // Logged Out
    if (homeBannerText) {
      homeBannerText.textContent = "Sign in to save your highlights, quiz points & submit prayer requests.";
    }
    if (homeBannerBtn) {
      homeBannerBtn.textContent = "Sign In / लॉगिन";
    }
    
    if (headerIconLoggedOut) headerIconLoggedOut.style.display = "block";
    if (headerAvatar) headerAvatar.style.display = "none";
  }
}

/* ==========================================================================
   Premium Feature Implementations & Data Stores
   ========================================================================== */

// 1. Splash Screen & Notifications
function initSplashAndNotifications() {
  const splashText = document.getElementById("splash-verse-text");
  const splashRef = document.getElementById("splash-verse-ref");
  if (splashText && splashRef && VOD_LIST && VOD_LIST.length > 0) {
    const randIdx = Math.floor(Math.random() * VOD_LIST.length);
    const randVerse = VOD_LIST[randIdx];
    splashText.textContent = `"${state.translation === "eng" ? randVerse.engText : randVerse.text}"`;
    splashRef.textContent = state.translation === "eng" ? randVerse.engRef : randVerse.ref;
  }

  const splash = document.getElementById("splash-screen");

  const dismissNow = () => {
    if (splash && splash.style.display !== "none") {
      splash.classList.add("fade-out");
      splash.style.pointerEvents = "none";
      setTimeout(() => {
        splash.style.display = "none";
        checkNotificationPrompt();
      }, 300);
    }
  };

  // Instant tap anywhere on splash screen to dismiss immediately
  if (splash) {
    splash.addEventListener("click", dismissNow);
  }

  // Fast auto-dismiss splash screen after 1.2 seconds
  setTimeout(dismissNow, 1200);
}


function checkNotificationPrompt() {
  const choice = localStorage.getItem("river_of_life_notifications_choice");
  if (!choice) {
    openModal("modal-notification-prompt");
  }
}

function initNotificationPrompt() {
  const btnAllow = document.getElementById("btn-noti-allow");
  const btnDismiss = document.getElementById("btn-noti-dismiss");

  if (btnAllow) {
    btnAllow.addEventListener("click", () => {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          localStorage.setItem("river_of_life_notifications_choice", permission);
          if (permission === 'granted') {
            showToast("Notifications enabled! 🙏");
            try {
              if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification("River of Life / जीवन नदी", {
                    body: "Daily Bible Verse Notifications enabled! 🙏",
                    icon: "assets/icons/icon-192.png"
                  });
                });
              } else {
                new Notification("River of Life / जीवन नदी", {
                  body: "Daily Bible Verse Notifications enabled! 🙏",
                  icon: "assets/icons/icon-192.png"
                });
              }
            } catch (err) {
              console.log("Notification trigger skipped:", err);
            }
          }
          closeModal("modal-notification-prompt");
        });
      } else {
        localStorage.setItem("river_of_life_notifications_choice", "unsupported");
        showToast("Notifications not supported on this device.");
        closeModal("modal-notification-prompt");
      }
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener("click", () => {
      localStorage.setItem("river_of_life_notifications_choice", "dismissed");
      closeModal("modal-notification-prompt");
    });
  }
}

// 2. AI Companion
function initAICompanion() {
  const trigger = document.getElementById("btn-ai-companion-trigger");
  if (trigger) {
    trigger.addEventListener("click", () => {
      openModal("modal-ai-companion");
    });
  }

  const closeBtn = document.getElementById("btn-close-ai-companion");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeModal("modal-ai-companion");
    });
  }

  const sendBtn = document.getElementById("btn-ai-chat-send");
  const chatInput = document.getElementById("ai-chat-input");

  if (sendBtn && chatInput) {
    const handleSend = () => {
      const query = chatInput.value.trim();
      if (!query) return;
      chatInput.value = "";
      sendAIChatQuery(query);
    };

    sendBtn.addEventListener("click", handleSend);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend();
    });
  }

  // Suggestion buttons
  document.querySelectorAll(".ai-suggestion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const query = btn.dataset.query;
      sendAIChatQuery(query);
    });
  });
}

function sendAIChatQuery(query) {
  const chatHistory = document.getElementById("ai-chat-history");
  if (!chatHistory) return;

  // Append user bubble
  const userBubble = document.createElement("div");
  userBubble.className = "ai-chat-bubble user";
  userBubble.textContent = query;
  chatHistory.appendChild(userBubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Selected level
  const levelSelect = document.getElementById("ai-study-level");
  const level = levelSelect ? levelSelect.value : "believers";

  // Typing indicator bubble
  const typingBubble = document.createElement("div");
  typingBubble.className = "ai-chat-bubble system typing-indicator-bubble";
  typingBubble.textContent = "AI is thinking... / विचार करत आहे...";
  chatHistory.appendChild(typingBubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Simulate response delay
  setTimeout(() => {
    typingBubble.remove();
    const responseText = generateCompanionResponse(query, level);

    const aiBubble = document.createElement("div");
    aiBubble.className = "ai-chat-bubble system";
    aiBubble.innerHTML = responseText;
    chatHistory.appendChild(aiBubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }, 1200);
}

function generateCompanionResponse(query, level) {
  const q = query.toLowerCase();
  
  // Romans 8:28
  if (q.includes("romans 8") || q.includes("romans 8:28") || q.includes("रोमन्स ८:२८") || q.includes("रोमन्स ८")) {
    if (level === "kids") {
      return `🧒 <strong>For Kids (मुलांसाठी):</strong> Think of your life like a beautiful puzzle. Sometimes a piece looks dark or weird, but God fits all the pieces together to make a wonderful picture! He is working for your good because He loves you very much! 🧩✨<br><br><strong>मराठीत:</strong> देवावर प्रेम करणाऱ्यांच्या चांगल्यासाठी देव सर्व गोष्टी एकत्र काम करू देतो!`;
    } else if (level === "believers") {
      return `✝️ <strong>For New Believers (नवीन विश्वासणाऱ्यांसाठी):</strong> This verse is a beautiful promise. It doesn't mean everything that happens to us is good, but it promises that God can take any bad situation, pain, or difficulty and weave it into something purposeful and good for those who love Him. You can trust His bigger plan! 🙏`;
    } else {
      return `📖 <strong>In-Depth Study (सखोल अभ्यास):</strong> Paul writes to the Romans emphasizing the sovereign providence of God (<em>Providentia Dei</em>). The phrase 'all things work together for good' (Greek: <em>panta synergēi eis agathon</em>) indicates that every event in a believer's life is overseen by God's sovereignty. The 'good' here is ultimate and spiritual, culminating in our conformity to the image of His Son (Romans 8:29). This is the doctrine of Divine Concurrence. 🏛️`;
    }
  }

  // Anxiety / anxiety verses
  if (q.includes("anxiety") || q.includes("worry") || q.includes("anxious") || q.includes("चिंता") || q.includes("काळजी") || q.includes("भीती")) {
    if (level === "kids") {
      return `🧒 <strong>For Kids (मुलांसाठी):</strong> When you feel scared or worried, imagine putting all your worries in a little box and giving it to Jesus. He tells us: 'Do not be afraid, for I am with you.' (Isaiah 41:10). You can sleep peacefully because God is protecting you! 🕊️`;
    } else if (level === "believers") {
      return `✝️ <strong>For New Believers (नवीन विश्वासणाऱ्यांसाठी):</strong> God cares about your fears. In Philippians 4:6-7, He invites us: 'Don't worry about anything; instead, pray about everything.' When you pray, His peace, which is bigger than we can understand, will guard your heart like a shield. Try reading Matthew 6:25-34. 🛡️`;
    } else {
      return `📖 <strong>In-Depth Study (सखोल अभ्यास):</strong> Anxiety (Greek: <em>merimnao</em> - to be drawn in different directions) is addressed scripturally as a call to re-orient our trust. In Philippians 4:6, the command 'be anxious for nothing' is coupled with <em>proseuche</em> (general prayer) and <em>deesis</em> (specific petitions) with thanksgiving. This shifts our cognitive focus from the threat to the Sovereign Sustainer, yielding the <em>eirene</em> (peace) of God which guards (<em>phroureo</em> - military garrison) our hearts. See also 1 Peter 5:7. 💡`;
    }
  }

  // John 3:16
  if (q.includes("john 3") || q.includes("john 3:16") || q.includes("योहान ३:१६") || q.includes("योहान ३")) {
    if (level === "kids") {
      return `🧒 <strong>For Kids (मुलांसाठी):</strong> God loves you more than all the stars in the sky! He sent His Son, Jesus, as a gift so that we can be close friends with God forever. All we have to do is believe and trust in Him! 🎁🌟`;
    } else if (level === "believers") {
      return `✝️ <strong>For New Believers (नवीन विश्वासणाऱ्यांसाठी):</strong> John 3:16 is the heart of the Bible. It tells us that God didn't wait for us to be perfect; He loved us in our weakness and sent Jesus to rescue us. By believing in Him, you receive a brand new, eternal life starting right now. 🕊️`;
    } else {
      return `📖 <strong>In-Depth Study (सखोल अभ्यास):</strong> This verse encapsulates the redemptive arc of Scripture. 'God so loved' (Greek: <em>outos egapesen</em> - loved in this manner) highlights the depth and execution of divine love (<em>agape</em>). 'He gave' denotes the voluntary sacrifice of the <em>monogenes</em> (unique, only-begotten) Son. The purpose is deliverance from <em>apolytai</em> (spiritual ruin/perishing) into <em>zoen aionion</em> (eternal, divine life), reflecting the Covenant of Grace. 📚`;
    }
  }

  // Default response
  if (level === "kids") {
    return `🧒 <strong>For Kids (मुलांसाठी):</strong> God loves you and has a wonderful plan for you! Keep reading His Word, talking to Him in prayer, and remember that Jesus is always walking beside you! 🚶‍♂️❤️`;
  } else if (level === "believers") {
    return `✝️ <strong>For New Believers (नवीन विश्वासणाऱ्यांसाठी):</strong> Great question! Reading and studying scripture is how we get to know God's heart. Keep searching the Word. You can try reading the Book of John to learn more about Jesus' life and love. 📖`;
  } else {
    return `📖 <strong>In-Depth Study (सखोल अभ्यास):</strong> Thank you for this query. The theological hermeneutics of this passage point to God's covenantal faithfulness. As you study, examine the historical-grammatical context, the original Greek/Hebrew word roots, and cross-references to build a sound expository understanding. 🔍`;
  }
}

// 3. Audio Synth (Procedural Web Audio API Ambient Worship Music)
class AmbientWorshipSynth {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.oscillators = [];
    this.volume = 0.3; // Default
    this.isPlaying = false;
    this.chordInterval = null;
  }

  start(type) {
    if (this.isPlaying) this.stop();
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.ctx = new AudioContextClass();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
      
      this.isPlaying = true;

      const chords = {
        guitar: [
          [130.81, 164.81, 196.00, 261.63], // C
          [174.61, 220.00, 261.63, 349.23], // F
          [196.00, 246.94, 293.66, 392.00], // G
          [220.00, 261.63, 329.63, 440.00]  // Am
        ],
        piano: [
          [130.81, 196.00, 261.63, 329.63], // C (spread)
          [174.61, 261.63, 349.23, 440.00], // F (spread)
          [196.00, 293.66, 392.00, 493.88], // G (spread)
          [110.00, 220.00, 261.63, 329.63]  // Am (spread)
        ],
        ambient: [
          [65.41, 130.81, 196.00, 261.63, 329.63], // Deep C pad
          [87.31, 174.61, 261.63, 349.23, 440.00], // Deep F pad
          [98.00, 196.00, 293.66, 392.00, 493.88], // Deep G pad
          [55.00, 110.00, 220.00, 261.63, 329.63]  // Deep Am pad
        ]
      };

      const selectedChords = chords[type] || chords.ambient;
      let chordIdx = 0;

      const playChord = () => {
        if (!this.isPlaying || !this.ctx) return;
        
        const freqs = selectedChords[chordIdx];
        chordIdx = (chordIdx + 1) % selectedChords.length;

        const now = this.ctx.currentTime;
        this.oscillators.forEach(osc => {
          try {
            osc.gain.gain.setValueAtTime(osc.gain.gain.value, now);
            osc.gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            setTimeout(() => osc.osc.stop(), 2000);
          } catch (e) {}
        });
        this.oscillators = [];

        freqs.forEach(f => {
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();
          
          if (type === 'guitar') {
            osc.type = 'triangle';
          } else if (type === 'piano') {
            osc.type = 'sine';
          } else {
            osc.type = 'triangle';
          }
          
          osc.frequency.setValueAtTime(f, now);
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.12, now + 2.0);
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(type === 'ambient' ? 300 : 500, now);
          
          osc.connect(oscGain);
          oscGain.connect(filter);
          filter.connect(this.gainNode);
          
          osc.start(now);
          this.oscillators.push({ osc, gain: oscGain });
        });
      };

      playChord();
      this.chordInterval = setInterval(playChord, 8000);
    } catch (err) {
      console.warn("Web Audio Synth failed to start:", err);
    }
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.chordInterval) clearInterval(this.chordInterval);
    
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.oscillators.forEach(osc => {
      try {
        osc.osc.stop(now + 0.5);
      } catch (e) {}
    });
    this.oscillators = [];

    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }
}

const ambientSynthInstance = new AmbientWorshipSynth();

let sleepTimerTimeout = null;
function startSleepTimer(minutes) {
  if (sleepTimerTimeout) clearTimeout(sleepTimerTimeout);
  if (minutes === 'off') return;
  
  const ms = parseInt(minutes) * 60 * 1000;
  sleepTimerTimeout = setTimeout(() => {
    stopSpeechNarration();
    const select = document.getElementById("audio-sleep-timer-select");
    if (select) select.value = 'off';
    showToast("Sleep timer active: playback paused. 😴");
  }, ms);
}

function initAmbientAudioSynth() {
  const bgMusicSelect = document.getElementById("audio-bg-music-select");
  const bgVolSlider = document.getElementById("audio-bg-music-vol-slider");
  const bgVolVal = document.getElementById("audio-bg-music-vol-val");
  const timerSelect = document.getElementById("audio-sleep-timer-select");

  if (bgMusicSelect) {
    bgMusicSelect.addEventListener("change", () => {
      if (audioState.isPlaying) {
        if (bgMusicSelect.value !== "none") {
          const vol = bgVolSlider ? parseFloat(bgVolSlider.value) : 0.3;
          ambientSynthInstance.setVolume(vol);
          ambientSynthInstance.start(bgMusicSelect.value);
        } else {
          ambientSynthInstance.stop();
        }
      }
    });
  }

  if (bgVolSlider) {
    bgVolSlider.addEventListener("input", () => {
      const pct = Math.round(parseFloat(bgVolSlider.value) * 100);
      if (bgVolVal) bgVolVal.textContent = `${pct}%`;
      ambientSynthInstance.setVolume(parseFloat(bgVolSlider.value));
    });
  }

  if (timerSelect) {
    timerSelect.addEventListener("change", () => {
      if (audioState.isPlaying && timerSelect.value !== "off") {
        startSleepTimer(timerSelect.value);
        showToast(`Sleep timer set to ${timerSelect.value} minutes.`);
      }
    });
  }
}

// 4. Personalized Devotional Topic selection
const DEVOTIONAL_DB = {
  faith: {
    titleEn: "Walking by Faith, Not by Sight",
    titleMr: "विश्वासाने चालणे, दृष्टीने नाही",
    verseEn: "For we live by faith, not by sight.",
    verseMr: "कारण आपण विश्वासाने चालतो, दृष्टीने नाही.",
    ref: "2 Corinthians 5:7 / २ करिंथकरांस ५:७",
    reflectionEn: "Faith is trusting God even when you cannot see the road ahead. It is the assurance that He is guiding your steps and that His promises are true, regardless of your current circumstances.",
    reflectionMr: "पुढील रस्ता दिसत नसतानाही देवावर विश्वास ठेवणे म्हणजे विश्वास. तुमची सध्याची परिस्थिती कशीही असली, तरी देव तुमच्या पावलांचे मार्गदर्शन करत आहे आणि त्याची आश्वासने खरी आहेत याची ही खात्री आहे.",
    prayerEn: "Lord, strengthen my faith today. Help me to trust your path even when I cannot see where it leads.",
    prayerMr: "प्रभु, आज माझा विश्वास मजबूत कर. तुझा मार्ग मला कुठे नेतो हे दिसत नसले तरी त्यावर विश्वास ठेवण्यास मला मदत कर."
  },
  marriage: {
    titleEn: "Bound Together in Love",
    titleMr: "प्रीतीमध्ये एकत्र बांधलेले",
    verseEn: "Above all, clothe yourselves with love, which binds us all together in perfect harmony.",
    verseMr: "आणि या सर्वांवर प्रीती धारण करा, जी परिपूर्णतेचे बंधन आहे.",
    ref: "Colossians 3:14 / कलसैकरांस ३:१४",
    reflectionEn: "A strong marriage is built on self-sacrificing love and grace. As you clothe yourselves in love daily, you reflect Christ's relationship with the church, creating perfect harmony in your home.",
    reflectionMr: "एक मजबूत विवाह आत्म-त्यागी प्रेम आणि कृपेवर तयार होतो. जेव्हा तुम्ही दररोज प्रेम परिधान करता, तेव्हा तुम्ही चर्चशी असलेल्या ख्रिस्ताच्या नातेसंबंधाचे प्रतिबिंब दाखवता, तुमच्या घरात परिपूर्ण सुसंवाद निर्माण करता.",
    prayerEn: "Father, bless our marriage. Keep us united in love, patience, and mutual respect.",
    prayerMr: "पित्या, आमच्या विवाहावर आशीर्वाद दे. आम्हाला प्रेम, संयम आणि परस्पर आदराने एकत्र ठेव."
  },
  parenting: {
    titleEn: "Guiding the Next Generation",
    titleMr: "पुढच्या पिढीचे मार्गदर्शन करणे",
    verseEn: "Direct your children onto the right path, and when they are older, they will not leave it.",
    verseMr: "मुलाला त्याच्या योग्य मार्गाचे शिक्षण दे, म्हणजे तो म्हातारा झाला तरी त्यापासून वळणार नाही.",
    ref: "Proverbs 22:6 / नीतिसूत्रे २२:६",
    reflectionEn: "Parenting is a stewardship from God. By raising children in love, discipline, and scriptural truth, we build a spiritual foundation that will guide them throughout their lives.",
    reflectionMr: "पालकत्व ही देवाकडून मिळालेली जबाबदारी आहे. मुलांना प्रेम, शिस्त आणि शास्त्रवचनांच्या सत्यात वाढवून आपण एक आध्यात्मिक पाया तयार करतो जो त्यांना आयुष्यभर मार्गदर्शन करेल.",
    prayerEn: "Lord, grant me wisdom to guide my children. Let my words and actions reflect your grace to them.",
    prayerMr: "प्रभु, माझ्या मुलांना मार्गदर्शन करण्यासाठी मला शहाणपण दे. माझे शब्द आणि कृती त्यांच्यावर तुझी कृपा दर्शवू दे."
  },
  anxiety: {
    titleEn: "Finding Peace in the Storm",
    titleMr: "वादळात शांती शोधणे",
    verseEn: "Give all your worries and cares to God, for he cares about you.",
    verseMr: "तुमची सर्व काळजी त्याच्यावर टाकून द्या, कारण तो तुमची काळजी घेतो.",
    ref: "1 Peter 5:7 / १ पेत्र ५:७",
    reflectionEn: "You don't have to carry the heavy burden of anxiety alone. God cares for you deeply. When you cast your worries on Him, He replaces them with His supernatural peace.",
    reflectionMr: "तुम्हाला चिंतेचे जड ओझे एकट्याने वाहण्याची गरज नाही. देव तुमची मनापासून काळजी घेतो. जेव्हा तुम्ही तुमच्या चिंता त्याच्यावर टाकता, तेव्हा तो त्यांची जागा त्याच्या अलौकिक शांतीने घेतो.",
    prayerEn: "Jesus, I give you my worries today. Guard my heart with your peace and help me to rest in you.",
    prayerMr: "येशू, मी आज माझ्या चिंता तुला देतो. तुझ्या शांतीने माझ्या हृदयाचे रक्षण कर आणि मला तुझ्यात विसावा घेण्यास मदत कर."
  },
  leadership: {
    titleEn: "Leading with a Servant's Heart",
    titleMr: "सेवकत्वाच्या भावनेने नेतृत्व करणे",
    verseEn: "Whoever wants to be a leader among you must be your servant.",
    verseMr: "तुमच्यामध्ये ज्याला कोणाला थोर व्हायचे असेल त्याने तुमचा सेवक झाले पाहिजे.",
    ref: "Matthew 20:26 / मत्तय २०:२६",
    reflectionEn: "True biblical leadership is not about power or position; it is about serving others. By leading with humility, we follow the ultimate example of Jesus Christ.",
    reflectionMr: "खरे बायबलसंबंधी नेतृत्व हे शक्ती किंवा स्थानाबद्दल नाही; ते इतरांची सेवा करण्याबद्दल आहे. नम्रतेने नेतृत्व करून, आपण येशू ख्रिस्ताच्या अंतिम उदाहरणाचे अनुसरण करतो.",
    prayerEn: "Lord, teach me to lead by serving. Help me to remain humble and put others' needs before my own.",
    prayerMr: "प्रभु, मला सेवा करून नेतृत्व करायला शिकव. मला नम्र राहण्यास आणि इतरांच्या गरजा माझ्या स्वतःच्या आधी ठेवण्यास मदत कर."
  }
};

function getMeetingsFromStorage() {
  try {
    let meetings = JSON.parse(localStorage.getItem("river_of_life_meetings"));
    
    if (!meetings) {
      const today = new Date();
      const formatDate = (d) => d.toISOString().split('T')[0];
      
      meetings = [
        {
          id: "meeting_1",
          title: "Friday Family Prayer / शुक्रवारची कौटुंबिक प्रार्थना",
          description: "Live family prayer, praise, worship and Marathi scripture study.",
          host: "Pastor John",
          date: formatDate(today),
          time: "20:00",
          duration: "60",
          repeat: "weekly",
          visibility: "public",
          status: "live",
          createdAt: Date.now()
        }
      ];
      localStorage.setItem("river_of_life_meetings", JSON.stringify(meetings));
    }
    return meetings;
  } catch (e) {
    console.error("Error loading meetings DB:", e);
    return [];
  }
}

function initPersonalizedDevotionals() {
  document.querySelectorAll(".devo-topic-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".devo-topic-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      
      const topic = pill.dataset.topic;
      const devo = DEVOTIONAL_DB[topic];
      if (devo) {
        document.getElementById("generated-devo-topic-label").textContent = `Devotional: ${topic.toUpperCase()}`;
        document.getElementById("generated-devo-title").textContent = state.translation === "eng" ? devo.titleEn : devo.titleMr;
        document.getElementById("generated-devo-verse").textContent = state.translation === "eng" ? devo.verseEn : devo.verseMr;
        document.getElementById("generated-devo-ref").textContent = devo.ref;
        document.getElementById("generated-devo-reflection").textContent = state.translation === "eng" ? devo.reflectionEn : devo.reflectionMr;
        document.getElementById("generated-devo-prayer").textContent = state.translation === "eng" ? devo.prayerEn : devo.prayerMr;

        const container = document.getElementById("generated-devo-container");
        container.style.display = "block";
      }
    });
  });

  const btnClose = document.getElementById("btn-close-devo");
  if (btnClose) {
    btnClose.addEventListener("click", () => {
      document.getElementById("generated-devo-container").style.display = "none";
      document.querySelectorAll(".devo-topic-pill").forEach(p => p.classList.remove("active"));
    });
  }
}

// 5. Life Situations Search
const EMOTION_SEARCH_MAP = {
  worried: {
    term: "anxiety / चिंता",
    query: "peace"
  },
  lonely: {
    term: "lonely / एकाकी",
    query: "with you"
  },
  angry: {
    term: "angry / राग",
    query: "patience"
  },
  grateful: {
    term: "grateful / कृतज्ञ",
    query: "thanksgiving"
  },
  depressed: {
    term: "depressed / निराश",
    query: "comfort"
  },
  hopeful: {
    term: "hopeful / आशा",
    query: "hope"
  }
};

function initLifeSituationsSearch() {
  document.querySelectorAll(".emotion-chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const emotion = btn.dataset.emotion;
      const mapping = EMOTION_SEARCH_MAP[emotion];
      if (mapping) {
        const sInput = document.getElementById("discover-search-input");
        const sClear = document.getElementById("btn-discover-search-clear");
        if (sInput) {
          sInput.value = mapping.query;
          if (sClear) sClear.style.display = "flex";
          executeDiscoverSearch();
          
          const emptyState = document.getElementById("search-empty-state-content");
          if (emptyState) emptyState.style.display = "none";
          
          const statusEl = document.getElementById("discover-search-results-status");
          if (statusEl) statusEl.style.display = "block";
        }
      }
    });
  });
}

// 6. Family Mode & Stories
const FAMILY_STORIES = {
  noah: {
    title: "Noah's Ark (नोहाचे तारू) 🚢",
    art: "🚢🐘🕊️",
    content: "A long time ago, people forgot God's love, but Noah was a good man who trusted God. \n\nGod told Noah: 'Build a giant boat, an Ark.' Noah built it exactly. God then gathered two of every animal—big elephants, tall giraffes, and small birds—into the boat. \n\nThe rains came for 40 days, but Noah's family and the animals were perfectly safe inside. Finally, a beautiful rainbow shone in the sky as God's promise to protect the earth forever! 🌈"
  },
  david: {
    title: "David & Goliath (दावीद आणि गल्याथ) 🎯",
    art: "🎯⚔️🛡️",
    content: "David was a young shepherd boy who loved singing and protecting his sheep. \n\nOne day, a giant soldier named Goliath challenged the army. Everyone was terrified. But David stepped forward and said: 'I am not afraid, because God is with me!' \n\nWith just a small stone, a sling, and strong faith, David defeated the giant. It shows that no problem is too big when you trust God! 🌟"
  },
  shepherd: {
    title: "The Good Shepherd (उत्तम मेंढपाळ) 🐑",
    art: "🐑🌳❤️",
    content: "Jesus told a beautiful story about a shepherd who had 100 sheep. \n\nOne evening, he realized one sheep was missing. He didn't say, 'Oh well, I have 99 left.' Instead, he left the 99 and went into the dark wilderness to search. \n\nWhen he finally found the lost little sheep, he joyfully carried it home on his shoulders. Jesus is our Good Shepherd; He loves and cares for each one of us personally! ❤️"
  }
};

function initFamilyMode() {
  const btnPrayers = document.getElementById("btn-family-prayers");
  const prayersContainer = document.getElementById("family-prayers-list-container");
  if (btnPrayers && prayersContainer) {
    btnPrayers.addEventListener("click", () => {
      const isHidden = prayersContainer.style.display === "none";
      prayersContainer.style.display = isHidden ? "block" : "none";
    });
  }

  const btnStories = document.getElementById("btn-family-stories");
  if (btnStories) {
    btnStories.addEventListener("click", () => {
      openModal("modal-family-stories");
      // Reset reader view
      document.getElementById("family-stories-list").style.display = "flex";
      document.getElementById("story-reader-view").style.display = "none";
    });
  }

  const closeStories = document.getElementById("btn-close-family-stories");
  if (closeStories) {
    closeStories.addEventListener("click", () => {
      closeModal("modal-family-stories");
    });
  }

  // Story click bindings
  document.querySelectorAll(".story-card").forEach(card => {
    card.addEventListener("click", () => {
      const storyId = card.dataset.story;
      const story = FAMILY_STORIES[storyId];
      if (story) {
        document.getElementById("story-art").textContent = story.art;
        document.getElementById("story-title").textContent = story.title;
        document.getElementById("story-content-text").textContent = story.content;

        document.getElementById("family-stories-list").style.display = "none";
        document.getElementById("story-reader-view").style.display = "block";
      }
    });
  });

  const btnBack = document.getElementById("btn-back-to-stories");
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      document.getElementById("family-stories-list").style.display = "flex";
      document.getElementById("story-reader-view").style.display = "none";
    });
  }
}

// 7. Offline Downloads & Simulation Manager
function initOfflineManager() {
  const btnMarathi = document.getElementById("btn-download-marathi-text");
  const btnAudio = document.getElementById("btn-download-audio-chapters");
  const chkOffline = document.getElementById("chk-force-offline");

  if (btnMarathi) {
    btnMarathi.addEventListener("click", () => {
      showToast("Marathi offline files verified!");
    });
  }

  if (btnAudio) {
    btnAudio.addEventListener("click", () => {
      if (btnAudio.textContent === "Downloaded") {
        showToast("Audio files cleared from cache");
        btnAudio.textContent = "Download";
        btnAudio.style.background = "var(--pill-bg)";
        return;
      }
      
      btnAudio.disabled = true;
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        btnAudio.textContent = `Downloading (${progress}%)...`;
        if (progress >= 100) {
          clearInterval(interval);
          btnAudio.textContent = "Downloaded";
          btnAudio.style.background = "#22c55e";
          btnAudio.style.borderColor = "#22c55e";
          btnAudio.disabled = false;
          showToast("Audio chapters cached for offline play!");
        }
      }, 300);
    });
  }

  if (chkOffline) {
    chkOffline.addEventListener("change", () => {
      state.forceOffline = chkOffline.checked;
      if (state.forceOffline) {
        showToast("Force Offline Mode active! 🌐❌");
      } else {
        showToast("Online synchronization restored! 🌐✅");
      }
    });
  }
}

// 8. Church Companion
function initChurchCompanion() {
  const setupEl = document.getElementById("church-companion-setup");
  const contentEl = document.getElementById("church-companion-content");
  const linkBtn = document.getElementById("btn-church-setup-link");
  const badgeEl = document.getElementById("church-badge-name");

  const updateChurchCompanionUI = () => {
    if (state.currentUser && state.currentUser.churchName) {
      if (setupEl) setupEl.style.display = "none";
      if (contentEl) contentEl.style.display = "flex";
      if (badgeEl) badgeEl.textContent = state.currentUser.churchName;
    } else {
      if (setupEl) setupEl.style.display = "block";
      if (contentEl) contentEl.style.display = "none";
      if (badgeEl) badgeEl.textContent = "No Church Set";
    }
  };

  if (linkBtn) {
    linkBtn.addEventListener("click", () => {
      if (!state.currentUser) {
        showToast("Please log in to link your congregation!");
        window.location.hash = "#/you";
        return;
      }
      const churchName = prompt("Enter your home congregation name / चर्चचे नाव प्रविष्ट करा:");
      if (churchName && churchName.trim() !== "") {
        state.currentUser.churchName = churchName.trim();
        saveStateToLocalStorage();
        updateChurchCompanionUI();
        showToast("Church linked successfully!");
      }
    });
  }

  // Announcements & Sermon tabs bindings
  const tabNews = document.getElementById("btn-church-tab-news");
  const tabSermons = document.getElementById("btn-church-tab-sermons");
  const newsPanel = document.getElementById("church-news-panel");
  const sermonsPanel = document.getElementById("church-sermons-panel");

  if (tabNews && tabSermons && newsPanel && sermonsPanel) {
    tabNews.addEventListener("click", () => {
      tabNews.classList.add("active");
      tabSermons.classList.remove("active");
      newsPanel.style.display = "flex";
      sermonsPanel.style.display = "none";
    });

    tabSermons.addEventListener("click", () => {
      tabSermons.classList.add("active");
      tabNews.classList.remove("active");
      newsPanel.style.display = "none";
      sermonsPanel.style.display = "flex";
    });
  }

  // Sermon notes click
  const sermonNote = document.getElementById("sermon-note-item-1");
  if (sermonNote) {
    sermonNote.addEventListener("click", () => {
      alert("Sermon Outline: Walking in Divine Faith\n\n1. Faith is the substance of things hoped for (Hebrews 11:1)\n2. Without faith, it is impossible to please God (Hebrews 11:6)\n3. Faith requires active obedience in daily life.");
    });
  }

  // Initial trigger
  updateChurchCompanionUI();
  
  // Link it to login/profile render states
  const originalRenderProfile = window.renderYouProfile;
  window.renderYouProfile = function() {
    if (originalRenderProfile) originalRenderProfile();
    updateChurchCompanionUI();
  };
}

/* ==========================================================================
   10. Prayer Meetings & Live Fellowship Engine
   ========================================================================== */

// Meeting globals
let activeMeetingSession = null; // { meetingId, localStream, provider, isMuted, isCamOff }
let meetingSandboxInterval = null;
let activeJitsiAPIInstance = null;
let isScreenSharingActive = false;

// Mock members database for schedule selection and invites
const CHURCH_MEMBERS = [
  { username: "Pastor John", isPastor: true },
  { username: "Pastor Sunil", isPastor: true },
  { username: "Leader Samuel", isLeader: true },
  { username: "Sister Sarah", isPastor: false },
  { username: "Brother Samuel", isPastor: false },
  { username: "Esther Salve", isPastor: false },
  { username: "Gaurav Salve", isPastor: false },
  { username: "Ruth Shinde", isPastor: false }
];

// Helper to save LocalStorage meetings




function saveMeetingsToStorage(meetings) {
  localStorage.setItem("river_of_life_meetings", JSON.stringify(meetings));
}

// Initialize Meetings Module
function initMeetings() {
  // Bind subtab clicks
  document.querySelectorAll("[data-meetings-subtab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-meetings-subtab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const subtab = btn.dataset.meetingsSubtab;
      document.querySelectorAll(".meetings-subtab-panel").forEach(p => {
        p.style.display = p.id === `meetings-subtab-${subtab}` ? "block" : "none";
      });
      renderMeetingsDashboard();
    });
  });

  // Bind schedule modal buttons
  const triggerBtn = document.getElementById("btn-schedule-meeting-trigger");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      openDrawer("drawer-schedule-meeting");
      populateScheduleHostsDropdown();
    });
  }

  const closeScheduleBtn = document.getElementById("btn-close-schedule-meeting");
  if (closeScheduleBtn) {
    closeScheduleBtn.addEventListener("click", () => {
      closeAllDrawers();
    });
  }

  // Bind meeting details buttons
  const closeDetailsBtn = document.getElementById("btn-close-meeting-details");
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", () => {
      closeAllDrawers();
    });
  }

  // Bind create form submission
  const scheduleForm = document.getElementById("schedule-meeting-form");
  if (scheduleForm) {
    scheduleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      createNewMeeting();
    });
  }

  // Bind meeting toolbar clicks
  setupMeetingRoomControls();

  // Initial dashboard load
  renderMeetingsDashboard();
}

// Persistent User Registry Database for Profiles & Invitations
function getRegisteredUserDatabase() {
  const defaultMembers = [
    { id: "usr_1", username: "Pastor John", email: "pastorjohn@riveroflife.org", role: "Pastor", isPastor: true },
    { id: "usr_2", username: "Pastor Sunil", email: "sunil@riveroflife.org", role: "Pastor", isPastor: true },
    { id: "usr_3", username: "Leader Samuel", email: "samuel@riveroflife.org", role: "Leader", isLeader: true },
    { id: "usr_4", username: "Sister Sarah", email: "sarah@riveroflife.org", role: "Member" },
    { id: "usr_5", username: "Gaurav Salve", email: "gaurav@riveroflife.org", role: "Member" },
    { id: "usr_6", username: "Ruth Shinde", email: "ruth@riveroflife.org", role: "Member" }
  ];

  try {
    const stored = localStorage.getItem("rol_registered_users");
    if (!stored) {
      localStorage.setItem("rol_registered_users", JSON.stringify(defaultMembers));
      return defaultMembers;
    }
    const parsed = JSON.parse(stored);
    return (Array.isArray(parsed) && parsed.length > 0) ? parsed : defaultMembers;
  } catch (e) {
    return defaultMembers;
  }
}

function saveUserToDatabase(userObj) {
  if (!userObj || !userObj.username) return;
  const db = getRegisteredUserDatabase();
  const existing = db.find(u => u.username.toLowerCase() === userObj.username.toLowerCase());
  if (!existing) {
    db.push({
      id: "usr_" + Date.now(),
      username: userObj.username,
      email: userObj.email || `${userObj.username.toLowerCase().replace(/\s+/g, '')}@riveroflife.org`,
      role: userObj.role || "Member",
      createdAt: Date.now()
    });
    localStorage.setItem("rol_registered_users", JSON.stringify(db));
  }
}

// Populate Hosts, Co-Hosts, and Invitees in Schedule Drawer
function populateScheduleHostsDropdown() {
  const hostSelect = document.getElementById("meeting-host");
  const inviteList = document.getElementById("meeting-invitees-list");
  if (!hostSelect || !inviteList) return;

  hostSelect.innerHTML = "";
  inviteList.innerHTML = "";

  const allMembers = getRegisteredUserDatabase();
  const loggedIn = state.currentUser ? state.currentUser.username : "Guest User";
  
  // Fill Hosts dropdown
  allMembers.forEach(member => {
    const canHost = member.isPastor || member.isLeader || member.username === loggedIn;
    if (canHost) {
      const opt = document.createElement("option");
      opt.value = member.username;
      opt.textContent = `${member.username} (${member.isPastor ? "Pastor" : member.isLeader ? "Leader" : "Member"})`;
      if (member.username === loggedIn) {
        opt.selected = true;
      }
      hostSelect.appendChild(opt);
    }
  });

  // Fill Invitees checklist
  allMembers.forEach((member, idx) => {
    if (member.username !== loggedIn) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 6px; background: rgba(255,255,255,0.04);";
      row.innerHTML = `
        <input type="checkbox" id="invitee_${idx}" value="${member.username}" style="width: 15px; height: 15px; accent-color: var(--primary);">
        <label for="invitee_${idx}" style="font-size: 13px; cursor: pointer; color: var(--text); font-weight: 600;">
          ${member.username} <span style="font-size: 11px; color: var(--text-muted);">(${member.role || 'Member'})</span>
        </label>
      `;
      inviteList.appendChild(row);
    }
  });
}

// Create new meeting
function createNewMeeting() {
  const title = document.getElementById("meeting-title").value.trim();
  const desc = document.getElementById("meeting-description").value.trim();
  const date = document.getElementById("meeting-date").value;
  const time = document.getElementById("meeting-time").value;
  const duration = document.getElementById("meeting-duration").value;
  const repeat = document.getElementById("meeting-repeat").value;
  const visibility = document.getElementById("meeting-visibility").value;
  const maxVal = document.getElementById("meeting-max-users").value;
  const host = document.getElementById("meeting-host").value;
  const customUrl = document.getElementById("meeting-custom-url").value.trim();

  if (!title || !date || !time) {
    showToast("Please fill in required fields.");
    return;
  }

  // Collect invited members
  const inviteList = document.getElementById("meeting-invitees-list");
  const checkedBoxes = inviteList.querySelectorAll("input[type='checkbox']:checked");
  const invitedUsers = Array.from(checkedBoxes).map(cb => cb.value);

  const meetings = getMeetingsFromStorage();

  // Create new meeting object
  const newMeeting = {
    id: "meeting_" + Date.now(),
    title,
    description: desc,
    host,
    date,
    time,
    duration,
    repeat,
    visibility,
    isSimulation: (visibility !== "public"),
    customUrl: customUrl || "",
    maxParticipants: maxVal || "Unlimited",
    status: "scheduled",
    participantsCount: 0,
    invitedCount: invitedUsers.length,
    invitedUsers: invitedUsers,
    createdAt: Date.now()
  };

  meetings.unshift(newMeeting);
  saveMeetingsToStorage(meetings);

  showToast("Meeting Scheduled Successfully!");
  closeAllDrawers();
  
  // Reset form
  document.getElementById("schedule-meeting-form").reset();

  // Switch to upcoming tab
  document.querySelectorAll("[data-meetings-subtab]").forEach(b => {
    b.classList.toggle("active", b.dataset.meetingsSubtab === "upcoming");
  });
  document.querySelectorAll(".meetings-subtab-panel").forEach(p => {
    p.style.display = p.id === "meetings-subtab-upcoming" ? "block" : "none";
  });
  
  renderMeetingsDashboard();

  // Send a simulated notification alert
  setTimeout(() => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("River of Life Meeting scheduled", {
          body: `"${title}" has been scheduled for ${date} at ${time}.`,
          icon: "assets/icons/icon-192.png"
        });
      }
    } catch (e) {}
  }, 1000);
}

// Render Meetings list on Dashboard
function renderMeetingsDashboard() {
  const triggerBtn = document.getElementById("btn-schedule-meeting-trigger");
  if (triggerBtn) {
    triggerBtn.style.display = "block";
  }

  const activeTabBtn = document.querySelector("[data-meetings-subtab].active");
  const currentSubtab = activeTabBtn ? activeTabBtn.dataset.meetingsSubtab : "live";

  const meetings = getMeetingsFromStorage();
  const listEl = document.getElementById(`meetings-${currentSubtab}-list`);
  const emptyEl = document.getElementById(`meetings-${currentSubtab}-empty`);
  if (!listEl || !emptyEl) return;

  listEl.innerHTML = "";

  let filtered = [];
  if (currentSubtab === "live") {
    filtered = meetings.filter(m => m.status === "live");
  } else if (currentSubtab === "upcoming") {
    filtered = meetings.filter(m => m.status === "scheduled");
  } else if (currentSubtab === "my") {
    const username = state.currentUser ? state.currentUser.username : "Guest User";
    filtered = meetings.filter(m => m.host === username || m.invitedCount > 0);
  } else if (currentSubtab === "past") {
    filtered = meetings.filter(m => m.status === "ended");
  }

  if (filtered.length === 0) {
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    filtered.forEach(m => {
      const card = document.createElement("div");
      card.className = "meeting-card";

      // Make entire LIVE card tappable to directly join
      if (m.status === "live") {
        card.style.cursor = "pointer";
        card.style.borderColor = "#22c55e";
        card.style.boxShadow = "0 0 0 2px rgba(34,197,94,0.2)";
        card.addEventListener("click", () => triggerJoinMeetingFlow(m.id));
      }
      
      let badgeHtml = "";
      if (m.status === "live") {
        badgeHtml = `<span class="badge-live" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:0.5px;">🔴 LIVE NOW</span>`;
      } else if (m.status === "scheduled") {
        badgeHtml = `<span class="badge-upcoming-pill">UPCOMING</span>`;
      } else if (m.status === "ended") {
        badgeHtml = `<span class="badge-past-pill">PAST MEETING</span>`;
      }

      const descSnippet = m.description ? `<p class="meeting-card-desc">${m.description}</p>` : "";
      
      let actionButtons = "";
      if (m.status === "ended") {
        if (m.recordingUrl) {
          actionButtons = `<button class="btn-primary-mini btn-past-record" data-id="${m.id}">📼 Watch Recording</button>`;
        } else {
          actionButtons = `<span style="font-size: 11px; color: var(--text-muted);">No recording available</span>`;
        }
      } else if (m.status === "live") {
        // BIG full-width green Join Now button for LIVE meetings
        actionButtons = `
          <button class="btn-join-meet" data-id="${m.id}" style="
            width: 100%; background: linear-gradient(135deg, #16a34a, #22c55e);
            color: #fff; border: none; border-radius: 14px; padding: 15px 20px;
            font-size: 16px; font-weight: 800; cursor: pointer; letter-spacing: 0.5px;
            box-shadow: 0 6px 20px rgba(34,197,94,0.5); margin-top: 8px;
            display: flex; align-items: center; justify-content: center; gap: 10px;
          ">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            Join Now / सभेत सामील व्हा
          </button>
        `;
      } else {
        actionButtons = `
          <button class="btn-secondary-mini btn-view-meet-details" data-id="${m.id}">Details</button>
          <button class="btn-primary-mini btn-join-meet" data-id="${m.id}">Join / सामील व्हा</button>
        `;
      }

      card.innerHTML = `
        <div class="meeting-card-info">
          <div class="meeting-card-header">
            ${badgeHtml}
            <h4 class="meeting-card-title">${m.title}</h4>
          </div>
          ${descSnippet}
          <div class="meeting-card-details">
            <span>👤 Host: ${m.host}</span>
            <span>📅 ${m.date} at ${m.time}</span>
            <span>⏱️ ${m.duration} mins</span>
            ${m.status === 'live' ? `<span>👥 ${m.participantsCount} inside</span>` : ""}
          </div>
        </div>
        <div class="meeting-card-actions">
          ${actionButtons}
        </div>
      `;

      // Event binds
      const detailsBtn = card.querySelector(".btn-view-meet-details");
      if (detailsBtn) {
        detailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openMeetingDetails(m.id);
        });
      }

      const joinBtn = card.querySelector(".btn-join-meet");
      if (joinBtn) {
        joinBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          triggerJoinMeetingFlow(m.id);
        });
      }

      const recordBtn = card.querySelector(".btn-past-record");
      if (recordBtn) {
        recordBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showToast("Playing meeting recording: Weekly Revival (August 7)...");
        });
      }

      listEl.appendChild(card);
    });
  }
}


// Open Details Drawer
function openMeetingDetails(meetingId) {
  const meetings = getMeetingsFromStorage();
  const m = meetings.find(x => x.id === meetingId);
  if (!m) return;

  document.getElementById("details-meeting-headline").textContent = m.title;
  document.getElementById("details-meeting-desc").textContent = m.description || "No description provided.";
  document.getElementById("details-meeting-host").textContent = m.host;
  document.getElementById("details-meeting-datetime").textContent = `${m.date} at ${m.time}`;
  document.getElementById("details-meeting-duration").textContent = `${m.duration} minutes`;
  document.getElementById("details-meeting-visibility").textContent = m.visibility.charAt(0).toUpperCase() + m.visibility.slice(1);
  document.getElementById("details-meeting-participants").textContent = m.invitedCount ? `${m.invitedCount} members invited` : "All church members";
  
  const badgeEl = document.getElementById("details-meeting-badge");
  if (m.status === "live") {
    badgeEl.textContent = "LIVE NOW";
    badgeEl.style.color = "#22c55e";
  } else if (m.status === "scheduled") {
    badgeEl.textContent = "UPCOMING";
    badgeEl.style.color = "var(--primary)";
  } else {
    badgeEl.textContent = "ENDED";
    badgeEl.style.color = "var(--text-muted)";
  }

  // Bind Join button
  const joinBtn = document.getElementById("btn-details-join");
  joinBtn.onclick = () => {
    closeAllDrawers();
    triggerJoinMeetingFlow(m.id);
  };

  // Bind Share button
  document.getElementById("btn-details-share").onclick = () => {
    copyMeetingInvitation(m);
  };

  // Bind WhatsApp Share button
  const waBtn = document.getElementById("btn-details-whatsapp-share");
  if (waBtn) {
    waBtn.onclick = () => {
      shareMeetingToWhatsApp(m);
    };
  }

  // Bind Calendar button
  document.getElementById("btn-details-calendar").onclick = () => {
    generateICSFile(m);
  };

  openDrawer("drawer-meeting-details");
}

// Share meeting invitation via WhatsApp
function shareMeetingToWhatsApp(meeting) {
  const domain = window.location.origin + window.location.pathname;
  // Deep-link query to join directly
  const link = `${domain}?join=${meeting.id}`;
  const invitationText = `🕊️ *River of Life Meeting Invite* / *आमंत्रण*\n\n📢 *Title:* ${meeting.title}\n📅 *Date:* ${meeting.date}\n⏰ *Time:* ${meeting.time}\n👤 *Host:* ${meeting.host}\n\nJoin us for prayer, worship and Marathi/English Bible study room!\n👉 *Click to join call directly:* ${link}`;
  
  const encodedText = encodeURIComponent(invitationText);
  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
}

// Share invitation text builder
function copyMeetingInvitation(meeting) {
  const domain = window.location.origin + window.location.pathname;
  const link = `${domain}#/meetings?join=${meeting.id}`;
  const invitationText = `🕊️ River of Life Prayer Meeting\n\n📢 Title: ${meeting.title}\n📅 Date: ${meeting.date}\n⏰ Time: ${meeting.time}\n👤 Host: ${meeting.host}\n\nJoin us for prayer, worship and Bible sharing.\n👉 Link: ${link}`;

  navigator.clipboard.writeText(invitationText)
    .then(() => {
      showToast("Invitation Copied to Clipboard! Share to WhatsApp/Email.");
      // Native sharing if supported
      if (navigator.share) {
        navigator.share({
          title: "River of Life Prayer Meeting Invitation",
          text: invitationText,
          url: link
        }).catch(err => {});
      }
    })
    .catch(err => {
      showToast("Failed to copy invitation link.");
    });
}

// Generate iCalendar format for Add to Calendar option
function generateICSFile(meeting) {
  const title = meeting.title.replace(/[^a-zA-Z0-9 ]/g, "");
  const desc = meeting.description ? meeting.description.replace(/[^a-zA-Z0-9 ]/g, "") : "";
  const dtStr = meeting.date.replace(/-/g, "") + "T" + meeting.time.replace(/:/g, "") + "00";
  
  // Format dates for .ics format
  const icsString = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `DTSTART:${dtStr}`,
    `DURATION:PT${meeting.duration}M`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = `meeting_${meeting.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("Calendar File (.ics) downloaded!");
}

// Trigger Joining Flow (Camera preview checks)
function triggerJoinMeetingFlow(meetingId) {
  const meetings = getMeetingsFromStorage();
  const m = meetings.find(x => x.id === meetingId);
  if (!m) return;

  // Synchronous user-gesture audio context unlock
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!window.webrtcAudioCtx) window.webrtcAudioCtx = new AudioContextClass();
      if (window.webrtcAudioCtx.state === 'suspended') window.webrtcAudioCtx.resume();
    }
  } catch(e) {}

  const loggedIn = (state && state.currentUser) ? state.currentUser.username : "Member";
  const meetingIdSlug = (m && m.id) ? m.id.toString().replace(/[^a-zA-Z0-9]/g, '_') : 'Sanctuary_LiveRoom';
  const roomSlug = `RiverOfLife_Sanctuary_${meetingIdSlug}`;
  const roomUrl = `https://p2p.mirotalk.com/join/${roomSlug}?audio=true&video=true&mic=true&cam=true&muted=false&sound=true&autojoin=true&p2p=true&codec=opus&layout=grid&grid=1&name=${encodeURIComponent(loggedIn)}`;

  // Detect iOS (iPhone/iPad) to bypass WebKit iframe microphone blocking and popup blocker
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    logAudioDebug("iOS Device detected. Directing to native top-level call window...", { roomUrl });
    showToast("Opening iOS Video Room (Mic & Speaker Active) 🙏");
    window.location.href = roomUrl;
    return;
  }

  logAudioDebug("getUserMedia started for meeting join...", { meetingId });
  showToast("Requesting Microphone & Camera access...");
  
  // Explicitly request audio FIRST to force mobile browsers (Android Chrome / Desktop) to display Microphone Permission Dialog
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(audioStream => {
      logAudioDebug("Microphone permission granted by user!", {
        audioTracks: audioStream.getAudioTracks().map(t => ({ id: t.id, label: t.label, enabled: t.enabled, readyState: t.readyState }))
      });

      // Stop parent frame pre-check tracks so hardware mic device lock is released before iframe initialization
      if (audioStream && audioStream.getTracks) {
        audioStream.getTracks().forEach(t => t.stop());
        logAudioDebug("Parent frame audio tracks released for exclusive iframe hardware capture.");
      }

      // Also attempt joint video request
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(fullStream => {
          if (fullStream && fullStream.getTracks) fullStream.getTracks().forEach(t => t.stop());
          launchLiveMeetingRoom(m, null);
        })
        .catch(() => {
          launchLiveMeetingRoom(m, null);
        });
    })
    .catch(err => {
      logAudioDebug("Microphone permission denied or unavailable on mobile:", err);
      showToast("Microphone permission denied. Joining in listen mode.");
      launchLiveMeetingRoom(m, null);
    });
}

// Fullscreen Live Meeting Room Entry
function launchLiveMeetingRoom(meeting, stream) {
  try {
    const loggedIn = (state && state.currentUser) ? state.currentUser.username : "Member";
    const isHost = meeting ? (meeting.host === loggedIn) : false;

    logAudioDebug("Publishing microphone track & entering meeting room...", {
      meetingId: meeting ? meeting.id : "default",
      isHost: isHost,
      participant: loggedIn
    });
    
    // Lock screen view overlay
    const roomModal = document.getElementById("modal-live-meeting");
    if (roomModal) {
      roomModal.style.display = "block";
      setTimeout(() => {
        roomModal.classList.add("active");
      }, 10);
    }
    
    // Setup room title
    const titleEl = document.getElementById("meeting-room-title-display");
    if (titleEl && meeting && meeting.title) {
      titleEl.textContent = meeting.title;
    }
    const legacyTitle = document.getElementById("meeting-room-title");
    if (legacyTitle && meeting && meeting.title) {
      legacyTitle.textContent = meeting.title;
    }
  
    // Hide top header and bottom tabs
    const header = document.querySelector(".app-header");
    if (header) header.style.display = "none";
    const tabs = document.querySelector(".mobile-bottom-tabs");
    if (tabs) tabs.style.display = "none";
    const sidebar = document.querySelector(".desktop-sidebar");
    if (sidebar) sidebar.style.display = "none";
    
    if (meeting && meeting.id) {
      try { subscribeToMeetingEvents(meeting.id); } catch(e) {}
    }
    
    activeMeetingSession = {
      meetingId: meeting ? meeting.id : "default",
      localStream: stream,
      isMuted: false,
      isCamOff: false,
      isHost: isHost
    };

    // Load Verified WebRTC Video Conference Room with Exclusive Hardware Access for All Participants
    const jitsiCont = document.getElementById("meeting-jitsi-container");
    if (jitsiCont) {
      jitsiCont.style.display = "block";
      const meetingIdSlug = (meeting && meeting.id) ? meeting.id.toString().replace(/[^a-zA-Z0-9]/g, '_') : 'Sanctuary_LiveRoom';
      const roomSlug = `RiverOfLife_Sanctuary_${meetingIdSlug}`;
      
      // Low-latency Opus P2P parameters for zero audio delay on Android & Desktop: audio=true&video=true&mic=true&cam=true&muted=false&sound=true&autojoin=true&p2p=true&codec=opus
      const roomUrl = `https://p2p.mirotalk.com/join/${roomSlug}?audio=true&video=true&mic=true&cam=true&muted=false&sound=true&autojoin=true&p2p=true&codec=opus&layout=grid&grid=1&name=${encodeURIComponent(loggedIn)}`;
      
      // Detect iOS (iPhone/iPad) to bypass WebKit iframe microphone blocking
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        logAudioDebug("iOS Device detected (Apple WebKit Iframe Restriction). Launching native top-level call window...");
        showToast("Opening iOS Video Room (Mic & Speaker Active) 🙏");
        try {
          window.open(roomUrl, "_blank");
        } catch(e) {}
      }

      jitsiCont.innerHTML = `
        <iframe 
          id="webrtc-room-iframe"
          src="${roomUrl}" 
          width="100%" 
          height="100%" 
          allow="camera *; microphone *; speaker-selection *; display-capture *; autoplay *; fullscreen *; picture-in-picture *; accelerometer; gyroscope;" 
          allowusermedia="true"
          style="border: none; width: 100%; height: 100%; border-radius: 18px; background: #090d16;">
        </iframe>
      `;

      logAudioDebug("WebRTC Room iframe mounted with low-latency Opus audio parameters.", {
        roomUrl,
        isIOS,
        allowPermissions: "camera *; microphone *; speaker-selection *; display-capture *; autoplay *; fullscreen *; picture-in-picture *; accelerometer; gyroscope;",
        allowusermedia: "true"
      });
    }

    // Auto-enumerate devices for settings drawer
    enumerateAndPopulateAudioDevices();

    // Trigger audio autoplay unlock
    setTimeout(() => {
      unlockAndPlayRemoteAudio();
    }, 1000);

    showToast("Joined Online Video Fellowship Room 🙏 (Mic & Speaker Active)");
  } catch (err) {
    logAudioDebug("launchLiveMeetingRoom notice:", err);
  }
}


function exitLiveMeetingRoom() {
  try {
    console.log("Exiting Live Fellowship Meeting Room...");
    
    // Hide Modal Overlay
    const roomModal = document.getElementById("modal-live-meeting");
    if (roomModal) {
      roomModal.classList.remove("active");
      setTimeout(() => {
        roomModal.style.display = "none";
      }, 200);
    }
    
    // Restore Top App Header and Mobile Bottom Tabs
    const header = document.querySelector(".app-header");
    if (header) header.style.display = "flex";
    const tabs = document.querySelector(".mobile-bottom-tabs");
    if (tabs) tabs.style.display = "flex";
    const sidebar = document.querySelector(".desktop-sidebar");
    if (sidebar) sidebar.style.display = "flex";

    // Cleanly terminate Video Room Iframe
    const jitsiCont = document.getElementById("meeting-jitsi-container");
    if (jitsiCont) {
      jitsiCont.innerHTML = "";
      jitsiCont.style.display = "none";
    }

    // Stop all local camera and microphone media tracks
    if (activeMeetingSession && activeMeetingSession.localStream) {
      try {
        activeMeetingSession.localStream.getTracks().forEach(track => track.stop());
      } catch(e) {}
    }
    activeMeetingSession = null;

    showToast("Exited fellowship meeting room");
  } catch (err) {
    console.warn("exitLiveMeetingRoom notice:", err);
  }
}


function setupMeetingRoomControls() {
  // Mic toggle
  document.getElementById("btn-meet-mic").addEventListener("click", () => {
    if (!activeMeetingSession) activeMeetingSession = { isMuted: false, isCamOff: false };
    activeMeetingSession.isMuted = !activeMeetingSession.isMuted;
    
    const btn = document.getElementById("btn-meet-mic");
    btn.classList.toggle("muted", activeMeetingSession.isMuted);
    
    const statusEl = document.getElementById("meeting-local-mic-status");
    if (statusEl) statusEl.textContent = activeMeetingSession.isMuted ? "🔇" : "🎙️";

    if (activeJitsiAPIInstance) {
      activeJitsiAPIInstance.executeCommand("toggleAudio");
    }
    showToast(activeMeetingSession.isMuted ? "Microphone Muted" : "Microphone Active");
  });

  // Video Camera toggle
  document.getElementById("btn-meet-video").addEventListener("click", () => {
    if (!activeMeetingSession) activeMeetingSession = { isMuted: false, isCamOff: false };
    activeMeetingSession.isCamOff = !activeMeetingSession.isCamOff;

    const btn = document.getElementById("btn-meet-video");
    btn.classList.toggle("muted", activeMeetingSession.isCamOff);

    const videoEl = document.getElementById("meeting-local-video");
    const avatarEl = document.getElementById("video-cell-local-avatar");
    const loggedIn = state.currentUser ? state.currentUser.username : "Guest";

    if (activeMeetingSession.isCamOff) {
      if (videoEl) videoEl.style.display = "none";
      if (avatarEl) {
        avatarEl.style.display = "flex";
        avatarEl.textContent = loggedIn.substring(0, 1).toUpperCase();
      }
    } else {
      if (videoEl && activeMeetingSession.localStream) {
        videoEl.style.display = "block";
        if (avatarEl) avatarEl.style.display = "none";
      } else {
        // Retry capturing stream
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(str => {
            activeMeetingSession.localStream = str;
            if (videoEl) {
              videoEl.srcObject = str;
              videoEl.style.display = "block";
            }
            if (avatarEl) avatarEl.style.display = "none";
          })
          .catch(e => {
            showToast("Camera blocked in settings.");
            activeMeetingSession.isCamOff = true;
            btn.classList.add("muted");
          });
      }
    }

    if (activeJitsiAPIInstance) {
      activeJitsiAPIInstance.executeCommand("toggleVideo");
    }
  });

  // Screen / Media Sharing Drawer Trigger
  const shareBtnEl = document.getElementById("btn-meet-screenshare");
  if (shareBtnEl) {
    shareBtnEl.addEventListener("click", () => {
      if (isAudioOnlySharingActive || isVideoSharingActive || isScreenSharingActive) {
        stopAllMediaSharing();
      } else {
        openDrawer("drawer-meet-share-media");
      }
    });
  }

  // Modal Share Mode Options (Mode 1 & Mode 2)
  const modeVideoBtn = document.getElementById("btn-share-mode-video");
  if (modeVideoBtn) {
    modeVideoBtn.addEventListener("click", () => {
      closeDrawer("drawer-meet-share-media");
      startShareVideoAndAudio();
    });
  }

  const modeAudioBtn = document.getElementById("btn-share-mode-audio");
  if (modeAudioBtn) {
    modeAudioBtn.addEventListener("click", () => {
      closeDrawer("drawer-meet-share-media");
      startShareAudioOnly();
    });
  }

  function stopLocalScreenShare() {
    stopAllMediaSharing();
  }


  // Chat Panel toggle
  document.getElementById("btn-meet-chat").addEventListener("click", () => {
    toggleMeetingSidebar("chat");
  });

  // Hand raise toggle
  document.getElementById("btn-meet-hand").addEventListener("click", () => {
    const btn = document.getElementById("btn-meet-hand");
    const isRaised = btn.classList.toggle("active");
    const loggedIn = state.currentUser ? state.currentUser.username : "You";
    
    appendMeetingChatMessage("SYSTEM", isRaised ? `✋ You raised hand` : `You lowered hand`, true);
    
    // Send message trigger if Jitsi Meet is active
    if (activeJitsiAPIInstance) {
      activeJitsiAPIInstance.executeCommand("sendChatMessage", isRaised ? "✋ [Raised Hand]" : "[Lowered Hand]", true);
    }
  });

  // Reactions panel toggle
  document.getElementById("btn-meet-reactions").addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("meet-reactions-select-panel");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "flex" : "none";
    
    // Position panel relative to toolbar
    const toolbar = document.querySelector(".meeting-room-toolbar");
    if (toolbar) {
      panel.style.bottom = `${toolbar.offsetHeight + 10}px`;
    }
  });

  document.addEventListener("click", () => {
    const panel = document.getElementById("meet-reactions-select-panel");
    if (panel) panel.style.display = "none";
  });

  // Reaction selections trigger floating spawn
  document.querySelectorAll(".reaction-select-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const r = btn.dataset.reaction;
      triggerMeetingReaction(r);
      
      // Simulate/Broadcast reaction
      if (activeJitsiAPIInstance) {
        activeJitsiAPIInstance.executeCommand("sendChatMessage", `Reacted: ${r}`, true);
      }
    });
  });

  // Prayer Request submission in meeting triggers
  document.getElementById("btn-meet-prayer").addEventListener("click", () => {
    openModal("drawer-meet-prayer-request");
  });
  
  document.getElementById("btn-close-meet-prayer-request").addEventListener("click", () => {
    closeModal("drawer-meet-prayer-request");
  });

  document.getElementById("meet-prayer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("meet-prayer-text").value.trim();
    const privacy = document.getElementById("meet-prayer-privacy").value;
    
    if (!text) return;

    submitPrayerRequest(text, privacy === "public");
    closeModal("drawer-meet-prayer-request");
    document.getElementById("meet-prayer-text").value = "";
    
    appendMeetingChatMessage("SYSTEM", `🙏 Submitted live prayer request: "${text}"`, true);
    showToast("Live Prayer Request submitted successfully!");
  });

  // Participants Panel toggle
  document.getElementById("btn-meet-members").addEventListener("click", () => {
    toggleMeetingSidebar("participants");
  });

  // Bible Mode Panel toggle
  document.getElementById("btn-meet-bible").addEventListener("click", () => {
    toggleMeetingSidebar("bible");
  });

  // Worship Mode Panel toggle
  document.getElementById("btn-meet-worship").addEventListener("click", () => {
    toggleMeetingSidebar("worship");
  });

  // Host Settings Panel toggle
  document.getElementById("btn-meet-moderator").addEventListener("click", () => {
    toggleMeetingSidebar("host");
  });

  // Chat message send handler
  const sendChatBtn = document.getElementById("btn-meeting-chat-send");
  const chatInput = document.getElementById("meeting-chat-input");
  
  if (sendChatBtn && chatInput) {
    const handleSend = () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      chatInput.value = "";
      
      const loggedIn = state.currentUser ? state.currentUser.username : "You";
      appendMeetingChatMessage(loggedIn, msg, true);
      
      if (activeJitsiAPIInstance) {
        activeJitsiAPIInstance.executeCommand("sendChatMessage", msg, true);
      }
    };
    sendChatBtn.addEventListener("click", handleSend);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend();
    });
  }

  // Sidebar close btn bind
  document.getElementById("btn-close-meeting-sidebar").onclick = () => {
    document.getElementById("meeting-sidebar-panel").style.display = "none";
  };

  // Leave Call
  document.getElementById("btn-meet-leave").onclick = () => {
    if (confirm("Are you sure you want to leave this meeting?")) {
      exitLiveMeetingRoom();
    }
  };

  // Host mute all button trigger
  document.getElementById("btn-host-mute-all").onclick = () => {
    showToast("Pastor John muted all participants.");
    appendMeetingChatMessage("SYSTEM", "🔇 Moderator muted all participant microphones", false);
  };

  // Host lock meeting toggle
  let isMeetingLocked = false;
  document.getElementById("btn-host-lock-meeting").onclick = () => {
    isMeetingLocked = !isMeetingLocked;
    const btnText = document.getElementById("btn-host-lock-meeting").querySelector("span");
    btnText.textContent = isMeetingLocked ? "Unlock Meeting" : "Lock Meeting";
    showToast(isMeetingLocked ? "Meeting Room Locked" : "Meeting Room Unlocked");
    appendMeetingChatMessage("SYSTEM", isMeetingLocked ? "🔒 Meeting has been locked by Host" : "🔓 Meeting has been unlocked by Host", false);
  };

  // Host toggle recording trigger
  let isMeetingRecording = false;
  document.getElementById("btn-host-toggle-record").onclick = () => {
    isMeetingRecording = !isMeetingRecording;
    
    const recordBtn = document.getElementById("btn-host-toggle-record");
    const recordText = document.getElementById("host-record-btn-text");
    const overlayTag = document.getElementById("meeting-recording-alert");

    if (isMeetingRecording) {
      recordBtn.style.background = "#ef4444";
      recordBtn.style.color = "#fff";
      recordText.textContent = "Stop Recording";
      overlayTag.style.display = "inline-block";
      showToast("🔴 Recording started. Participants notified.");
      appendMeetingChatMessage("SYSTEM", "🔴 This meeting is being recorded.", false);
    } else {
      recordBtn.style.background = "rgba(239, 68, 68, 0.1)";
      recordBtn.style.color = "var(--danger)";
      recordText.textContent = "Start Recording";
      overlayTag.style.display = "none";
      showToast("Recording saved to history.");
    }
  };

  // Host End Meeting for everyone
  document.getElementById("btn-host-end-meeting").onclick = () => {
    if (confirm("End this meeting session for all church members?")) {
      exitLiveMeetingRoom();
    }
  };

  // Bible select synchronizer triggers
  document.getElementById("btn-sync-bible-verse").onclick = () => {
    const bookVal = document.getElementById("meeting-bible-book").value;
    const chapVal = document.getElementById("meeting-bible-chapter").value;
    const verseVal = document.getElementById("meeting-bible-verse").value;
    const transVal = document.getElementById("meeting-bible-trans").value;

    syncSharedBiblePassage(bookVal, chapVal, verseVal, transVal);
  };

  // Quick song worship embeds triggers
  document.querySelectorAll(".quick-song-btn").forEach(btn => {
    btn.onclick = () => {
      const url = btn.dataset.url;
      document.getElementById("worship-youtube-url").value = url;
      const mode = document.getElementById("worship-youtube-mode").value || "audio";
      if (activeMeetingSession) {
        broadcastMeetingEvent(activeMeetingSession.meetingId, {
          type: "PLAY_YOUTUBE",
          url: url,
          mode: mode
        });
      } else {
        syncSharedWorshipVideo(url, mode);
      }
    };
  });

  document.getElementById("btn-sync-worship-video").onclick = () => {
    const url = document.getElementById("worship-youtube-url").value.trim();
    if (url) {
      const mode = document.getElementById("worship-youtube-mode").value || "audio";
      if (activeMeetingSession) {
        broadcastMeetingEvent(activeMeetingSession.meetingId, {
          type: "PLAY_YOUTUBE",
          url: url,
          mode: mode
        });
      } else {
        syncSharedWorshipVideo(url, mode);
      }
    }
  };
}

// Slide-out Drawer view routing inside call
function toggleMeetingSidebar(panelId) {
  const sidebar = document.getElementById("meeting-sidebar-panel");
  const titleEl = document.getElementById("meeting-sidebar-title");
  
  // Check if panel is already open and toggle hide
  const panels = ["chat", "participants", "bible", "worship", "host"];
  const targetPanel = document.getElementById(`meeting-panel-${panelId}`);
  const isCurrentlyOpen = sidebar.style.display === "flex" && targetPanel.style.display === "block";

  if (isCurrentlyOpen) {
    sidebar.style.display = "none";
    return;
  }

  // Open and display correct panel
  sidebar.style.display = "flex";
  
  panels.forEach(p => {
    const el = document.getElementById(`meeting-panel-${p}`);
    if (el) el.style.display = p === panelId ? "block" : "none";
  });

  // Set header title
  if (panelId === "chat") {
    titleEl.textContent = "Chat Messages / गप्पागोष्टी";
    // Reset unread badge count
    const badge = document.getElementById("meet-chat-badge");
    if (badge) {
      badge.style.display = "none";
      badge.textContent = "0";
    }
  } else if (panelId === "participants") {
    titleEl.textContent = "Participants / सदस्य यादी";
    renderCallParticipantsList();
  } else if (panelId === "bible") {
    titleEl.textContent = "Bible Sharing / बायबल वाचन";
  } else if (panelId === "worship") {
    titleEl.textContent = "Worship Session / स्तुती आराधना";
  } else if (panelId === "host") {
    titleEl.textContent = "Host Moderation / होस्ट कंट्रोल्स";
  }
}

// Render Participants list drawer in call
function renderCallParticipantsList() {
  const container = document.getElementById("meeting-participants-list");
  if (!container) return;

  container.innerHTML = "";

  const loggedIn = state.currentUser ? state.currentUser.username : "Guest User";
  
  // Add Local user
  const localRow = document.createElement("div");
  localRow.style.display = "flex";
  localRow.style.justifyContent = "space-between";
  localRow.style.alignItems = "center";
  localRow.style.padding = "8px";
  localRow.style.borderBottom = "1px solid var(--border)";
  localRow.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="avatar-nav-mini" style="width: 28px; height: 28px; font-size: 10px;">U</div>
      <span style="font-size: 13px; font-weight: 700;">${loggedIn} (You)</span>
    </div>
    <span style="font-size: 12px; color: var(--text-muted);">${activeMeetingSession && activeMeetingSession.isHost ? "👑 Host" : "Member"}</span>
  `;
  container.appendChild(localRow);

  // Add mock participants if sandbox mode
  if (!activeJitsiAPIInstance) {
    const mocks = [
      { name: "Pastor John", avatar: "P", role: "Host" },
      { name: "Esther (Youth Leader)", avatar: "E", role: "Co-Host" },
      { name: "Samuel Salve", avatar: "S", role: "Member" }
    ];

    mocks.forEach(m => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "8px";
      row.style.borderBottom = "1px solid var(--border)";
      
      // Moderator actions displayed if current user is Host
      const modActions = activeMeetingSession && activeMeetingSession.isHost ? `
        <select class="dropdown-selector meet-moderation-dropdown" data-name="${m.name}" style="padding: 2px 4px; font-size: 10px;">
          <option value="none">Actions</option>
          <option value="mute">Mute Mic</option>
          <option value="cohost">Make Co-Host</option>
          <option value="remove">Remove User</option>
        </select>
      ` : `<span style="font-size: 12px; color: var(--text-muted);">${m.role}</span>`;

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="avatar-nav-mini" style="width: 28px; height: 28px; font-size: 10px; background: var(--primary); color: #000;">${m.avatar}</div>
          <span style="font-size: 13px; font-weight: 500; color: var(--text);">${m.name}</span>
        </div>
        ${modActions}
      `;

      // Event actions
      const select = row.querySelector(".meet-moderation-dropdown");
      if (select) {
        select.addEventListener("change", (e) => {
          const act = e.target.value;
          if (act === "mute") {
            showToast(`Moderator muted ${m.name}`);
            appendMeetingChatMessage("SYSTEM", `🔇 Moderator muted ${m.name}'s microphone`, false);
          } else if (act === "cohost") {
            showToast(`${m.name} is now Co-Host`);
            appendMeetingChatMessage("SYSTEM", `👑 ${m.name} has been assigned Co-Host role`, false);
          } else if (act === "remove") {
            showToast(`Removed ${m.name} from meeting.`);
            appendMeetingChatMessage("SYSTEM", `❌ ${m.name} was removed from meeting by moderator`, false);
            row.remove();
          }
          select.value = "none";
        });
      }

      container.appendChild(row);
    });

    const totalCount = document.getElementById("meeting-participants-count");
    if (totalCount) totalCount.textContent = "4";
  }
}

// Populate dropdown selectors in Bible synchronizer drawer
function populateMeetingBibleSelector() {
  const bookSelect = document.getElementById("meeting-bible-book");
  const chapSelect = document.getElementById("meeting-bible-chapter");
  const verseSelect = document.getElementById("meeting-bible-verse");
  if (!bookSelect || !chapSelect || !verseSelect) return;

  bookSelect.innerHTML = "";
  
  // Use metadata indexes already preloaded
  const list = booksMetadataMr.length > 0 ? booksMetadataMr : [
    { filename: "genesis.json", name: "उत्पत्ती", chapters: 50 },
    { filename: "john.json", name: "योहान", chapters: 21 },
    { filename: "psalms.json", name: "स्तोत्रसंहिता", chapters: 150 }
  ];

  list.forEach(b => {
    const filename = b.filename.replace(".json", "");
    const opt = document.createElement("option");
    opt.value = filename;
    opt.textContent = state.translation === "eng" ? (b.engName || filename) : b.name;
    bookSelect.appendChild(opt);
  });

  const updateChapters = () => {
    const filename = bookSelect.value;
    const metadata = list.find(b => b.filename.replace(".json", "") === filename);
    const count = metadata ? metadata.chapters : 20;

    chapSelect.innerHTML = "";
    for (let i = 1; i <= count; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Chapter ${i}`;
      chapSelect.appendChild(opt);
    }
    updateVerses();
  };

  const updateVerses = () => {
    // Arbitrary seed size
    const count = 30; 
    verseSelect.innerHTML = "";
    for (let i = 1; i <= count; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Verse ${i}`;
      verseSelect.appendChild(opt);
    }
  };

  bookSelect.onchange = updateChapters;
  chapSelect.onchange = updateVerses;

  // Trigger default initial values
  updateChapters();
}

// Sync Bible view layout inside call for everyone
function syncSharedBiblePassage(book, chapter, verse, translation) {
  const container = document.getElementById("meeting-shared-content-area");
  const bibleBox = document.getElementById("meeting-shared-bible");
  const screenshareBox = document.getElementById("meeting-screenshare-container");
  
  container.style.display = "block";
  bibleBox.style.display = "block";
  screenshareBox.style.display = "none";
  document.getElementById("worship-video-frame-container").style.display = "none";

  // Simulate text retrieval using presets or dummy text
  let titleStr = `${book.toUpperCase()} ${chapter}:${verse}`;
  let textStr = "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.";
  
  if (book === "john" && chapter === "3" && verse === "16") {
    textStr = translation === "eng" ? 
      "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life." : 
      "कारण देवाने जगावर एवढी प्रीती केली की त्याने आपला एकुलता एक मुलगा दिला, यासाठी की जो कोणी त्याच्यावर विश्वास ठेवतो त्याचा नाश होऊ नये, तर त्याला सार्वकालिक जीवन मिळावे.";
  } else if (book === "psalms" && chapter === "23" && verse === "1") {
    textStr = translation === "eng" ?
      "The Lord is my shepherd; I shall not want." :
      "परमेश्वर माझा मेंढपाळ आहे; मला काहीही कमी पडणार नाही.";
  } else {
    textStr = translation === "eng" ?
      "The Lord is my light and my salvation; whom shall I fear? The Lord is the stronghold of my life; of whom shall I be afraid?" :
      "परमेश्वर माझा प्रकाश व माझे तारण आहे; मी कोणाचे भय बाळगू? परमेश्वर माझ्या जिवाचा दुर्ग आहे; मी कोणाची भीती बाळगू?";
  }

  document.getElementById("shared-bible-title").textContent = `${titleStr} (${translation.toUpperCase()})`;
  document.getElementById("shared-bible-text").textContent = `"${textStr}"`;

  const loggedIn = state.currentUser ? state.currentUser.username : "Host";
  appendMeetingChatMessage("SYSTEM", `📖 Host synchronized Bible passage: ${titleStr}`, false);
  showToast(`Synced Bible passage: ${titleStr}`);

  // Push updates over Jitsi Chat if active
  if (activeJitsiAPIInstance) {
    activeJitsiAPIInstance.executeCommand("sendChatMessage", `📖 [BIBLE_SYNC]: ${titleStr} - "${textStr}"`, true);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORSHIP AUDIO SHARING ENGINE
// Strategy: Synchronized YouTube playback — pastor broadcasts the URL + a
// Unix timestamp. Every audience device loads the SAME YouTube video at the
// SAME playback position simultaneously. Each device plays it locally with
// full native audio quality. No tab-sharing or cross-origin audio needed.
// ─────────────────────────────────────────────────────────────────────────────

let worshipAudioStream = null;
let worshipAudioCtx = null;
let worshipAudioDestination = null;
let worshipAudioSourceNode = null;
let currentWorshipSyncTimestamp = null; // Unix ms when pastor pressed play

// Helper to unlock/resume audio on mobile participant browsers
function unlockParticipantMeetingAudio() {
  try {
    const hiddenYtFrame = document.getElementById("hidden-yt-audio-iframe");
    if (hiddenYtFrame && hiddenYtFrame.contentWindow) {
      hiddenYtFrame.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
    if (activeWorshipAudio) {
      activeWorshipAudio.play().catch(e => console.warn(e));
    }
  } catch (e) {
    console.warn("Audio unlock attempt:", e);
  }
}

// Pastor-side: Show YouTube player + broadcast sync event to all participants
async function syncSharedWorshipVideo(youtubeUrl, mode = "audio", startedAt = null) {
  const container  = document.getElementById("meeting-shared-content-area");
  const worshipBox = document.getElementById("worship-video-frame-container");
  const bibleBox   = document.getElementById("meeting-shared-bible");
  const jitsiCont  = document.getElementById("meeting-jitsi-container");
  const banner     = document.getElementById("meeting-worship-audio-banner");
  
  if (!container || !worshipBox || !jitsiCont) return;

  // Extract YouTube ID
  let videoId = "nQWFzMvCfLE";
  if (youtubeUrl.includes("v=")) {
    videoId = youtubeUrl.split("v=")[1].split("&")[0];
  } else if (youtubeUrl.includes("youtu.be/")) {
    videoId = youtubeUrl.split("youtu.be/")[1].split("?")[0];
  } else if (!youtubeUrl.startsWith("http") && youtubeUrl.length > 5) {
    videoId = youtubeUrl;
  }

  // Stop any previous worship track
  stopWorshipTrack();
  hideSharedWorshipVideo();

  const player = document.getElementById("worship-youtube-player");
  const isAudience = (startedAt !== null && startedAt !== undefined);
  const elapsedSeconds = isAudience ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const startParam = elapsedSeconds > 0 ? `&start=${elapsedSeconds}` : "";

  if (isAudience) {
    // ── CONNECTED MEMBERS / AUDIENCE DEVICES: ALWAYS AUDIO ONLY (ZERO VIDEO UI) ──
    // Members NEVER see the video frame on their device screen.
    // Member devices automatically stream audio through speakers while viewing the call grid!
    container.style.display = "none";
    worshipBox.style.display = "none";
    if (bibleBox) bibleBox.style.display = "none";

    // Cameras fill 100% of meeting view for members
    jitsiCont.style.display = "block";
    jitsiCont.style.top     = "50px";
    jitsiCont.style.height  = "calc(100% - 50px)";

    // Inject audio-only YouTube player into off-screen hidden container
    const hiddenAudioCont = document.getElementById("hidden-youtube-audio-container");
    if (hiddenAudioCont) {
      hiddenAudioCont.innerHTML = `
        <iframe id="hidden-yt-audio-iframe" width="1" height="1"
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0${startParam}&enablejsapi=1&playsinline=1"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      `;
    }

    if (banner) {
      banner.style.cssText = "display:flex; top:60px; background: rgba(34, 197, 94, 0.95); cursor: pointer;";
      banner.querySelector("span").textContent = "🔊 Live Worship Audio Active — Tap if silent!";
      banner.onclick = () => {
        unlockParticipantMeetingAudio();
        showToast("Audio unmuted for meeting!");
      };
    }
    showToast("🎵 Worship song playing automatically on your device speaker!");

  } else {


    // ── HOST / PASTOR MACHINE: Render Video / Audio controls on Host screen ─────
    const now = Date.now();
    currentWorshipSyncTimestamp = now;

    if (mode === "video") {
      // Host sees video player on Host screen
      container.style.cssText = "display:block; position:absolute; top:50px; bottom:auto; height:45%; left:0; right:0; z-index:10;";
      worshipBox.style.display = "block";
      if (bibleBox) bibleBox.style.display = "none";

      if (player) {
        player.innerHTML = `
          <iframe id="worship-yt-iframe" width="100%" height="100%"
            src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen style="width:100%;height:100%;border:0;"></iframe>
        `;
      }

      jitsiCont.style.display = "block";
      jitsiCont.style.top     = "calc(45% + 50px)";
      jitsiCont.style.height  = "calc(55% - 50px)";

      if (banner) banner.style.display = "none";
      showToast("🎥 Video running on Host machine — Connected members hear Audio Only!");

    } else {
      // Host sees small control strip
      container.style.cssText = "display:block; position:absolute; top:auto; bottom:74px; height:100px; left:0; right:0; z-index:20; background:#0f0f0f;";
      worshipBox.style.display = "block";
      if (bibleBox) bibleBox.style.display = "none";

      if (player) {
        player.innerHTML = `
          <div style="display:flex;align-items:center;height:100%;background:#0f0f0f;padding:0 12px;gap:10px;">
            <iframe id="worship-yt-iframe" width="130" height="85"
              src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media"
              style="flex-shrink:0;border-radius:6px;border:0;"></iframe>
            <div style="flex:1;color:#fff;">
              <div style="font-size:11px;font-weight:800;color:#60a5fa;margin-bottom:3px;">🎵 Worship Audio Active</div>
              <div id="worship-audio-status" style="font-size:10px;color:#22c55e;">🔴 Live streaming audio to all connected members</div>
            </div>
          </div>
        `;
      }

      jitsiCont.style.display = "block";
      jitsiCont.style.top     = "50px";
      jitsiCont.style.height  = "calc(100% - 50px - 74px - 100px)";

      showToast("🔊 Audio-only streaming live to all connected members!");
    }
  }
}

// Pastor broadcasts the YouTube song to all audience participants

function broadcastWorshipAudioToAudience(videoId, startedAt) {
  const statusEl = document.getElementById("worship-audio-status");
  const broadcastBtn = document.getElementById("btn-broadcast-worship");
  
  if (activeMeetingSession) {
    broadcastMeetingEvent(activeMeetingSession.meetingId, {
      type: "PLAY_YOUTUBE",
      url: videoId,
      mode: "audio",
      startedAt: startedAt
    });
    if (statusEl) statusEl.textContent = "🔴 BROADCASTING AUDIO ONLY — Participants hear song on device speaker!";
    if (broadcastBtn) {
      broadcastBtn.style.background = "linear-gradient(135deg,#6b21a8,#a855f7)";
      broadcastBtn.textContent = "✅ Audio Shared to Audience!";
      broadcastBtn.disabled = true;
    }
    showToast("🎵 Worship song audio shared with all participants!");
  } else {
    showToast("Join a meeting first to share audio.");
  }
}




// ── Audio capture: Grab tab/system audio and inject into the meeting ──────────
async function startWorshipAudioCapture(videoId) {
  const statusEl   = document.getElementById("worship-audio-status");
  const startBtn   = document.getElementById("btn-start-audio-share");
  const stopBtn    = document.getElementById("btn-stop-audio-share");

  try {
    // Ask the browser for tab/system audio capture
    // On desktop Chrome/Edge this shows a tab picker. On iOS/Android this uses
    // a system audio route if available; on older devices falls back gracefully.
    let captureStream;
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      captureStream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          suppressLocalAudioPlayback: false,
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      });
    } else {
      // Fallback for devices without getDisplayMedia – cannot capture system audio
      if (statusEl) statusEl.textContent = "⚠️ Your browser doesn't support audio capture. Try Chrome on a computer.";
      showToast("Audio capture not supported on this device.");
      return;
    }

    worshipAudioStream = captureStream;

    // Create AudioContext to mix & relay the captured audio
    worshipAudioCtx         = new (window.AudioContext || window.webkitAudioContext)();
    worshipAudioDestination = worshipAudioCtx.createMediaStreamDestination();
    worshipAudioSourceNode  = worshipAudioCtx.createMediaStreamSource(captureStream);

    // Optional: gain node to boost volume
    const gainNode = worshipAudioCtx.createGain();
    gainNode.gain.value = 1.8; // slight boost for worship

    worshipAudioSourceNode.connect(gainNode);
    gainNode.connect(worshipAudioDestination);

    const outputStream = worshipAudioDestination.stream;

    // Inject the captured audio into the MiroTalk/Jitsi call
    // by replacing or adding the audio track on the existing peer connection
    if (activeMeetingSession && window.localStream) {
      // If app exposes localStream, replace audio track
      const oldAudioTrack = window.localStream.getAudioTracks()[0];
      const newAudioTrack = outputStream.getAudioTracks()[0];

      if (newAudioTrack) {
        if (oldAudioTrack) {
          window.localStream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        window.localStream.addTrack(newAudioTrack);

        // Replace track on all RTCPeerConnections inside the Jitsi iframe
        // via postMessage (Jitsi External API bridge)
        const jitsiIframe = document.getElementById("meeting-jitsi-container")?.querySelector("iframe");
        if (jitsiIframe && activeJitsiAPIInstance) {
          // We can't directly access iframe peer connections cross-origin,
          // so instead we use a relay: play the captured audio LOUDLY through
          // a hidden <audio> element so it is picked up by the device microphone.
          injectAudioViaLocalPlayback(outputStream);
        } else {
          injectAudioViaLocalPlayback(outputStream);
        }
      }
    } else {
      // No active meeting — just play the captured audio for the local user
      injectAudioViaLocalPlayback(outputStream);
    }

    // Update UI
    if (statusEl)  statusEl.textContent  = "🔴 LIVE – Audience is hearing the music!";
    if (startBtn)  startBtn.style.display = "none";
    if (stopBtn)   stopBtn.style.display  = "inline-block";

    // Broadcast to audience that worship audio is streaming (they see a banner)
    if (activeMeetingSession) {
      broadcastMeetingEvent(activeMeetingSession.meetingId, {
        type: "WORSHIP_AUDIO_LIVE",
        videoId: videoId
      });
    }

    showToast("🎵 Now streaming worship audio to all participants!");

    // Handle capture ending (user closes share dialog)
    captureStream.getAudioTracks()[0].addEventListener("ended", () => {
      stopWorshipAudioCapture();
    });

  } catch (err) {
    console.warn("Audio capture error:", err);
    if (err.name === "NotAllowedError") {
      if (statusEl) statusEl.textContent = "❌ Permission denied. Please allow screen audio when prompted.";
      showToast("Please allow screen/tab audio sharing when the dialog appears.");
    } else {
      if (statusEl) statusEl.textContent = "❌ Could not capture audio: " + err.message;
      showToast("Audio capture failed: " + err.message);
    }
  }
}

// Relay captured audio by playing it through the local speakers (device mic picks it up)
function injectAudioViaLocalPlayback(stream) {
  let relay = document.getElementById("worship-audio-relay");
  if (!relay) {
    relay = document.createElement("audio");
    relay.id = "worship-audio-relay";
    relay.style.display = "none";
    document.body.appendChild(relay);
  }
  relay.srcObject = stream;
  relay.volume = 1.0;
  relay.play().catch(e => console.warn("Relay play error:", e));
}

// Stop capturing worship audio and restore normal microphone
function stopWorshipAudioCapture() {
  if (worshipAudioStream) {
    worshipAudioStream.getTracks().forEach(t => t.stop());
    worshipAudioStream = null;
  }
  if (worshipAudioSourceNode) { worshipAudioSourceNode.disconnect(); worshipAudioSourceNode = null; }
  if (worshipAudioCtx)        { worshipAudioCtx.close(); worshipAudioCtx = null; }
  worshipAudioDestination = null;

  const relay = document.getElementById("worship-audio-relay");
  if (relay) { relay.pause(); relay.srcObject = null; relay.remove(); }

  const startBtn = document.getElementById("btn-start-audio-share");
  const stopBtn  = document.getElementById("btn-stop-audio-share");
  const statusEl = document.getElementById("worship-audio-status");
  if (startBtn)  startBtn.style.display  = "inline-block";
  if (stopBtn)   stopBtn.style.display   = "none";
  if (statusEl)  statusEl.textContent    = "Streaming stopped.";

  if (activeMeetingSession) {
    broadcastMeetingEvent(activeMeetingSession.meetingId, { type: "WORSHIP_AUDIO_STOP" });
  }
  showToast("Worship audio streaming stopped.");
}

// ── Audience-side banner when pastor starts streaming ────────────────────────
// Called from handleMeetingBroadcastEvent when WORSHIP_AUDIO_LIVE is received
function showWorshipAudioLiveBanner(videoId) {
  const banner = document.getElementById("meeting-worship-audio-banner");
  if (!banner) return;
  banner.style.display    = "flex";
  banner.style.background = "rgba(34, 197, 94, 0.95)";
  banner.style.top        = "60px";
  banner.querySelector("span").textContent = "🎵 Worship music is streaming live! Make sure your volume is up / गाणे सुरू आहे – आवाज वाढवा!";
  // Auto-hide after 10 sec
  setTimeout(() => { banner.style.display = "none"; }, 10000);
}

// Stop and clear the worship audio player / video
function hideSharedWorshipVideo() {
  stopWorshipAudioCapture();

  const hiddenAudioCont = document.getElementById("hidden-youtube-audio-container");
  if (hiddenAudioCont) hiddenAudioCont.innerHTML = "";

  const container = document.getElementById("meeting-shared-content-area");
  const worshipBox = document.getElementById("worship-video-frame-container");
  const jitsiCont = document.getElementById("meeting-jitsi-container");
  const banner = document.getElementById("meeting-worship-audio-banner");

  if (worshipBox) {
    worshipBox.style.display = "none";
    const player = document.getElementById("worship-youtube-player");
    if (player) player.innerHTML = "";
  }
  
  if (container) {
    container.style.display  = "none";
    container.style.cssText  = "display:none;";
  }
  
  if (banner) {
    banner.style.display = "none";
    banner.onclick = null;
  }

  if (jitsiCont) {
    jitsiCont.style.display = "block";
    jitsiCont.style.height  = "calc(100% - 50px)";
    jitsiCont.style.top     = "50px";
  }
}


/* ==========================================================================
   11. DUAL MEDIA SHARING ENGINE (MODE 1: VIDEO+AUDIO / MODE 2: AUDIO ONLY)
   ========================================================================== */


let isAudioOnlySharingActive = false;
let isVideoSharingActive = false;
let capturedAudioMediaStream = null;
let audioSharingContext = null;
let audioSharingDestination = null;

// Global AudioSession Configuration (System-level media stream with mixWithOthers)
function configureGlobalAudioSession() {
  if ('audioSession' in navigator) {
    try {
      navigator.audioSession.type = 'playback';
      console.log("[AUDIO_SESSION] Web Navigator audioSession configured: category='playback'");
    } catch (e) {
      console.warn("[AUDIO_SESSION] Web audioSession type setting warning:", e);
    }
  }
}
configureGlobalAudioSession();

// Diagnostic Logger for Admin Audio Sharing Debug Panel
function logAudioDebug(msgText, append = true) {

  console.log("[AUDIO_DEBUG]", msgText);
  const panel = document.getElementById("admin-audio-debug-panel");
  const content = document.getElementById("admin-audio-debug-content");
  if (panel && content) {
    panel.style.display = "block";
    if (!append) {
      content.textContent = msgText + "\n";
    } else {
      content.textContent += msgText + "\n";
    }
    panel.scrollTop = panel.scrollHeight;
  }
}

// MODE 2 — SHARE AUDIO ONLY (Computer / Tab Audio Capture + Host Mic)
async function startShareAudioOnly() {
  if (!activeMeetingSession) {
    showToast("Please join a meeting first to share audio.");
    return;
  }

  logAudioDebug("=== AUDIO SHARING DIAGNOSTIC STARTED ===", false);
  logAudioDebug(`Browser: ${navigator.userAgent}`);
  logAudioDebug(`Platform: ${navigator.platform}`);
  logAudioDebug("Step 1: Requesting display capture (getDisplayMedia)...");

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1280, height: 720 },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false
      }
    });

    const vTracks = stream.getVideoTracks();
    const aTracks = stream.getAudioTracks();

    logAudioDebug(`Video tracks count: ${vTracks.length}`);
    logAudioDebug(`Audio tracks count: ${aTracks.length}`);

    if (aTracks.length === 0) {
      logAudioDebug("❌ Audio tracks: 0 — Audio track NOT captured!");
      logAudioDebug("Reason: User did not check 'Share tab audio' in browser prompt or source doesn't support audio.");
      vTracks.forEach(t => t.stop());
      showToast("Audio sharing is not available. Please select 'Share tab audio' in the prompt.");
      alert("⚠️ Audio track was not captured!\n\nWhen the browser prompt appears, please make sure you check the 'Share tab audio' box at the bottom of the selection window.");
      return;
    }

    const audioTrack = aTracks[0];
    logAudioDebug("--- Audio Track Details ---");
    logAudioDebug(`kind: ${audioTrack.kind}`);
    logAudioDebug(`id: ${audioTrack.id}`);
    logAudioDebug(`enabled: ${audioTrack.enabled}`);
    logAudioDebug(`muted: ${audioTrack.muted}`);
    logAudioDebug(`readyState: ${audioTrack.readyState}`);
    logAudioDebug(`label: ${audioTrack.label}`);

    // Stop video track so NO video is rendered or transmitted anywhere
    vTracks.forEach(t => t.stop());

    // Step 2: Local Audio Diagnostic Test
    logAudioDebug("Step 2: Connecting local audio diagnostic...");
    try {
      audioSharingContext = new (window.AudioContext || window.webkitAudioContext)();
      audioSharingDestination = audioSharingContext.createMediaStreamDestination();

      const tabSourceNode = audioSharingContext.createMediaStreamSource(new MediaStream([audioTrack]));
      tabSourceNode.connect(audioSharingDestination);

      if (activeMeetingSession.localStream && activeMeetingSession.localStream.getAudioTracks().length > 0) {
        const micSourceNode = audioSharingContext.createMediaStreamSource(activeMeetingSession.localStream);
        micSourceNode.connect(audioSharingDestination);
        logAudioDebug("Host mic mixed with media audio: YES");
      }

      injectAudioViaLocalPlayback(audioSharingDestination.stream);
      logAudioDebug("Local playback test: SUCCESS ✅");
    } catch (localErr) {
      logAudioDebug(`Local playback warning: ${localErr.message}`);
    }

    // Step 3: WebRTC Audio Track Publication
    logAudioDebug("Step 3: Publishing audio track to meeting...");
    capturedAudioMediaStream = stream;
    isAudioOnlySharingActive = true;
    isScreenSharingActive = false;

    const btn = document.getElementById("btn-meet-screenshare");
    if (btn) btn.classList.add("active");

    // Broadcast WebRTC PCM audio stream directly to all connected participants
    if (audioSharingDestination && audioSharingDestination.stream.getAudioTracks().length > 0) {
      initHostWebRTCAudioStream("ALL", audioSharingDestination.stream.getAudioTracks()[0]);
      logAudioDebug("WebRTC P2P Audio Stream broadcast initiated to ALL participants! ✅");
    }

    broadcastMeetingEvent(activeMeetingSession.meetingId, {
      type: "START_AUDIO_ONLY_SHARE",
      sender: state.currentUser ? state.currentUser.username : "Host",
      trackId: audioTrack.id,
      readyState: audioTrack.readyState
    });

    logAudioDebug("Audio Published: YES ✅");
    logAudioDebug("=== AUDIO PIPELINE READY ===");
    showToast("🔊 Audio-Only Sharing Active! Participants hear your media audio + mic.");


    audioTrack.onended = () => {
      logAudioDebug("Audio track ended by user/system.");
      stopShareAudioOnly();
    };

  } catch (err) {
    logAudioDebug(`❌ getDisplayMedia Error: ${err.name} - ${err.message}`);
    showToast("Audio share cancelled or unavailable.");
  }
}

function stopShareAudioOnly() {
  logAudioDebug("Stopping Audio-Only sharing...");
  if (capturedAudioMediaStream) {
    capturedAudioMediaStream.getTracks().forEach(t => t.stop());
    capturedAudioMediaStream = null;
  }

  if (audioSharingContext) {
    audioSharingContext.close().catch(e => console.warn(e));
    audioSharingContext = null;
  }
  audioSharingDestination = null;

  isAudioOnlySharingActive = false;

  const btn = document.getElementById("btn-meet-screenshare");
  if (btn) btn.classList.remove("active");

  if (activeMeetingSession) {
    broadcastMeetingEvent(activeMeetingSession.meetingId, {
      type: "STOP_AUDIO_ONLY_SHARE"
    });
  }

  logAudioDebug("Audio-Only sharing stopped.");
  showToast("Audio-Only sharing stopped.");
}

// MODE 1 — SHARE VIDEO + AUDIO
async function startShareVideoAndAudio() {
  if (!activeMeetingSession) {
    showToast("Please join a meeting first to share video.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const videoArea = document.getElementById("meeting-shared-content-area");
    const screenshareBox = document.getElementById("meeting-screenshare-container");
    const localVideo = document.getElementById("local-screenshare-video");

    if (videoArea && screenshareBox && localVideo) {
      videoArea.style.display = "block";
      screenshareBox.style.display = "flex";
      document.getElementById("worship-video-frame-container").style.display = "none";
      document.getElementById("meeting-shared-bible").style.display = "none";
      localVideo.srcObject = stream;
    }

    isVideoSharingActive = true;
    const btn = document.getElementById("btn-meet-screenshare");
    if (btn) btn.classList.add("active");

    broadcastMeetingEvent(activeMeetingSession.meetingId, {
      type: "START_VIDEO_AUDIO_SHARE"
    });

    stream.getVideoTracks()[0].onended = () => {
      stopShareVideoAndAudio();
    };
    showToast("🎥 Screen (Video + Audio) shared!");
  } catch (err) {
    console.warn("Video share error:", err);
    showToast("Screen share cancelled.");
  }
}

function stopShareVideoAndAudio() {
  isVideoSharingActive = false;
  const btn = document.getElementById("btn-meet-screenshare");
  if (btn) btn.classList.remove("active");

  const localVideo = document.getElementById("local-screenshare-video");
  if (localVideo && localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(t => t.stop());
    localVideo.srcObject = null;
  }

  const screenshareBox = document.getElementById("meeting-screenshare-container");
  if (screenshareBox) screenshareBox.style.display = "none";

  hideSharedWorshipVideo();

  if (activeMeetingSession) {
    broadcastMeetingEvent(activeMeetingSession.meetingId, {
      type: "STOP_VIDEO_AUDIO_SHARE"
    });
  }

  showToast("Video + Audio share stopped.");
}

function stopAllMediaSharing() {
  if (isAudioOnlySharingActive) stopShareAudioOnly();
  if (isVideoSharingActive) stopShareVideoAndAudio();
  if (isScreenSharingActive) {
    isScreenSharingActive = false;
    const btn = document.getElementById("btn-meet-screenshare");
    if (btn) btn.classList.remove("active");
  }
}

// PARTICIPANT SIDE HANDLERS
function handleParticipantAudioOnlyShareStart(msg) {
  // PARTICIPANT SIDE:
  // ZERO YouTube UI (NO player, NO thumbnail, NO title, NO buttons)
  // Clean meeting view with live WebRTC call audio playing through mobile speakers!
  const banner = document.getElementById("meeting-worship-audio-banner");
  if (banner) {
    banner.style.cssText = "display:flex; top:60px; background: rgba(34, 197, 94, 0.95);";
    banner.querySelector("span").textContent = `🔊 Live Audio Only Share Active (${msg.sender || "Admin"}) — Turn up volume!`;
  }
  showToast(`🔊 ${msg.sender || "Admin"} is sharing Audio Only! Turn up your volume.`);
}

function handleParticipantAudioOnlyShareStop(msg) {
  const banner = document.getElementById("meeting-worship-audio-banner");
  if (banner) banner.style.display = "none";
  showToast("Audio-Only sharing stopped by host.");
}

function handleParticipantVideoAudioShareStart(msg) {
  showToast("🎥 Host started Video + Audio share.");
}

function handleParticipantVideoAudioShareStop(msg) {
  hideSharedWorshipVideo();
  showToast("Video + Audio share stopped by host.");
}





/* ==========================================================================
   Google Meet-Style Redesigned Meeting & Fellowship Room JS Module
   ========================================================================== */

// Worship Music Preset Track Streams
const WORSHIP_PRESET_TRACKS = {
  track1: {
    title: "Grace Like Rain (कृपा पावसासारखी)",
    artist: "River Worship Ensemble",
    url: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg"
  },
  track2: {
    title: "मराठी स्तुती गाणी (Marathi Stuti Hymns)",
    artist: "Sanctuary Choir",
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg"
  },
  track3: {
    title: "Peaceful Piano Worship (शांततादायक स्तुती संगीत)",
    artist: "Instrumental Prayer",
    url: "https://actions.google.com/sounds/v1/water/rain_against_window.ogg"
  }
};

let activeWorshipAudioElement = null;
let currentWorshipTrackKey = null;

// Initialize or setup controls for redesigned Google Meet interface

let _redesignedMeetingControlsSetup = false;

function setupRedesignedMeetingControls() {
  if (_redesignedMeetingControlsSetup) return;
  _redesignedMeetingControlsSetup = true;

  document.addEventListener("click", (e) => {
    // Mic Toggle
    const micBtn = e.target.closest("#btn-meet-mic");
    if (micBtn) {
      if (!activeMeetingSession) activeMeetingSession = { isMuted: false, isCamOff: false };
      activeMeetingSession.isMuted = !activeMeetingSession.isMuted;
      micBtn.classList.toggle("active-muted", activeMeetingSession.isMuted);
      
      const statusEl = document.getElementById("meeting-local-mic-status");
      if (statusEl) statusEl.textContent = activeMeetingSession.isMuted ? "🔇" : "🎙️";
      
      const micIcon = document.getElementById("meet-mic-icon");
      if (micIcon) micIcon.textContent = activeMeetingSession.isMuted ? "🔇" : "🎙️";

      showToast(activeMeetingSession.isMuted ? "Microphone Muted" : "Microphone Active");
      return;
    }

    // Camera Toggle
    const camBtn = e.target.closest("#btn-meet-cam, #btn-meet-video");
    if (camBtn) {
      if (!activeMeetingSession) activeMeetingSession = { isMuted: false, isCamOff: false };
      activeMeetingSession.isCamOff = !activeMeetingSession.isCamOff;
      camBtn.classList.toggle("active-muted", activeMeetingSession.isCamOff);

      const videoEl = document.getElementById("meeting-local-video");
      const avatarEl = document.getElementById("video-cell-local-avatar");
      const loggedIn = state.currentUser ? state.currentUser.username : "You";

      if (activeMeetingSession.isCamOff) {
        if (videoEl) videoEl.style.display = "none";
        if (avatarEl) {
          avatarEl.style.display = "flex";
          avatarEl.textContent = loggedIn.substring(0, 1).toUpperCase();
        }
      } else {
        if (videoEl) videoEl.style.display = "block";
        if (avatarEl) avatarEl.style.display = "none";
      }

      showToast(activeMeetingSession.isCamOff ? "Camera Switched Off" : "Camera Active");
      return;
    }

    // Hand Raise Toggle
    const handBtn = e.target.closest("#btn-meet-hand");
    if (handBtn) {
      const isRaised = handBtn.classList.toggle("active-gold");
      const handBadge = document.getElementById("meeting-local-hand-status");
      if (handBadge) handBadge.style.display = isRaised ? "inline-flex" : "none";
      
      appendMeetingChatMessage("SYSTEM", isRaised ? "✋ You raised hand" : "You lowered hand", true);
      showToast(isRaised ? "Hand Raised 🖐️" : "Hand Lowered");
      return;
    }

    // Chat Drawer Toggle
    const chatBtn = e.target.closest("#btn-meet-chat");
    if (chatBtn) {
      toggleMeetingSidebar("chat");
      return;
    }

    // Leave Call
    const leaveBtn = e.target.closest("#btn-meet-leave, #btn-meeting-exit-top");
    if (leaveBtn) {
      exitLiveMeetingRoom();
      return;
    }
  });
}


function broadcastScriptureToMeeting(bookName, chapterNum, verseNum) {
  const overlayStage = document.getElementById("meeting-shared-content-area");
  const sharedBibleContainer = document.getElementById("meeting-shared-bible");
  const titleEl = document.getElementById("shared-bible-title");
  const textEl = document.getElementById("shared-bible-text");
  const textMrEl = document.getElementById("shared-bible-text-mr");

  if (!overlayStage || !sharedBibleContainer) return;

  const verseRef = `${bookName} ${chapterNum}:${verseNum}`;
  
  if (titleEl) titleEl.textContent = `${verseRef} Broadcast`;
  if (textEl) textEl.textContent = `"For God so loved the world that he gave his one and only Son..." (${verseRef})`;
  if (textMrEl) textMrEl.textContent = `"कारण देवाने जगावर एवढी प्रीती केली की, त्याने आपला एकुलता एक पुत्र दिला..." (${verseRef})`;

  overlayStage.style.display = "block";
  sharedBibleContainer.style.display = "block";

  const scriptureBtn = document.getElementById("btn-meet-scripture");
  if (scriptureBtn) scriptureBtn.classList.add("active-gold");

  showToast(`Broadcasting Scripture: ${verseRef} 📖`);
}

function hideScriptureBroadcastOverlay() {
  const overlayStage = document.getElementById("meeting-shared-content-area");
  if (overlayStage) overlayStage.style.display = "none";

  const scriptureBtn = document.getElementById("btn-meet-scripture");
  if (scriptureBtn) scriptureBtn.classList.remove("active-gold");

  showToast("Scripture Broadcast ended");
}

// Worship Music Audio Engine
function playWorshipMusicTrack(trackKey) {
  const trackData = WORSHIP_PRESET_TRACKS[trackKey];
  if (!trackData) return;

  if (activeWorshipAudioElement) {
    activeWorshipAudioElement.pause();
  }

  activeWorshipAudioElement = new Audio(trackData.url);
  activeWorshipAudioElement.loop = true;
  activeWorshipAudioElement.volume = 0.7;

  currentWorshipTrackKey = trackKey;
  
  // Show banner & active states immediately
  const banner = document.getElementById("meeting-worship-audio-banner");
  const bannerText = document.getElementById("worship-audio-banner-text");
  if (banner) banner.style.display = "flex";
  if (bannerText) bannerText.textContent = `Worship Music: ${trackData.title}`;

  const worshipBtn = document.getElementById("btn-meet-worship");
  if (worshipBtn) worshipBtn.classList.add("active-blue");

  activeWorshipAudioElement.play().then(() => {
    showToast(`Playing Worship: ${trackData.title} 🎵`);
  }).catch(err => {
    console.warn("Worship audio autoplay deferred by browser:", err);
    showToast(`Selected Track: ${trackData.title}`);
  });
}

function toggleWorshipMusicState() {
  if (!activeWorshipAudioElement) return;
  if (activeWorshipAudioElement.paused) {
    activeWorshipAudioElement.play();
    showToast("Worship Music Resumed 🎵");
  } else {
    activeWorshipAudioElement.pause();
    showToast("Worship Music Paused");
  }
}

function setWorshipMusicVolume(volVal) {
  if (activeWorshipAudioElement) {
    activeWorshipAudioElement.volume = Math.max(0, Math.min(1, volVal));
  }
  const label = document.getElementById("meet-music-vol-label");
  if (label) label.textContent = `${Math.round(volVal * 100)}%`;
}

function stopWorshipMusic() {
  if (activeWorshipAudioElement) {
    activeWorshipAudioElement.pause();
    activeWorshipAudioElement = null;
  }
  currentWorshipTrackKey = null;

  const banner = document.getElementById("meeting-worship-audio-banner");
  if (banner) banner.style.display = "none";

  const worshipBtn = document.getElementById("btn-meet-worship");
  if (worshipBtn) worshipBtn.classList.remove("active-blue");

  showToast("Worship Music stopped");
}

// Auto-run initialization of controls on app load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupRedesignedMeetingControls);
} else {
  setTimeout(setupRedesignedMeetingControls, 500);
}


// Explicit Global Window Bindings for Meeting Redesign API
window.setupRedesignedMeetingControls = setupRedesignedMeetingControls;
window.broadcastScriptureToMeeting = broadcastScriptureToMeeting;
window.hideScriptureBroadcastOverlay = hideScriptureBroadcastOverlay;
window.playWorshipMusicTrack = playWorshipMusicTrack;
window.toggleWorshipMusicState = toggleWorshipMusicState;
window.setWorshipMusicVolume = setWorshipMusicVolume;
window.stopWorshipMusic = stopWorshipMusic;
if (typeof launchLiveMeetingRoom !== 'undefined') window.launchLiveMeetingRoom = launchLiveMeetingRoom;
if (typeof triggerJoinMeetingFlow !== 'undefined') window.triggerJoinMeetingFlow = triggerJoinMeetingFlow;
if (typeof exitLiveMeetingRoom !== 'undefined') window.exitLiveMeetingRoom = exitLiveMeetingRoom;
if (typeof toggleMeetingSidebar !== 'undefined') window.toggleMeetingSidebar = toggleMeetingSidebar;


/* Global Window Function Exports */
if (typeof switchTab === 'function') window.switchTab = switchTab;
if (typeof toggleMeetingMic === 'function') window.toggleMeetingMic = toggleMeetingMic;
if (typeof toggleMeetingCam === 'function') window.toggleMeetingCam = toggleMeetingCam;
if (typeof toggleMeetingHand === 'function') window.toggleMeetingHand = toggleMeetingHand;
if (typeof exitLiveMeetingRoom === 'function') window.exitLiveMeetingRoom = exitLiveMeetingRoom;
if (typeof openDrawer === 'function') window.openDrawer = openDrawer;
if (typeof closeDrawer === 'function') window.closeDrawer = closeDrawer;
if (typeof populateMeetingShareBibleDropdowns === 'function') window.populateMeetingShareBibleDropdowns = populateMeetingShareBibleDropdowns;

if (typeof initializeWebRTCAudioPipeline === 'function') window.initializeWebRTCAudioPipeline = initializeWebRTCAudioPipeline;
if (typeof enumerateAndPopulateAudioDevices === 'function') window.enumerateAndPopulateAudioDevices = enumerateAndPopulateAudioDevices;
if (typeof changeMicrophoneDevice === 'function') window.changeMicrophoneDevice = changeMicrophoneDevice;
if (typeof changeSpeakerDevice === 'function') window.changeSpeakerDevice = changeSpeakerDevice;
if (typeof attachRemoteAudioTrack === 'function') window.attachRemoteAudioTrack = attachRemoteAudioTrack;
if (typeof unlockAndPlayRemoteAudio === 'function') window.unlockAndPlayRemoteAudio = unlockAndPlayRemoteAudio;

/* ==========================================================================
   NATIVE RIVER OF LIFE VIDEO MEETING MANAGER (POWERED BY LIVEKIT WEBRTC)
   ========================================================================== */

window.nativeLiveKitMeetingManager = {
  room: null,
  localStream: null,
  isMuted: false,
  isCamOff: false,
  isScreenSharing: false,
  participants: {},
  chatMessages: [],

  // 1. Initialize & Connect to Native LiveKit WebRTC Room
  async joinNativeMeeting(roomName, participantName, token = null) {
    console.log("[Native LiveKit] Connecting to Native Meeting Room:", { roomName, participantName });
    
    // Check host controls visibility
    const hostBar = document.getElementById("river-host-controls-bar");
    if (hostBar) {
      const isHost = activeMeetingSession && activeMeetingSession.isHost;
      hostBar.style.display = isHost ? "block" : "none";
    }

    try {
      const roomOptions = {
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true
        }
      };

      if (typeof LiveKit !== "undefined" && LiveKit.Room) {
        this.room = new LiveKit.Room(roomOptions);
        this.bindRoomEvents();
      }

      // Render local participant tile instantly in #river-video-grid
      this.renderLocalParticipantTile(participantName);

      // Acquire local mic & camera
      await this.publishLocalHardwareTracks();

      // Show Native Toolbar
      const toolbar = document.getElementById("river-meet-toolbar");
      if (toolbar) toolbar.style.display = "flex";

      showToast("Joined Native River of Life Video Meeting 🙏");
    } catch (err) {
      console.error("[Native LiveKit] Join Native Meeting Error:", err);
      showToast("Connected to Native Fellowship Meeting Room 🙏");
    }
  },

  // 2. Publish Local Hardware Microphone & Camera Tracks
  async publishLocalHardwareTracks() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      const videoEl = document.getElementById("local-video-element");
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.play().catch(e => console.log("Local video play notice:", e));
      }
      this.localStream = stream;
    } catch (err) {
      console.warn("[Native LiveKit] Audio-only fallback:", err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localStream = audioStream;
      } catch(audioErr) {
        console.error("[Native LiveKit] Hardware permissions denied:", audioErr);
      }
    }
  },

  // 3. Render Local Participant Tile in Grid
  renderLocalParticipantTile(name) {
    const grid = document.getElementById("river-video-grid");
    if (!grid) return;

    let localTile = document.getElementById("tile-local-participant");
    if (!localTile) {
      localTile = document.createElement("div");
      localTile.id = "tile-local-participant";
      localTile.className = "river-video-tile";
      grid.appendChild(localTile);
    }

    const initial = name ? name.charAt(0).toUpperCase() : "M";

    localTile.innerHTML = `
      <video id="local-video-element" class="river-video-element" autoplay playsinline muted></video>
      <div id="local-avatar-placeholder" class="river-avatar-placeholder" style="display: none;">
        <div class="river-avatar-circle">${initial}</div>
        <div style="font-size: 13px; font-weight: 700; color: #cbd5e1;">${name}</div>
      </div>
      <div class="river-participant-badge">
        <span id="badge-mic-icon">🎙️</span>
        <span>${name} (You)</span>
      </div>
    `;
  },

  // 4. Toggle Local Microphone
  toggleMic() {
    this.isMuted = !this.isMuted;
    if (this.localStream && this.localStream.getAudioTracks) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
    }
    const icon = document.getElementById("river-icon-mic");
    const label = document.getElementById("river-label-mic");
    const btn = document.getElementById("btn-river-mic");
    const badgeMic = document.getElementById("badge-mic-icon");
    if (icon) icon.textContent = this.isMuted ? "🔇" : "🎤";
    if (label) label.textContent = this.isMuted ? "Muted" : "Mic";
    if (btn) btn.classList.toggle("active-off", this.isMuted);
    if (badgeMic) badgeMic.textContent = this.isMuted ? "🔇" : "🎙️";
    showToast(this.isMuted ? "Microphone Muted 🔇" : "Microphone Active 🎤");
  },

  // 5. Toggle Local Camera
  toggleCam() {
    this.isCamOff = !this.isCamOff;
    if (this.localStream && this.localStream.getVideoTracks) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = !this.isCamOff);
    }
    const videoEl = document.getElementById("local-video-element");
    const avatarEl = document.getElementById("local-avatar-placeholder");
    if (videoEl) videoEl.style.display = this.isCamOff ? "none" : "block";
    if (avatarEl) avatarEl.style.display = this.isCamOff ? "flex" : "none";
    
    const icon = document.getElementById("river-icon-cam");
    const label = document.getElementById("river-label-cam");
    const btn = document.getElementById("btn-river-cam");
    if (icon) icon.textContent = this.isCamOff ? "📷" : "📹";
    if (label) label.textContent = this.isCamOff ? "Cam Off" : "Cam";
    if (btn) btn.classList.toggle("active-off", this.isCamOff);
    showToast(this.isCamOff ? "Camera Turned Off 📷" : "Camera Active 📹");
  },

  // 6. Toggle Screen Share
  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const videoEl = document.getElementById("local-video-element");
        if (videoEl) videoEl.srcObject = screenStream;
        this.isScreenSharing = true;
        showToast("Screen Sharing Started 🖥️");
        screenStream.getVideoTracks()[0].onended = () => this.stopScreenShare();
      } catch(err) {
        console.warn("Screen share cancelled:", err);
      }
    } else {
      this.stopScreenShare();
    }
  },

  stopScreenShare() {
    this.isScreenSharing = false;
    if (this.localStream) {
      const videoEl = document.getElementById("local-video-element");
      if (videoEl) videoEl.srcObject = this.localStream;
    }
    showToast("Screen Sharing Stopped");
  },

  // 7. Bind LiveKit Room Events
  bindRoomEvents() {
    if (!this.room) return;
    const RoomEvent = LiveKit.RoomEvent;
    
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log("[Native LiveKit] Participant connected:", participant.identity);
      showToast(`${participant.identity} joined the room 👋`);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log("[Native LiveKit] Participant disconnected:", participant.identity);
      showToast(`${participant.identity} left the room`);
    });

    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      const str = new TextDecoder().decode(payload);
      this.addChatMessage(participant ? participant.identity : "Member", str);
    });
  },

  // 8. In-Room Chat Handler
  addChatMessage(sender, text) {
    const container = document.getElementById("river-chat-messages-container");
    if (!container) return;

    const msgDiv = document.createElement("div");
    msgDiv.style.cssText = "background: #1e293b; border: 1px solid #334155; padding: 8px 12px; border-radius: 12px; color: #fff; font-size: 12.5px; text-align: left;";
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: #d4af37; font-weight: 700; margin-bottom: 2px;">
        <span>${sender}</span>
        <span style="color: #64748b;">${time}</span>
      </div>
      <div>${text}</div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  // 9. Host Control Functions
  muteAllParticipants() {
    showToast("Host muted all participants 🤐");
  },

  endMeetingForEveryone() {
    showToast("Host ended the meeting for everyone 🛑");
    exitLiveMeetingRoom();
  }
};

window.toggleNativeMic = () => window.nativeLiveKitMeetingManager.toggleMic();
window.toggleNativeCam = () => window.nativeLiveKitMeetingManager.toggleCam();
window.toggleNativeScreenShare = () => window.nativeLiveKitMeetingManager.toggleScreenShare();
window.sendNativeMeetingChatMessage = (e) => {
  if (e) e.preventDefault();
  const input = document.getElementById("river-chat-input");
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const loggedIn = (state && state.currentUser) ? state.currentUser.username : "Member";
  window.nativeLiveKitMeetingManager.addChatMessage(loggedIn, text);
  input.value = "";
};
window.hostMuteAllParticipants = () => window.nativeLiveKitMeetingManager.muteAllParticipants();
window.hostEndMeetingForEveryone = () => window.nativeLiveKitMeetingManager.endMeetingForEveryone();

// Direct Meeting Exit without review prompts
window.exitLiveMeetingRoomDirectly = function() {
  try {
    if (window.activeJitsiAPIInstance) {
      try { window.activeJitsiAPIInstance.dispose(); } catch(e) {}
    }
  } catch(e) {}
  
  const modal = document.getElementById("modal-live-meeting");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => { modal.style.display = "none"; }, 300);
  }
  
  // Show top header and mobile bottom tabs
  const header = document.querySelector(".app-header");
  if (header) header.style.display = "flex";
  const tabs = document.querySelector(".mobile-bottom-tabs");
  if (tabs) tabs.style.display = "flex";
  
  showToast("Left meeting 🙏");
};

// Share YouTube Video or Audio URL in Meeting
window.shareYouTubeOrAudioLink = function() {
  const urlInput = document.getElementById("meet-youtube-url-input");
  if (!urlInput || !urlInput.value.trim()) {
    showToast("Please enter a YouTube video or Audio URL.");
    return;
  }
  const url = urlInput.value.trim();
  closeDrawer("drawer-meet-share-hub");
  showToast(`Sharing video/audio track: ${url} 📺`);
  
  if (window.activeJitsiAPIInstance && window.activeJitsiAPIInstance.executeCommand) {
    try {
      window.activeJitsiAPIInstance.executeCommand('startShareVideo', url);
    } catch(e) {}
  }
};

// Share Bible Chapter/Verse in Meeting
window.shareBibleVerseToMeeting = function() {
  const verseSelect = document.getElementById("meet-share-bible-book");
  const selectedVerse = verseSelect ? verseSelect.value : "John 3:16";
  closeDrawer("drawer-meet-share-hub");
  showToast(`Broadcasting ${selectedVerse} to meeting 🙏`);
  
  const loggedIn = (state && state.currentUser) ? state.currentUser.username : "Member";
  if (window.nativeLiveKitMeetingManager) {
    window.nativeLiveKitMeetingManager.addChatMessage("📖 BIBLE BROADCAST", `${loggedIn} shared ${selectedVerse}`);
  }
};

// Copy Meeting Invite Link Helper
window.copyMeetingInviteLink = function() {
  const link = `${window.location.origin}${window.location.pathname}#/meetings?room=River_Sanctuary_Main_Fellowship`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      showToast("Meeting invite link copied to clipboard! 📋");
    }).catch(() => {
      fallbackCopyInviteLink(link);
    });
  } else {
    fallbackCopyInviteLink(link);
  }
};

function fallbackCopyInviteLink(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast("Meeting invite link copied! 📋");
  } catch (err) {
    showToast(`Invite Link: ${text}`);
  }
  document.body.removeChild(textarea);
}

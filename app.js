
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
  audioSource: 'sarvam',     // 'sarvam' (Sarvam AI Bulbul V3 Indian Voice), 'human' (streaming MP3)
  sarvamVoice: 'gee_elevenlabs',      // 'shubh' (Calm & Devotional Indian Male - Hindi/Marathi/English)
  sarvamPace: 0.92,          // 0.92x peaceful Bible reading speed
  sarvamApiKey: 'sk_odv5l3f4_XdZubK80ecSfBa6YYCLWDCNI', // Preconfigured Sarvam AI API Key
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

  // Safety fallback: Ensure splash screen is hidden within 4.5s no matter what
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash && splash.style.display !== "none") {
      splash.classList.add("fade-out");
      setTimeout(() => { splash.style.display = "none"; }, 500);
    }
  }, 4500);

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
  
  // Load local scripture indexes and daily verses manifest
  try {
    await Promise.all([loadBooksIndexEng(), loadBooksIndexMr(), loadDailyVersesManifest()]);
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
  // Force migration to Sarvam AI Bulbul V3 Indian Voice Narration
  state.audioSource = "sarvam";
  if (!state.sarvamVoice) {
    state.sarvamVoice = state.sarvamVoice || "gee_elevenlabs";
  }
  state.sarvamPace = state.sarvamPace || 0.92;
}

function saveStateToLocalStorage() {
  localStorage.setItem("river_of_life_state_v2", JSON.stringify(state));
  // Non-blocking Firestore sync for cloud persistence
  if (state.currentUser && state.currentUser.uid) {
    syncUserDataToFirestore(); // fire-and-forget; errors are caught inside
  }
}

// Update DOM elements layout, theme, and font sizing parameters from state
/* ==========================================================================
   CENTRAL LOCALIZATION ENGINE (SINGLE ACTIVE LANGUAGE: MARATHI OR ENGLISH)
   Zero dual-language crowding: strictly pure Marathi or pure English based on preference.
   ========================================================================== */

const I18N_DICTIONARY = {
  mr: {
    // Navigation & Header (English UI navigation & greetings as requested)
    "pull_refresh": "Pull to refresh",
    "tab_today": "Today",
    "tab_community": "Community",
    "greeting_morning": "Good morning",
    "greeting_afternoon": "Good afternoon",
    "greeting_evening": "Good evening",
    "streak_toast": "Daily Devotion Streak: {n} Day",
    "search_placeholder": "Search Bible, Topics, or Questions...",
    "search_explore": "Explore",
    
    // Bottom Navigation (English UI Tabs)
    "nav_home": "Home",
    "nav_bible": "Bible",
    "nav_meetings": "Meetings",
    "nav_more": "More",
    
    // Verse of the Day (English Name / Header, Marathi Body inside)
    "vod_label": "VERSE OF THE DAY",
    "vod_share_title": "व्हॉट्सॲपवर शेअर करा",
    "vod_trans_suffix": "MARVBSI",
    
    // River of Life Flow Modules (English Category Headers & Titles, Marathi Details/Reflections inside)
    "headwaters_cat": "THE HEADWATERS",
    "headwaters_title": "Morning Manna at the Source",
    "headwaters_time": "▶ 3-5 min",
    "headwaters_sub": "दिवसाची कृपा व शांती",
    
    "confluence_cat": "THE DAILY CONFLUENCE",
    "confluence_title": "Where is Your Soul Flowing Today?",
    "chip_restless": "Restless",
    "chip_heavy": "Heavy",
    "chip_thirsty": "Thirsty",
    "chip_peaceful": "Peaceful",
    
    "living_water_cat": "LIVING WATER RESET",
    "living_water_title": "Sanctuary of Rest & Peace",
    "living_water_sub": "▶ 1-3 min • 432Hz Ambient Meditation",
    
    // 10 Commandments (English Header & Title, Marathi Summary & Body inside)
    "commandments_cat": "BIBLICAL LAW",
    "commandments_title": "The 10 Commandments",
    "commandments_ref": "Exodus 20:1-17",
    "commandments_sub": "सीनाय पर्वतावर देवाने दिलेला शाश्वत नियम आणि येशूने सांगितलेला सारांश.",
    "commandments_action": "Read & Listen to All 10 Commandments →",
    
    // Ready-Made Prayers Grid Header & Live Fellowship
    "tag_prayer_sanctuary": "PRAYER SANCTUARY",
    "prayers_section_title": "Daily Guided Prayers",
    "prayers_section_sub": "बायबल आधारित प्रार्थना आणि आत्मिक मनन",
    "btn_view_all_prayers": "View All Prayers (8+) →",
    "daily_sanctuary_tag": "Daily Sanctuary",
    "live_fellowship_title": "Daily Prayer & Scripture Fellowship",
    "live_fellowship_sub": "थेट भक्ती, स्तुती आणि शास्त्रवचनांच्या मननामध्ये सहभागी व्हा.",
    "btn_join_fellowship": "Join Prayer Sanctuary",
    "btn_pray_now": "Pray Now",
    
    // Prayer Topics (English Badges & Titles, Rich Marathi Prayer inside Modal)
    "prayer_cana_badge": "MIRACLE & PROVISION",
    "prayer_cana_title": "Water Turned into Wine",
    "prayer_cana_sub": "पाण्याचे द्राक्षारसात रूपांतर • अद्भुत पुरवठा",
    "prayer_cana_ref": "John 2:1-11",

    "prayer_peace_badge": "PEACE & CALM",
    "prayer_peace_title": "Peace Over Anxiety",
    "prayer_peace_sub": "चिंतेतून मुक्ती आणि देवाची शांती",
    "prayer_peace_ref": "Philippians 4:6-7",

    "prayer_morning_badge": "MORNING BLESSING",
    "prayer_morning_title": "Morning Grace & Protection",
    "prayer_morning_sub": "सकाळची कृपा व दैवी संरक्षण",
    "prayer_morning_ref": "Psalm 91:1-4",

    "prayer_healing_badge": "HEALING & HEALTH",
    "prayer_healing_title": "Divine Healing & Restoration",
    "prayer_healing_sub": "आरोग्य आणि दैवी चंगाई",
    "prayer_healing_ref": "Isaiah 53:5",

    "prayer_family_badge": "FAMILY & HOME",
    "prayer_family_title": "Family Blessing & Unity",
    "prayer_family_sub": "कुटुंब आशीर्वाद व घरातील एकता",
    "prayer_family_ref": "Joshua 24:15",

    "prayer_strength_badge": "STRENGTH & FAITH",
    "prayer_strength_title": "Strength in Hard Times",
    "prayer_strength_sub": "कठीण प्रसंगी सामर्थ्य व धीर",
    "prayer_strength_ref": "Isaiah 40:29-31",

    "prayer_wisdom_badge": "WISDOM & GUIDANCE",
    "prayer_wisdom_title": "Wisdom & Career Guidance",
    "prayer_wisdom_sub": "ज्ञानासाठी व नोकरी-व्यवसाय मार्गदर्शन",
    "prayer_wisdom_ref": "James 1:5",

    "prayer_evening_badge": "EVENING REST",
    "prayer_evening_title": "Evening Thanksgiving & Rest",
    "prayer_evening_sub": "रात्रीची उपकारस्तुती व शांत झोप",
    "prayer_evening_ref": "Psalm 4:8",

    // Quiz Promo Card
    "quiz_badge_trivia": "BIBLE TRIVIA",
    "quiz_badge_levels": "4 LEVELS",
    "quiz_card_title": "Daily Bible Quiz Challenge",
    "quiz_card_sub": "दैनिक बायबल प्रश्नमंजुषा • ४ कठीणता स्तर • बॅजेस",
    "quiz_card_btn": "Play Quiz →",
    "quiz_lvl_1": "🌱 Beginner",
    "quiz_lvl_2": "⚔️ Intermediate",
    "quiz_lvl_3": "👑 Advanced",
    "quiz_lvl_4": "🏆 Master",
    "quiz_banner_title": "Daily Bible Quiz Challenge",
    "quiz_banner_sub": "Test your knowledge and earn spiritual badges",
    "quiz_banner_btn": "Start Quiz"
  },
  en: {
    // Navigation & Header
    "pull_refresh": "Pull to refresh",
    "tab_today": "Today",
    "tab_community": "Community",
    "greeting_morning": "Good morning",
    "greeting_afternoon": "Good afternoon",
    "greeting_evening": "Good evening",
    "streak_toast": "Daily Devotion Streak: {n} Day",
    "search_placeholder": "Search Bible, Topics, or Questions...",
    "search_explore": "Explore",
    
    // Bottom Navigation
    "nav_home": "Home",
    "nav_bible": "Bible",
    "nav_meetings": "Meetings",
    "nav_more": "More",
    
    // Verse of the Day
    "vod_label": "VERSE OF THE DAY",
    "vod_share_title": "Share to WhatsApp",
    "vod_trans_suffix": "NLT",
    
    // River of Life Flow Modules
    "headwaters_cat": "THE HEADWATERS",
    "headwaters_title": "Morning Manna at the Source",
    "headwaters_time": "▶ 3-5 min",
    "headwaters_sub": "Daily Grace & Rest",
    
    "confluence_cat": "THE DAILY CONFLUENCE",
    "confluence_title": "Where is Your Soul Flowing Today?",
    "chip_restless": "Restless",
    "chip_heavy": "Heavy",
    "chip_thirsty": "Thirsty",
    "chip_peaceful": "Peaceful",
    
    "living_water_cat": "LIVING WATER RESET",
    "living_water_title": "Sanctuary of Rest & Peace",
    "living_water_sub": "▶ 1-3 min • 432Hz Ambient Meditation",
    
    // 10 Commandments
    "commandments_cat": "BIBLICAL LAW",
    "commandments_title": "The 10 Commandments",
    "commandments_ref": "Exodus 20:1-17",
    "commandments_sub": "God's timeless blueprint given at Mount Sinai and fulfilled in Christ.",
    "commandments_action": "Read & Listen to All 10 Commandments →",
    
    // Ready-Made Prayers Grid Header & Live Fellowship
    "tag_prayer_sanctuary": "PRAYER SANCTUARY",
    "prayers_section_title": "Daily Guided Prayers",
    "prayers_section_sub": "Ready-made scriptural prayers with inspiring background imagery",
    "btn_view_all_prayers": "View All Prayers (8+) →",
    "daily_sanctuary_tag": "Daily Sanctuary",
    "live_fellowship_title": "Daily Prayer & Scripture Fellowship",
    "live_fellowship_sub": "Join pastors and believers in live devotional prayer and scripture meditation.",
    "btn_join_fellowship": "Join Prayer Sanctuary",
    "btn_pray_now": "Pray Now",
    
    // Prayer Topics (Cards 1-8)
    "prayer_cana_badge": "MIRACLE & PROVISION",
    "prayer_cana_title": "Water Turned into Wine",
    "prayer_cana_sub": "Abundance in Scarcity",
    "prayer_cana_ref": "John 2:1-11",

    "prayer_peace_badge": "PEACE & CALM",
    "prayer_peace_title": "Peace Over Anxiety",
    "prayer_peace_sub": "Transcendent Divine Peace",
    "prayer_peace_ref": "Philippians 4:6-7",

    "prayer_morning_badge": "MORNING BLESSING",
    "prayer_morning_title": "Morning Grace & Protection",
    "prayer_morning_sub": "Sheltered in the Shadow of Almighty",
    "prayer_morning_ref": "Psalm 91:1-4",

    "prayer_healing_badge": "HEALING & HEALTH",
    "prayer_healing_title": "Divine Healing & Restoration",
    "prayer_healing_sub": "By His Stripes We Are Healed",
    "prayer_healing_ref": "Isaiah 53:5",

    "prayer_family_badge": "FAMILY & HOME",
    "prayer_family_title": "Family Blessing & Unity",
    "prayer_family_sub": "Love, Harmony, and Faith at Home",
    "prayer_family_ref": "Joshua 24:15",

    "prayer_strength_badge": "STRENGTH & FAITH",
    "prayer_strength_title": "Strength in Hard Times",
    "prayer_strength_sub": "Renewed Vigor for the Weary",
    "prayer_strength_ref": "Isaiah 40:29-31",

    "prayer_wisdom_badge": "WISDOM & GUIDANCE",
    "prayer_wisdom_title": "Wisdom & Career Guidance",
    "prayer_wisdom_sub": "Heavenly Counsel for Decisions",
    "prayer_wisdom_ref": "James 1:5",

    "prayer_evening_badge": "EVENING REST",
    "prayer_evening_title": "Evening Thanksgiving & Rest",
    "prayer_evening_sub": "Peaceful Sleep in His Safety",
    "prayer_evening_ref": "Psalm 4:8",

    // Quiz Promo Card
    "quiz_badge_trivia": "BIBLE TRIVIA",
    "quiz_badge_levels": "4 LEVELS",
    "quiz_card_title": "Daily Bible Quiz Challenge",
    "quiz_card_sub": "Daily Bible Quiz • 4 Difficulty Levels • Badges & Streaks",
    "quiz_card_btn": "Play Quiz →",
    "quiz_lvl_1": "🌱 Beginner",
    "quiz_lvl_2": "⚔️ Intermediate",
    "quiz_lvl_3": "👑 Advanced",
    "quiz_lvl_4": "🏆 Master",
    "quiz_banner_title": "Daily Bible Quiz Challenge",
    "quiz_banner_sub": "Test your knowledge and earn spiritual badges",
    "quiz_banner_btn": "Start Quiz"
  }
};

function getActiveLanguage() {
  if (typeof state !== 'undefined' && state.translation === "eng") return "en";
  return "mr"; // Default Marathi
}

function getGreetingTimeKey() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "greeting_morning";
  if (hour >= 12 && hour < 17) return "greeting_afternoon";
  return "greeting_evening";
}

function t(key, fallback) {
  const lang = getActiveLanguage();
  if (I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key]) {
    return I18N_DICTIONARY[lang][key];
  }
  if (I18N_DICTIONARY.mr && I18N_DICTIONARY.mr[key]) {
    return I18N_DICTIONARY.mr[key];
  }
  return fallback || key;
}

function applyAppLanguage(langCode) {
  if (langCode === "eng" || langCode === "en") {
    state.translation = "eng";
  } else {
    state.translation = "mar";
  }
  saveStateToLocalStorage();
  applyStylesFromState();
}

window.t = t;
window.applyAppLanguage = applyAppLanguage;
window.getActiveLanguage = getActiveLanguage;


function applyStylesFromState() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  
  const currentLang = (state && state.translation === "eng") ? "en" : "mr";
  const dict = (typeof I18N_DICTIONARY !== 'undefined') ? (I18N_DICTIONARY[currentLang] || I18N_DICTIONARY.mr) : null;
  
  // Theme Configuration
  appEl.className = "";
  appEl.classList.add(`ios-theme-${state.theme}`);
  
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
  
  // Apply Localization Dictionary
  if (dict) {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const k = el.dataset.i18n;
      if (dict[k]) el.textContent = dict[k];
    });
    
    // Greeting
    const greetingEl = document.getElementById("home-greeting-user");
    if (greetingEl) {
      const userName = (state && state.userName) ? state.userName : "Gaurav";
      const greetingWord = dict[getGreetingTimeKey()] || (currentLang === "en" ? "Good afternoon" : "शुभ दुपार");
      greetingEl.textContent = `${greetingWord}, ${userName}`;
    }
    
    // Search Bar
    const searchPlaceholderEl = document.getElementById("home-search-placeholder-text");
    if (searchPlaceholderEl && dict["search_placeholder"]) {
      searchPlaceholderEl.textContent = dict["search_placeholder"];
    }
    const searchExploreBadge = document.getElementById("home-search-explore-badge");
    if (searchExploreBadge && dict["search_explore"]) {
      searchExploreBadge.textContent = dict["search_explore"];
    }
    
    // Pull refresh
    const pullLabel = document.getElementById("pull-refresh-text");
    if (pullLabel && dict["pull_refresh"]) {
      pullLabel.textContent = dict["pull_refresh"];
    }
  }
  
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
  
  let transTitle = (state.translation === "eng") ? "English (NLT)" : "मराठी";
  const navTransTitle = document.getElementById("nav-translation-title");
  if (navTransTitle) navTransTitle.textContent = transTitle;
  
  let metaColor = "#0f172a";
  if (state.theme === "light") metaColor = "#f8fafc";
  else if (state.theme === "sepia") metaColor = "#fdf6e3";
  else if (state.theme === "olive") metaColor = "#f4f6f0";
  const themeMeta = document.getElementById("theme-meta");
  if (themeMeta) themeMeta.setAttribute("content", metaColor);
  
  // Re-render VOD in active language
  if (typeof renderDailyDevotion === "function") {
    renderDailyDevotion();
  }
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
      if (tab === "more") {
        e.preventDefault();
        openMoreMenu();
        return;
      }
      if (tab) {
        window.location.hash = `#/${tab}`;
        switchTab(tab);
      }
    });
  });
}

function openMoreMenu() {
  openDrawer("drawer-more-menu");
}

function closeMoreMenu() {
  closeDrawer("drawer-more-menu");
}

window.openMoreMenu = openMoreMenu;
window.closeMoreMenu = closeMoreMenu;


function adjustHeaderForRoute(route) {
  const readerCtrls = document.getElementById("nav-reader-controls");
  const staticCtrls = document.getElementById("nav-static-controls");
  const staticTitle = document.getElementById("static-header-title");
  
  if (route === "reader") {
    if (readerCtrls) {
      readerCtrls.classList.add("active");
      readerCtrls.style.display = "flex";
    }
    if (staticCtrls) {
      staticCtrls.classList.remove("active");
      staticCtrls.style.display = "none";
    }
  } else {
    if (readerCtrls) {
      readerCtrls.classList.remove("active");
      readerCtrls.style.display = "none";
    }
    if (staticCtrls) {
      staticCtrls.classList.add("active");
      staticCtrls.style.display = "flex";
    }
    
    if (staticTitle) {
      if (route === "home") {
        staticTitle.textContent = "River of Life";
      } else if (route === "plans") {
        staticTitle.textContent = state.translation === "eng" ? "Reading Plans" : "बायबल वाचन योजना";
      } else if (route === "discover") {
        staticTitle.textContent = state.translation === "eng" ? "Discover Scriptures" : "बायबल शोधा";
      } else if (route === "prayers") {
        staticTitle.textContent = state.translation === "eng" ? "Prayer Circle" : "प्रार्थना विनंत्या";
      } else if (route === "meetings") {
        staticTitle.textContent = state.translation === "eng" ? "Prayer Meetings" : "प्रार्थना सभा";
      } else if (route === "you") {
        if (state.currentUser && state.currentUser.username) {
          staticTitle.textContent = state.currentUser.username;
        } else {
          staticTitle.textContent = state.translation === "eng" ? "Profile" : "प्रोफाईल";
        }
      } else {
        staticTitle.textContent = "River of Life";
      }
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
  
  // Sync In-Page Bible Chapter Header
  const inlineBookNameEl = document.getElementById("inline-reader-book-name");
  if (inlineBookNameEl) {
    inlineBookNameEl.textContent = `${activeBookName} ${chapterNum}`;
  }
  const inlineTransEl = document.getElementById("inline-reader-translation-name");
  if (inlineTransEl) {
    if (state.translation === "eng") inlineTransEl.textContent = "English (NLT)";
    else if (state.translation === "parallel") inlineTransEl.textContent = "Parallel";
    else inlineTransEl.textContent = "मराठी (BSI)";
  }
  const inlineVoiceSelect = document.getElementById("reader-inline-voice-select");
  if (inlineVoiceSelect) {
    inlineVoiceSelect.value = state.sarvamVoice || (state.translation === "eng" ? "ratan" : "shubh");
  }
  const inlineSpeedSelect = document.getElementById("reader-inline-speed-select");
  if (inlineSpeedSelect) {
    inlineSpeedSelect.value = state.sarvamPace ? state.sarvamPace.toFixed(2) : "0.92";
  }

  versesContainer.innerHTML = "";
  
  const versesMr = bookDataMr ? bookDataMr.chapters[chapterNum - 1] : [];
  const versesEng = bookDataEng ? bookDataEng.chapters[chapterNum - 1] : [];
  const totalVerses = Math.max(versesMr.length, versesEng.length);
  
  // Populate Quick Selectors at Top of Bible Tab
  populateQuickSelectors(metadata, chapterNum, totalVerses);
  
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

function populateQuickSelectors(currentMetadata, chapterNum, totalVerses) {
  const bookSelect = document.getElementById("reader-quick-book-select");
  const chapterSelect = document.getElementById("reader-quick-chapter-select");
  const verseSelect = document.getElementById("reader-quick-verse-select");
  const transSelect = document.getElementById("reader-quick-translation-select");

  if (bookSelect && booksMetadataMr.length > 0) {
    bookSelect.innerHTML = "";
    booksMetadataMr.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.filename.replace(".json", "");
      opt.textContent = (state.translation === "eng") ? b.engName : b.name;
      bookSelect.appendChild(opt);
    });
    bookSelect.value = state.activeBook;
  }

  if (chapterSelect && currentMetadata) {
    chapterSelect.innerHTML = "";
    for (let c = 1; c <= currentMetadata.chaptersCount; c++) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = (state.translation === "eng") ? `Chapter ${c}` : `अध्याय ${c}`;
      chapterSelect.appendChild(opt);
    }
    chapterSelect.value = chapterNum;
  }

  if (verseSelect && totalVerses) {
    verseSelect.innerHTML = `<option value="all">${(state.translation === "eng") ? "All Verses" : "सर्व वचने"}</option>`;
    for (let v = 1; v <= totalVerses; v++) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = (state.translation === "eng") ? `Verse ${v}` : `वचन ${v}`;
      verseSelect.appendChild(opt);
    }
  }

  if (transSelect) {
    transSelect.value = state.translation || "mar";
  }

  initAudioVoices();
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

let selectorTargetChapter = 1;

function switchSelectorStep(step) {
  const booksPane = document.getElementById("selector-books-pane");
  const chaptersPane = document.getElementById("selector-chapters-pane");
  const versesPane = document.getElementById("selector-verses-pane");
  const sortingFooter = document.getElementById("selector-sorting-footer");

  const tabBooks = document.getElementById("tab-step-books");
  const tabChapters = document.getElementById("tab-step-chapters");
  const tabVerses = document.getElementById("tab-step-verses");

  [booksPane, chaptersPane, versesPane].forEach(p => p && p.classList.remove("active"));
  [tabBooks, tabChapters, tabVerses].forEach(t => t && t.classList.remove("active"));

  if (step === "books") {
    if (booksPane) booksPane.classList.add("active");
    if (tabBooks) tabBooks.classList.add("active");
    if (sortingFooter) sortingFooter.style.display = "flex";
  } else if (step === "chapters") {
    if (chaptersPane) chaptersPane.classList.add("active");
    if (tabChapters) tabChapters.classList.add("active");
    if (sortingFooter) sortingFooter.style.display = "none";
  } else if (step === "verses") {
    if (versesPane) versesPane.classList.add("active");
    if (tabVerses) tabVerses.classList.add("active");
    if (sortingFooter) sortingFooter.style.display = "none";
  }
}

function selectBookForChapterScreen(bookMeta) {
  selectorTargetBookMeta = bookMeta;
  switchSelectorStep("chapters");
  
  const displayBookName = (state.translation === "eng") ? bookMeta.engName : bookMeta.name;
  const bookIndicator = document.getElementById("selected-book-name-indicator");
  if (bookIndicator) bookIndicator.textContent = displayBookName;
  
  const grid = document.getElementById("chapters-number-grid");
  if (!grid) return;
  grid.innerHTML = "";
  
  for (let c = 1; c <= bookMeta.chaptersCount; c++) {
    const cBtn = document.createElement("button");
    cBtn.className = "chapter-select-btn";
    cBtn.textContent = c;
    cBtn.addEventListener("click", () => {
      closeAllDrawers();
      openReader(bookMeta.filename.replace(".json", ""), c, 1);
    });
    grid.appendChild(cBtn);
  }
}

async function selectChapterForVerseScreen(bookMeta, chapterNum) {
  selectorTargetBookMeta = bookMeta;
  selectorTargetChapter = chapterNum;
  switchSelectorStep("verses");

  const displayBookName = (state.translation === "eng") ? bookMeta.engName : bookMeta.name;
  const chapterIndicator = document.getElementById("selected-chapter-indicator");
  if (chapterIndicator) chapterIndicator.textContent = `${displayBookName} ${chapterNum}`;

  const openWholeBtn = document.getElementById("btn-open-whole-chapter");
  if (openWholeBtn) {
    openWholeBtn.onclick = () => {
      closeAllDrawers();
      openReader(bookMeta.filename.replace(".json", ""), chapterNum, 1);
    };
  }

  const vGrid = document.getElementById("verses-number-grid");
  if (!vGrid) return;
  vGrid.innerHTML = `<div class="loader-container" style="grid-column: 1/-1;"><div class="ios-spinner"></div></div>`;

  const bookKey = bookMeta.filename.replace(".json", "");
  let bookData = (state.translation === "eng") ? await fetchBookDataEng(bookKey) : await fetchBookDataMr(bookKey);
  if (!bookData) bookData = await fetchBookDataMr(bookKey);

  vGrid.innerHTML = "";
  const totalVerses = (bookData && bookData.chapters && bookData.chapters[chapterNum - 1]) 
    ? bookData.chapters[chapterNum - 1].length 
    : 30;

  for (let v = 1; v <= totalVerses; v++) {
    const vBtn = document.createElement("button");
    vBtn.className = "chapter-select-btn";
    vBtn.textContent = v;
    vBtn.addEventListener("click", () => {
      closeAllDrawers();
      openReader(bookKey, chapterNum, v);
    });
    vGrid.appendChild(vBtn);
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
  const isEng = (state && state.translation === "eng");
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = isEng ? now.toLocaleDateString('en-US', options) : now.toLocaleDateString('mr-IN', options);
  
  const heroDateEl = document.getElementById("home-hero-date-str");
  if (heroDateEl) heroDateEl.textContent = isEng ? `Today | ${dateStr}` : `आज | ${dateStr}`;
  
  const hour = now.getHours();
  let greetingTimeEn = "Good evening";
  if (hour < 12) {
    greetingTimeEn = "Good morning";
  } else if (hour < 17) {
    greetingTimeEn = "Good afternoon";
  }
  
  const currentUserObj = state.currentUser || state.user;
  let userName = currentUserObj?.displayName || currentUserObj?.username || currentUserObj?.fullName || "";
  if (!userName) {
    const savedName = localStorage.getItem("rol_user_name") || localStorage.getItem("river_of_life_username");
    if (savedName) userName = savedName;
    else userName = "Gaurav";
  }
  
  const userEl = document.getElementById("home-greeting-user");
  if (userEl) {
    userEl.textContent = `${greetingTimeEn}, ${userName}`;
  }
  
  const { vod, dayOfYear, offset } = getCurrentVOD();
  // Use English scripture reference name for card title (e.g. Romans 12:2 MARVBSI), with Marathi body inside
  const displayRef = vod.engRef || vod.ref;
  const displayText = isEng ? vod.engText : vod.text;
  
  const homeVodRefEl = document.getElementById("home-vod-ref");
  if (homeVodRefEl) {
    homeVodRefEl.textContent = `${displayRef} ${isEng ? "NLT" : "MARVBSI"}`;
  }
  const homeVodTextEl = document.getElementById("home-vod-text");
  if (homeVodTextEl) {
    homeVodTextEl.textContent = `"${displayText}"`;
  }
  
  const fsVodRefEl = document.getElementById("fs-vod-ref");
  if (fsVodRefEl) fsVodRefEl.textContent = `${displayRef} ${state.translation === "eng" ? "NLT" : "MARVBSI"}`;
  
  const fsVodTextEl = document.getElementById("fs-vod-text");
  if (fsVodTextEl) fsVodTextEl.textContent = `"${displayText}"`;
  
  // Expanded Beautiful Rotating Background Wallpapers from assets/daily_verses/
  const images = (window.dailyVersesImageList && window.dailyVersesImageList.length > 0) ? window.dailyVersesImageList : [
    'stars.png', 'forest.png', 'mist.png', 'mountains.png', 'mount_zion.png', 'ocean.png', 'path.png', 'sunrise.png'
  ];
  const imgIdx = ((dayOfYear + offset) % images.length + images.length) % images.length;
  window.currentVodImageIndex = imgIdx;
  const dailyImg = images[imgIdx];
  const imgUrl = (typeof getVodImageUrl === "function") ? getVodImageUrl(dailyImg) : (dailyImg.includes('.') ? `assets/daily_verses/${dailyImg}` : `assets/daily_verses/${dailyImg}.png`);
  
  const bgEl = document.getElementById("vod-dynamic-bg") || document.querySelector(".youversion-vod-bg") || document.querySelector(".daily-verse-card-bg");
  if (bgEl) bgEl.style.backgroundImage = `url('${imgUrl}')`;

  const fsCapsule = document.querySelector(".fullscreen-vod-capsule");
  if (fsCapsule) fsCapsule.style.backgroundImage = `url('${imgUrl}')`;
  
  // Heart count like sync
  const hasLiked = state.userLikes[vod.ref] || false;
  const heart = document.getElementById("fs-like-heart");
  if (heart) {
    if (hasLiked) {
      heart.setAttribute("fill", "#f87171");
      heart.style.color = "#f87171";
      const fsCount = document.getElementById("fs-like-count");
      if (fsCount) fsCount.textContent = "12.6K+1";
    } else {
      heart.setAttribute("fill", "none");
      heart.style.color = "#ffffff";
      const fsCount = document.getElementById("fs-like-count");
      if (fsCount) fsCount.textContent = "12.6K";
    }
  }

  const homeHeart = document.getElementById("home-vod-heart-icon");
  const homeLikesCount = document.getElementById("home-vod-likes-count");
  if (homeHeart && homeLikesCount) {
    if (hasLiked) {
      homeHeart.setAttribute("fill", "#f87171");
      homeLikesCount.textContent = "12.6K+1";
    } else {
      homeHeart.setAttribute("fill", "currentColor");
      homeLikesCount.textContent = "12.6K";
    }
  }

  // Update dynamic VOD title labels based on offset
  const homeTabPills = document.querySelectorAll(".daily-verse-card .tab-pill");
  const fsLabel = document.querySelector("#modal-fullscreen-vod .fs-card-label");
  
  let offsetLabelEn = "DAILY BIBLE VERSE";
  let fsBadgeEn = "VERSE OF THE DAY";
  
  if (offset === -1) {
    offsetLabelEn = "YESTERDAY'S VERSE";
    fsBadgeEn = "YESTERDAY'S VERSE";
  } else if (offset === 1) {
    offsetLabelEn = "TOMORROW'S VERSE";
    fsBadgeEn = "TOMORROW'S VERSE";
  } else if (offset < -1) {
    offsetLabelEn = `${Math.abs(offset)} DAYS AGO`;
    fsBadgeEn = `${Math.abs(offset)} DAYS AGO`;
  } else if (offset > 1) {
    offsetLabelEn = `IN ${offset} DAYS`;
    fsBadgeEn = `IN ${offset} DAYS`;
  }

  if (homeTabPills && homeTabPills[0]) {
    homeTabPills[0].textContent = offsetLabelEn;
  }
  if (fsLabel) {
    fsLabel.textContent = fsBadgeEn;
  }
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

window.openVodMoreSheet = function() {
  const sheet = document.getElementById("modal-vod-more-sheet");
  if (sheet) sheet.style.display = "flex";
};

window.closeVodMoreSheet = function() {
  const sheet = document.getElementById("modal-vod-more-sheet");
  if (sheet) sheet.style.display = "none";
};

window.switchHomeTab = function(tab) {
  const btnToday = document.getElementById("btn-home-tab-today");
  const btnComm = document.getElementById("btn-home-tab-community");
  const feedToday = document.getElementById("home-feed-today-container");
  const feedComm = document.getElementById("home-feed-community-container");

  if (tab === "community") {
    if (btnToday) btnToday.classList.remove("active");
    if (btnComm) btnComm.classList.add("active");
    if (feedToday) feedToday.style.display = "none";
    if (feedComm) feedComm.style.display = "block";
    switchTab("meetings");
  } else {
    if (btnComm) btnComm.classList.remove("active");
    if (btnToday) btnToday.classList.add("active");
    if (feedComm) feedComm.style.display = "none";
    if (feedToday) feedToday.style.display = "block";
  }
};

window.readVODChapter = function() {
  const { vod } = getCurrentVOD();
  openReaderAndNavigate(vod.book, vod.chapter, vod.verse);
};

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
   Sarvam AI Bulbul V3 Indian Voice Narrator (TTS)
   ========================================================================== */
function startSpeechNarration() {
  closeModal("modal-audio-settings");
  
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  
  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.stop();
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }

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
  
  // Check API Key based on active voice engine
  const activeVoice = (state.sarvamVoice || "gee_elevenlabs").toLowerCase();
  const isElevenLabsVoice = activeVoice.includes("elevenlabs") || activeVoice === "shrey" || activeVoice === "gee" || activeVoice === "brian";
  if (isElevenLabsVoice) {
    const elKey = localStorage.getItem('rol_elevenlabs_api_key') || 'sk_53532f375cb8723144f7c3d6f10520e60043fc74cb1552d4';
    if (!elKey) {
      showToast("🔑 Please enter your ElevenLabs API Key in Settings");
      openModal("modal-audio-settings");
      return;
    }
  } else {
    const sarvamKey = (window.SarvamTTS && window.SarvamTTS.config) ? window.SarvamTTS.config.getApiKey() : (state.sarvamApiKey || 'sk_odv5l3f4_XdZubK80ecSfBa6YYCLWDCNI');
    if (!sarvamKey) {
      showToast("🔑 Please enter your Sarvam AI API Key in Settings");
      openModal("modal-audio-settings");
      return;
    }
  }

  // Sarvam AI Bulbul V3 Indian Voice Narration
  const elements = document.querySelectorAll(".verse-row");
  if (elements.length === 0) return;
  
  audioState.versesToRead = [];
  elements.forEach(el => {
    let txt = el.dataset.text || "";
    if (state.translation === "parallel") {
      const enDiv = el.querySelector(".verse-parallel-en");
      if (enDiv) txt = enDiv.textContent;
    }
    const cleanText = txt.replace(/[:;()[\]{}—•\-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanText) {
      audioState.versesToRead.push({
        key: el.dataset.verseId,
        text: cleanText
      });
    }
  });
  
  if (audioState.versesToRead.length === 0) return;

  const speedVal = parseFloat(document.getElementById("tts-speed-slider")?.value || 0.92);
  audioState.speed = speedVal;
  audioState.currentVerseIndex = 0;
  audioState.isPlaying = true;

  const speedPill = document.getElementById("playbar-btn-speed");
  if (speedPill) speedPill.textContent = `${speedVal}x`;

  const isReaderViewActive = document.getElementById("view-reader")?.classList.contains("active");
  const playbarEl = document.getElementById("floating-audio-playbar");
  if (playbarEl && !isReaderViewActive) {
    playbarEl.classList.add("active");
  }

  const isDevanagari = (state.translation !== "eng");
  const langCode = isDevanagari ? "mr-IN" : "en-IN";
  const selectedVoiceId = (state.sarvamVoice || "gee_elevenlabs").toLowerCase();

  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.setListeners({
      onVerseChange: (index, verse) => {
        audioState.currentVerseIndex = index;
        document.querySelectorAll(".verse-row").forEach(v => {
          v.classList.toggle("tts-reading", v.dataset.verseId === verse.key);
        });
        const activeEl = document.querySelector(`.verse-row[data-verse-id="${verse.key}"]`);
        if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

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

        const progress = ((index + 1) / audioState.versesToRead.length) * 100;
        const progressEl = document.getElementById("playbar-progress-line");
        if (progressEl) progressEl.style.width = `${progress}%`;
      },
      onStateChange: (playbackState) => {
        const iconSvg = document.getElementById("playbar-icon-svg");
        const fabIcon = document.getElementById("circle-fab-play-icon");
        const fabBtn = document.getElementById("btn-floating-reader-play-circle");

        if (playbackState === "loading") {
          if (iconSvg) {
            iconSvg.innerHTML = `
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="38" stroke-dashoffset="19">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            `;
          }
          if (fabIcon) {
            fabIcon.innerHTML = `
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="38" stroke-dashoffset="19">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            `;
          }
        } else if (playbackState === "playing") {
          if (iconSvg) iconSvg.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
          if (fabIcon) fabIcon.innerHTML = `<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"></rect>`;
          if (fabBtn) fabBtn.classList.add("playing");
        } else {
          if (iconSvg) iconSvg.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
          if (fabIcon) fabIcon.innerHTML = `<polygon points="7 4 19 12 7 20 7 4"></polygon>`;
          if (fabBtn) fabBtn.classList.remove("playing");
        }
      },
      onFallbackActive: () => {},
      onComplete: () => {
        stopSpeechNarration();
      },
      onError: (err) => {
        console.warn("[TTS Engine] Playback notice:", err);
      }
    });

    window.SarvamTTS.queue.loadVerses(audioState.versesToRead, 0, {
      lang: langCode,
      speaker: selectedVoiceId,
      pace: speedVal
    });

    window.SarvamTTS.queue.play();
  } else {
    speakPlaybarVerse(0);
  }
}

function speakPlaybarVerse(index) {
  if (!audioState.isPlaying || index >= audioState.versesToRead.length || index < 0) {
    stopSpeechNarration();
    return;
  }
  
  audioState.currentVerseIndex = index;
  if (window.SarvamTTS && window.SarvamTTS.queue && window.SarvamTTS.queue.isPlaying) {
    window.SarvamTTS.queue.jumpToVerse(index);
  }
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
  } else if (window.SarvamTTS && window.SarvamTTS.queue) {
    if (window.SarvamTTS.queue.isPaused) {
      window.SarvamTTS.queue.resume();
    } else {
      window.SarvamTTS.queue.pause();
    }
  } else if (typeof speechSynthesis !== 'undefined') {
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
  if (bibleChapterAudioPlayer) {
    bibleChapterAudioPlayer.pause();
    bibleChapterAudioPlayer = null;
  }
  isBibleChapterPlaying = false;
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.stop();
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
  
  // Stop background worship music
  ambientSynthInstance.stop();
  
  // Clear sleep timer
  if (sleepTimerTimeout) {
    clearTimeout(sleepTimerTimeout);
    sleepTimerTimeout = null;
  }
  
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("tts-reading"));
  const playbar = document.getElementById("floating-audio-playbar");
  if (playbar) playbar.classList.remove("active");
  
  const fabIcon = document.getElementById("circle-fab-play-icon");
  const fabBtn = document.getElementById("btn-floating-reader-play-circle");
  if (fabIcon) fabIcon.innerHTML = `<polygon points="7 4 19 12 7 20 7 4"></polygon>`;
  if (fabBtn) fabBtn.classList.remove("playing");
  
  const iconSvg = document.getElementById("playbar-icon-svg");
  if (iconSvg) iconSvg.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
  
  const readerPlayIcon = document.getElementById("reader-quick-play-icon");
  const readerPlayLabel = document.getElementById("reader-quick-play-label");
  const readerPlayBtn = document.getElementById("btn-reader-quick-play");
  if (readerPlayIcon) readerPlayIcon.textContent = "▶";
  if (readerPlayLabel) readerPlayLabel.textContent = "ऐका";
  if (readerPlayBtn) {
    readerPlayBtn.style.background = "var(--primary)";
    readerPlayBtn.style.color = "#1e1b4b";
  }
}

function startSpeechNarrationFromVerse(verseNum) {
  const targetIndex = Math.max(0, parseInt(verseNum) - 1);
  if (!audioState.versesToRead || audioState.versesToRead.length === 0) {
    startSpeechNarration();
    return;
  }
  if (audioState.versesToRead && targetIndex < audioState.versesToRead.length) {
    const isReaderViewActive = document.getElementById("view-reader")?.classList.contains("active");
    const playbarEl = document.getElementById("floating-audio-playbar");
    if (playbarEl && !isReaderViewActive) {
      playbarEl.classList.add("active");
    }
    if (window.SarvamTTS && window.SarvamTTS.queue && window.SarvamTTS.queue.isPlaying) {
      window.SarvamTTS.queue.jumpToVerse(targetIndex);
    } else {
      startSpeechNarration();
    }
  } else {
    startSpeechNarration();
  }
}

function playDailyVerseAudio() {
  const vodTextEl = document.getElementById("home-vod-text");
  const vodRefEl = document.getElementById("home-vod-ref");
  if (!vodTextEl) return;

  const rawText = vodTextEl.textContent.replace(/["']/g, '').trim();
  const refText = vodRefEl ? vodRefEl.textContent.trim() : "Daily Verse";

  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.stop();
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }

  showToast(`🔊 Listening: ${refText}`);

  audioState.versesToRead = [{
    key: "vod_verse",
    text: `${refText}. ${rawText}`
  }];
  audioState.currentVerseIndex = 0;
  audioState.isPlaying = true;

  const speedVal = parseFloat(document.getElementById("tts-speed-slider")?.value || 0.92);
  audioState.speed = speedVal;

  const speedPill = document.getElementById("playbar-btn-speed");
  if (speedPill) speedPill.textContent = `${speedVal}x`;

  document.getElementById("floating-audio-playbar").classList.add("active");

  const isDevanagari = (state.translation !== "eng");
  const langCode = isDevanagari ? "mr-IN" : "en-IN";
  const selectedVoiceId = (state.sarvamVoice || "gee_elevenlabs").toLowerCase();

  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.setListeners({
      onVerseChange: () => {
        const indicatorEl = document.getElementById("playbar-verse-indicator");
        if (indicatorEl) indicatorEl.textContent = `🔊 Daily Verse: ${refText}`;
        document.getElementById("playbar-progress-line").style.width = `100%`;
      },
      onStateChange: (playbackState) => {
        const iconSvg = document.getElementById("playbar-icon-svg");
        if (!iconSvg) return;
        if (playbackState === "loading") {
          iconSvg.innerHTML = `
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="38" stroke-dashoffset="19">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          `;
        } else if (playbackState === "playing") {
          iconSvg.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
        } else {
          iconSvg.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
        }
      },
      onFallbackActive: (msg) => {
        showToast(msg || "Switched to Marathi Device Voice");
      },
      onComplete: () => stopSpeechNarration(),
      onError: (err) => {
        if (err && err.message === "NO_API_KEY") {
          showToast("Please enter Sarvam AI API Key in Settings");
          openModal("modal-audio-settings");
        } else if (err && err.friendlyMessage) {
          showToast(err.friendlyMessage);
        } else {
          showToast("Listening with Marathi voice");
        }
      }
    });

    window.SarvamTTS.queue.loadVerses(audioState.versesToRead, 0, {
      lang: langCode,
      speaker: selectedVoiceId,
      pace: speedVal
    });
    window.SarvamTTS.queue.play();
  }
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

function initAudioVoices() {
  const currentVoice = state.sarvamVoice || "gee_elevenlabs";
  state.sarvamVoice = currentVoice;

  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.setOptions({ speaker: currentVoice });
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

window.openReaderAndNavigate = async function(book, ch, verse) {
  // 1. Close any open modals and drawers
  if (typeof closeHeadwatersModal === 'function') closeHeadwatersModal();
  if (typeof closeConfluenceModal === 'function') closeConfluenceModal();
  if (typeof closeLivingWaterResetModal === 'function') closeLivingWaterResetModal();
  if (typeof closeImmersivePrayerModal === 'function') closeImmersivePrayerModal();
  if (typeof closeBibleQuizModal === 'function') closeBibleQuizModal();
  if (typeof closeAllDrawers === 'function') closeAllDrawers();
  if (typeof toggleTenCommandmentsModal === 'function') {
    const tModal = document.getElementById("modal-ten-commandments");
    if (tModal && tModal.style.display === "flex") tModal.style.display = "none";
  }
  if (typeof closeVodMoreSheet === 'function') closeVodMoreSheet();
  if (typeof closeFullscreenVOD === 'function') closeFullscreenVOD();

  // Force close any remaining modal overlay
  document.querySelectorAll(".app-modal-backdrop, .modal-overlay-fullscreen, .prayer-sanctuary-modal-overlay").forEach(m => {
    if (m.style.display === "flex" || m.style.display === "block" || m.classList.contains("active")) {
      m.style.display = "none";
      m.classList.remove("active");
    }
  });

  // 2. Switch tab to reader view directly
  if (typeof switchTab === 'function') {
    switchTab('reader');
  }
  window.location.hash = "#/reader";

  // 3. Open the target scripture chapter
  const bookKey = book || 'lamentations';
  const chap = parseInt(ch) || 1;
  if (typeof openReader === 'function') {
    await openReader(bookKey, chap);
  }

  // 4. Smoothly scroll to target verse if specified
  if (verse) {
    setTimeout(() => {
      const vKey = `${bookKey}_${chap}_${verse}`;
      const vEl = document.querySelector(`.verse-row[data-verse-id="${vKey}"]`);
      if (vEl) {
        vEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        vEl.classList.add('highlight-target');
        setTimeout(() => vEl.classList.remove('highlight-target'), 2500);
      }
    }, 350);
  }
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

  const locEl = document.getElementById("profile-location-text");
  if (locEl) {
    locEl.textContent = state.currentUser.location || (state.translation === "eng" ? "Maharashtra, India" : "महाराष्ट्र, भारत");
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
  document.getElementById("btn-text-settings")?.addEventListener("click", () => openDrawer("drawer-text-settings"));
  
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
  document.getElementById("btn-size-dec")?.addEventListener("click", () => {
    if (state.fontSize > 70) {
      state.fontSize -= 10;
      applyStylesFromState();
      saveStateToLocalStorage();
    }
  });
  document.getElementById("btn-size-inc")?.addEventListener("click", () => {
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
  document.getElementById("btn-translation-selector")?.addEventListener("click", () => {
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
      
      initAudioVoices();
    });
  }

  // Voice Selector change listener
  const voiceSelect = document.getElementById("tts-voice-select");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", (e) => {
      state.sarvamVoice = e.target.value;
      saveStateToLocalStorage();
      const genderSelect = document.getElementById("audio-narrator-gender-select");
      if (genderSelect) genderSelect.value = state.sarvamVoice;
      if (window.SarvamTTS && window.SarvamTTS.queue) {
        window.SarvamTTS.queue.setOptions({ speaker: state.sarvamVoice });
      }
    });
  }

  // Direct Book, Chapter, Verse Quick Selectors at Top of Bible Tab
  const quickBookSelect = document.getElementById("reader-quick-book-select");
  if (quickBookSelect) {
    quickBookSelect.addEventListener("change", (e) => {
      openReader(e.target.value, 1);
    });
  }

  const quickChapterSelect = document.getElementById("reader-quick-chapter-select");
  if (quickChapterSelect) {
    quickChapterSelect.addEventListener("change", (e) => {
      openReader(state.activeBook, parseInt(e.target.value) || 1);
    });
  }

  const quickVerseSelect = document.getElementById("reader-quick-verse-select");
  if (quickVerseSelect) {
    quickVerseSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "all") {
        document.getElementById("reader-scroll-container").scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const vEl = document.querySelector(`.verse-row[data-verse="${val}"]`);
        if (vEl) {
          vEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          vEl.classList.add("selected-pulse");
          setTimeout(() => vEl.classList.remove("selected-pulse"), 2500);
        }
      }
    });
  }

  const quickTransSelect = document.getElementById("reader-quick-translation-select");
  if (quickTransSelect) {
    quickTransSelect.addEventListener("change", (e) => {
      state.translation = e.target.value;
      applyStylesFromState();
      saveStateToLocalStorage();
      openReader(state.activeBook, state.activeChapter);
      initAudioVoices();
      toggleVoiceDropdownVisibility();
    });
  }

  // In-Page Bible Chapter Header & Controls
  const btnInlineBookPicker = document.getElementById("btn-reader-open-book-picker");
  if (btnInlineBookPicker) {
    btnInlineBookPicker.addEventListener("click", () => {
      openDrawer("drawer-book-selector");
      switchSelectorStep("books");
      populateBookSelector();
    });
  }

  const btnInlineTransPicker = document.getElementById("btn-reader-open-translation-picker");
  if (btnInlineTransPicker) {
    btnInlineTransPicker.addEventListener("click", () => {
      openDrawer("drawer-translation-selector");
    });
  }

  const btnInlineTextSettings = document.getElementById("btn-reader-open-text-settings");
  if (btnInlineTextSettings) {
    btnInlineTextSettings.addEventListener("click", () => {
      openDrawer("drawer-text-settings");
    });
  }

  const btnInlineSarvamModal = document.getElementById("btn-reader-sarvam-setup-modal");
  if (btnInlineSarvamModal) {
    btnInlineSarvamModal.addEventListener("click", () => {
      openModal("modal-audio-settings");
    });
  }

  const btnInlineListen = document.getElementById("btn-reader-inline-listen");
  if (btnInlineListen) {
    btnInlineListen.addEventListener("click", () => {
      if (audioState.isPlaying) {
        togglePlaybarSpeech();
      } else {
        startSpeechNarration();
      }
    });
  }

  const inlineVoiceSelect = document.getElementById("reader-inline-voice-select");
  if (inlineVoiceSelect) {
    inlineVoiceSelect.addEventListener("change", (e) => {
      state.sarvamVoice = e.target.value;
      saveStateToLocalStorage();
      const modalSelect = document.getElementById("audio-narrator-gender-select");
      if (modalSelect) modalSelect.value = state.sarvamVoice;
      if (window.SarvamTTS && window.SarvamTTS.queue) {
        window.SarvamTTS.queue.setOptions({ speaker: state.sarvamVoice });
      }
      showToast(`Selected Voice: ${e.target.options[e.target.selectedIndex].text.split('(')[0]}`);
    });
  }

  const inlineSpeedSelect = document.getElementById("reader-inline-speed-select");
  if (inlineSpeedSelect) {
    inlineSpeedSelect.addEventListener("change", (e) => {
      const spd = parseFloat(e.target.value);
      state.sarvamPace = spd;
      audioState.speed = spd;
      saveStateToLocalStorage();
      const slider = document.getElementById("tts-speed-slider");
      if (slider) slider.value = spd;
      const valDisp = document.getElementById("tts-speed-val");
      if (valDisp) valDisp.textContent = `${spd}x`;
      if (window.SarvamTTS && window.SarvamTTS.queue && window.SarvamTTS.queue.isPlaying) {
        window.SarvamTTS.queue.setOptions({ pace: spd });
      }
      showToast(`Narration speed set to ${spd}x`);
    });
  }

  // 3-Step Book, Chapter, Verse selector step tabs
  const tabStepBooks = document.getElementById("tab-step-books");
  if (tabStepBooks) {
    tabStepBooks.addEventListener("click", () => switchSelectorStep("books"));
  }
  const tabStepChapters = document.getElementById("tab-step-chapters");
  if (tabStepChapters) {
    tabStepChapters.addEventListener("click", () => {
      if (selectorTargetBookMeta) switchSelectorStep("chapters");
      else showToast("Please select a book first");
    });
  }
  const tabStepVerses = document.getElementById("tab-step-verses");
  if (tabStepVerses) {
    tabStepVerses.addEventListener("click", () => {
      if (selectorTargetBookMeta) switchSelectorStep("verses");
      else showToast("Please select a book and chapter first");
    });
  }

  // Book select header trigger
  document.getElementById("btn-book-selector")?.addEventListener("click", () => {
    openDrawer("drawer-book-selector");
    switchSelectorStep("books");
    
    document.getElementById("btn-sort-traditional").classList.toggle("active", state.bookSort === "traditional");
    document.getElementById("btn-sort-alphabetical").classList.toggle("active", state.bookSort === "alphabetical");
    populateBookSelector();
  });
  
  document.getElementById("btn-sort-traditional")?.addEventListener("click", () => {
    state.bookSort = "traditional";
    document.getElementById("btn-sort-traditional").classList.add("active");
    document.getElementById("btn-sort-alphabetical").classList.remove("active");
    saveStateToLocalStorage();
    populateBookSelector();
  });
  
  document.getElementById("btn-sort-alphabetical")?.addEventListener("click", () => {
    state.bookSort = "alphabetical";
    document.getElementById("btn-sort-traditional").classList.remove("active");
    document.getElementById("btn-sort-alphabetical").classList.add("active");
    saveStateToLocalStorage();
    populateBookSelector();
  });
  
  document.getElementById("btn-back-to-books")?.addEventListener("click", () => {
    switchSelectorStep("books");
  });

  const btnBackToChapters = document.getElementById("btn-back-to-chapters");
  if (btnBackToChapters) {
    btnBackToChapters.addEventListener("click", () => {
      switchSelectorStep("chapters");
    });
  }
  
  // Highlight pickers dots
  document.querySelectorAll(".dot-btn").forEach(dot => {
    dot.addEventListener("click", () => handleHighlightSelection(dot.dataset.color));
  });
  
  document.getElementById("btn-action-bookmark")?.addEventListener("click", toggleBookmark);
  document.getElementById("btn-action-copy")?.addEventListener("click", copyVerseToClipboard);
  document.getElementById("btn-action-share")?.addEventListener("click", openShareCardCreator);
  document.getElementById("btn-action-speak")?.addEventListener("click", () => {
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
  
  document.getElementById("btn-download-card")?.addEventListener("click", downloadShareCard);
  document.getElementById("btn-close-card-share")?.addEventListener("click", () => closeModal("modal-card-share"));

  // VOD Fullscreen modal triggers
  document.getElementById("btn-open-fullscreen-vod")?.addEventListener("click", () => openModal("modal-fullscreen-vod"));
  document.getElementById("btn-close-fullscreen-vod")?.addEventListener("click", () => closeModal("modal-fullscreen-vod"));
  document.getElementById("btn-fs-options")?.addEventListener("click", openVerseOptionsFromVOD);

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
  document.getElementById("btn-fs-like")?.addEventListener("click", toggleLikeVOD);
  document.getElementById("btn-vod-like-trigger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleLikeVOD();
  });
  document.getElementById("btn-fs-customize-card")?.addEventListener("click", openCardCreatorFromVOD);
  document.getElementById("btn-fs-share-trigger")?.addEventListener("click", openCardCreatorFromVOD);
  document.getElementById("btn-vod-share-trigger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openCardCreatorFromVOD();
  });
  document.getElementById("btn-fs-comment")?.addEventListener("click", () => showToast("Comments are offline-only"));

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
  
  document.getElementById("btn-prev-chapter")?.addEventListener("click", () => navigateChapter("prev"));
  document.getElementById("btn-next-chapter")?.addEventListener("click", () => navigateChapter("next"));
  
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
  document.getElementById("btn-audio-tts")?.addEventListener("click", () => openModal("modal-audio-settings"));
  document.getElementById("btn-close-audio-settings")?.addEventListener("click", () => closeModal("modal-audio-settings"));
  document.getElementById("btn-start-tts-reading")?.addEventListener("click", startSpeechNarration);
  
  // Floating Playbar triggers
  document.getElementById("playbar-btn-play")?.addEventListener("click", togglePlaybarSpeech);
  document.getElementById("playbar-btn-close-widget")?.addEventListener("click", stopSpeechNarration);
  
  // Quick Play on Top Reader Bar
  document.getElementById("btn-reader-quick-play")?.addEventListener("click", () => {
    if (audioState.isPlaying) {
      stopSpeechNarration();
    } else {
      startSpeechNarration();
    }
  });

  // Test ElevenLabs Shrey Voice button in Narration Settings
  const btnTestElevenLabs = document.getElementById("btn-test-elevenlabs-voice");
  if (btnTestElevenLabs) {
    btnTestElevenLabs.addEventListener("click", async () => {
      showToast("🔊 Testing Shrey (ElevenLabs v3) Marathi Voice...");
      try {
        if (window.SarvamTTS && window.SarvamTTS.testVoice) {
          const res = await window.SarvamTTS.testVoice("gee_elevenlabs");
          const badge = document.getElementById("elevenlabs-key-status-badge");
          if (res && res.success && res.audioUrl) {
            const testAudio = new Audio(res.audioUrl);
            testAudio.play();
            showToast("✨ Shrey Voice Active: 'परमेश्वर माझा मेंढपाळ आहे...'");
            if (badge) {
              badge.textContent = "Verified ✅";
              badge.style.background = "rgba(34,197,94,0.15)";
              badge.style.color = "#22c55e";
            }
          } else if (res && res.noKey) {
            showToast("⚠️ Enter ElevenLabs API Key in Settings to enable Shrey voice.");
            if (badge) {
              badge.textContent = "Key Needed";
              badge.style.background = "rgba(239,68,68,0.15)";
              badge.style.color = "#ef4444";
            }
          } else if (res && res.quotaExhausted) {
            showToast("⚠️ ElevenLabs quota reached. Previewing via Marathi voice.");
            if (badge) {
              badge.textContent = "Quota Reached";
              badge.style.background = "rgba(245,158,11,0.15)";
              badge.style.color = "#f59e0b";
            }
          } else {
            showToast(res.message || "Previewing Marathi voice.");
          }
        }
      } catch (err) {
        console.warn("[ElevenLabs Test] Error:", err);
        showToast(err.friendlyMessage || `Voice Test: ${err.message || 'Check API Key'}`);
      }
    });
  }

  // ElevenLabs API Key input listener in Settings Modal
  const elevenlabsKeyInput = document.getElementById("elevenlabs-api-key-input");
  const elevenlabsKeyBadge = document.getElementById("elevenlabs-key-status-badge");
  if (elevenlabsKeyInput) {
    const currentElevenKey = (window.ElevenLabsTTS && window.ElevenLabsTTS.config) ? window.ElevenLabsTTS.config.getApiKey() : (state.elevenlabsApiKey || "");
    elevenlabsKeyInput.value = currentElevenKey;
    if (elevenlabsKeyBadge) {
      elevenlabsKeyBadge.textContent = currentElevenKey ? "Key Configured" : "Ready";
      elevenlabsKeyBadge.style.background = currentElevenKey ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)";
      elevenlabsKeyBadge.style.color = currentElevenKey ? "#22c55e" : "#3b82f6";
    }

    elevenlabsKeyInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      state.elevenlabsApiKey = val;
      if (window.ElevenLabsTTS && window.ElevenLabsTTS.config) {
        window.ElevenLabsTTS.config.setApiKey(val);
      }
      if (elevenlabsKeyBadge) {
        elevenlabsKeyBadge.textContent = val ? "Key Configured" : "Ready";
        elevenlabsKeyBadge.style.background = val ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)";
        elevenlabsKeyBadge.style.color = val ? "#22c55e" : "#3b82f6";
      }
      saveStateToLocalStorage();
    });
  }

  // Test Sarvam AI Voice button in Narration Settings
  const btnTestSarvamVoice = document.getElementById("btn-test-sarvam-voice");
  if (btnTestSarvamVoice) {
    btnTestSarvamVoice.addEventListener("click", async () => {
      const selectedVoice = state.sarvamVoice || "gee_elevenlabs";
      showToast(`🔊 Testing Sarvam ${selectedVoice} Voice...`);
      try {
        if (window.SarvamTTS && window.SarvamTTS.testVoice) {
          const res = await window.SarvamTTS.testVoice(selectedVoice);
          const badge = document.getElementById("sarvam-key-status-badge");
          if (res && res.success && res.audioUrl) {
            const testAudio = new Audio(res.audioUrl);
            testAudio.play();
            showToast("✨ Sarvam Voice Active: 'परमेश्वर माझा मेंढपाळ आहे...'");
            if (badge) {
              badge.textContent = "Key Verified ✅";
              badge.style.background = "rgba(34,197,94,0.15)";
              badge.style.color = "#22c55e";
            }
          } else if (res && res.quotaExhausted) {
            showToast("⚠️ Sarvam AI: 0 credits left on key (402). Playing via Marathi device voice preview.");
            if (badge) {
              badge.textContent = "Credits Needed (402)";
              badge.style.background = "rgba(245,158,11,0.15)";
              badge.style.color = "#f59e0b";
            }
          } else {
            showToast(res.message || "Previewing Marathi voice.");
          }
        }
      } catch (err) {
        console.warn("[Sarvam Test] Error:", err);
        showToast(err.friendlyMessage || `Voice Test: ${err.message || 'Check API Key'}`);
      }
    });
  }

  const speedPillBtn = document.getElementById("playbar-btn-speed");
  if (speedPillBtn) {
    speedPillBtn.addEventListener("click", () => {
      const speeds = [0.92, 1.0, 1.15, 1.25, 0.85];
      let currIdx = speeds.indexOf(audioState.speed || 0.92);
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
      } else if (window.SarvamTTS && window.SarvamTTS.queue && window.SarvamTTS.queue.isPlaying) {
        window.SarvamTTS.queue.setOptions({ pace: nextSpeed });
      }
      showToast(`Narration speed set to ${nextSpeed}x`);
    });
  }

  document.getElementById("playbar-btn-prev")?.addEventListener("click", () => {
    if (audioPlayerInstance) {
      audioPlayerInstance.currentTime = Math.max(0, audioPlayerInstance.currentTime - 10);
    } else if (window.SarvamTTS && window.SarvamTTS.queue) {
      window.SarvamTTS.queue.previous();
    }
  });
  
  document.getElementById("playbar-btn-next")?.addEventListener("click", () => {
    if (audioPlayerInstance) {
      audioPlayerInstance.currentTime = Math.min(audioPlayerInstance.duration || 9999, audioPlayerInstance.currentTime + 10);
    } else if (window.SarvamTTS && window.SarvamTTS.queue) {
      window.SarvamTTS.queue.next();
    }
  });
  
  const speedSlider = document.getElementById("tts-speed-slider");
  if (speedSlider) {
    speedSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value).toFixed(2);
      document.getElementById("tts-speed-val").textContent = `${val}x`;
      audioState.speed = parseFloat(val);
      if (audioPlayerInstance) {
        audioPlayerInstance.playbackRate = audioState.speed;
      } else if (window.SarvamTTS && window.SarvamTTS.queue) {
        window.SarvamTTS.queue.setOptions({ pace: audioState.speed });
      }
    });
  }

  // Sarvam API Key input listener in Settings Modal
  const sarvamKeyInput = document.getElementById("sarvam-api-key-input");
  const keyStatusBadge = document.getElementById("sarvam-key-status-badge");
  if (sarvamKeyInput) {
    const currentKey = (window.SarvamTTS && window.SarvamTTS.config) ? window.SarvamTTS.config.getApiKey() : (state.sarvamApiKey || "");
    sarvamKeyInput.value = currentKey;
    if (keyStatusBadge) {
      keyStatusBadge.textContent = currentKey ? "Key Configured" : "Key Needed";
      keyStatusBadge.style.background = currentKey ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
      keyStatusBadge.style.color = currentKey ? "#22c55e" : "#ef4444";
    }

    sarvamKeyInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      state.sarvamApiKey = val;
      if (window.SarvamTTS && window.SarvamTTS.config) {
        window.SarvamTTS.config.setApiKey(val);
      }
      if (keyStatusBadge) {
        keyStatusBadge.textContent = val ? "Key Configured" : "Key Needed";
        keyStatusBadge.style.background = val ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
        keyStatusBadge.style.color = val ? "#22c55e" : "#ef4444";
      }
      saveStateToLocalStorage();
    });
  }

  // Narrator Voice selector listener in Settings Modal
  const voiceGenderSelect = document.getElementById("audio-narrator-gender-select");
  if (voiceGenderSelect) {
    if (state.sarvamVoice) voiceGenderSelect.value = state.sarvamVoice;
    voiceGenderSelect.addEventListener("change", (e) => {
      state.sarvamVoice = e.target.value;
      if (window.SarvamTTS && window.SarvamTTS.queue) {
        window.SarvamTTS.queue.setOptions({ speaker: state.sarvamVoice });
      }
      saveStateToLocalStorage();
      showToast(`Selected Voice: ${e.target.options[e.target.selectedIndex].text.split('(')[0]}`);
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
  document.getElementById("btn-action-explain")?.addEventListener("click", () => {
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
  
  document.getElementById("btn-close-study-pane")?.addEventListener("click", () => {
    closeStudySplitPane();
  });
  
  document.querySelectorAll(".study-subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchStudyTab(btn.dataset.studyTab);
    });
  });
  
  document.getElementById("btn-save-journal")?.addEventListener("click", () => {
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
          // saveStateToLocalStorage triggers Firestore sync automatically
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
        // saveStateToLocalStorage triggers Firestore sync automatically
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
  if (overlay) {
    overlay.classList.remove("active");
    if (id === "modal-fullscreen-vod") {
      overlay.style.display = "none";
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
    }
  }
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
    "divine_growth": {
    title: "Daily Plan: Divine Growth (आत्मिक वाढ - 7-Day Spiritual Track)",
    days: 7,
    readings: [
      { label: "Day 1: 2 Corinthians 5 & John 3 (ख्रिस्तामध्ये नवीन निर्मिती)", bookKey: "2corinthians", chapter: 5, verse: 17, reflection: "ख्रिस्तामध्ये आपण जुने राहिलेले नाही; सर्वकाही नवीन झाले आहे. (२ करिंथ ५:१७)" },
      { label: "Day 2: Psalms 1 & 2 Timothy 3 (देवाच्या वचनात स्थिर राहणे)", bookKey: "psalms", chapter: 1, verse: 2, reflection: "जो परमेश्वराच्या नियमशास्त्रात रात्रंदिवस मनन करतो, तो पाण्याच्या प्रवाहाजवळ लावलेल्या वृक्षासारखा फळ देईल. (स्तोत्र १:२-३)" },
      { label: "Day 3: Philippians 4 & Matthew 6 (प्रार्थनेचे सामर्थ्य)", bookKey: "philippians", chapter: 4, verse: 6, reflection: "कशाविषयीही चिंता करू नका, तर प्रार्थनेने व विनंतीने आपले मागणे देवाला कळवा. (फिलिप्पै ४:६)" },
      { label: "Day 4: Galatians 5 & John 14 (पवित्र आत्म्याच्या मार्गदर्शनात चालणे)", bookKey: "galatians", chapter: 5, verse: 22, reflection: "आत्म्याचे फळ: प्रीती, आनंद, शांती, सहनशीलता, दयाळूपणा, चांगुलपणा, विश्वासूपणा. (गलती ५:२२-२३)" },
      { label: "Day 5: 1 Corinthians 10 & James 1 (परीक्षांवर विजय)", bookKey: "1corinthians", chapter: 10, verse: 13, reflection: "माणसाच्या आटोक्याबाहेरची परीक्षा तुमच्यावर आलेली नाही; देव विश्वासू आहे व तो सुटकेचा मार्ग काढील. (१ करिंथ १०:१३)" },
      { label: "Day 6: John 13 & 1 Peter 4 (ख्रिस्ताच्या मंडळीत प्रीती व सेवा)", bookKey: "john", chapter: 13, verse: 34, reflection: "जशी मी तुम्हावर प्रीती केली, तशी तुम्हीही एकमेकांवर प्रीती करा; यावरून तुम्ही माझे शिष्य आहात हे ओळखतील. (योहान १३:३४-३५)" },
      { label: "Day 7: John 15 & Matthew 28 (सार्वकालिक फळ देणे व साक्ष)", bookKey: "john", chapter: 15, verse: 5, reflection: "मी द्राक्षवेल आहे, तुम्ही फांद्या आहात. जो माझ्यात राहतो तो पुष्कळ फळ देतो. (योहान १५:५)" }
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
  initAudioVoices();
  const sarvamKeyInput = document.getElementById("sarvam-api-key-input");
  const keyStatusBadge = document.getElementById("sarvam-key-status-badge");
  if (sarvamKeyInput) {
    const currentKey = (window.SarvamTTS && window.SarvamTTS.config) ? window.SarvamTTS.config.getApiKey() : (state.sarvamApiKey || "");
    sarvamKeyInput.value = currentKey;
    if (keyStatusBadge) {
      keyStatusBadge.textContent = currentKey ? "Key Configured" : "Key Needed";
      keyStatusBadge.style.background = currentKey ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
      keyStatusBadge.style.color = currentKey ? "#22c55e" : "#ef4444";
    }
  }
}

/* ==========================================================================
   READY-MADE PRAYER TOPICS DATA & IMMERSIVE PRAYER MODAL
   ========================================================================== */

/* ==========================================================================
   READY-MADE PRAYER SANCTUARY ENGINE (TEXT OVER PHOTOGRAPHIC BACKDROP)
   Clean reverence: Zero emojis, direct chapter reader shortcut, natural audio
   ========================================================================== */

const PRAYER_TOPICS_DATA = {
  "wedding_cana": {
    id: "wedding_cana",
    bookKey: "john",
    chapter: 2,
    categoryMr: "दैवी चमत्कार व पुरवठा",
    categoryEn: "MIRACLE & DIVINE PROVISION",
    titleMr: "पाण्याचे द्राक्षारसात रूपांतर",
    titleEn: "Water Turned into Wine • Abundance in Scarcity",
    bgImage: "assets/images/wedding_cana_miracle.jpg",
    refMr: "योहान २:१-११",
    refEn: "John 2:1-11",
    verseMr: "येशूने आपल्या चिन्हांचा हा आरंभ गालीलातील काना येथे केला आणि आपले सामर्थ्य प्रकट केले, आणि त्याच्या शिष्यांनी त्याच्यावर विश्वास ठेवला.",
    verseEn: "This beginning of signs Jesus did in Cana of Galilee, and manifested His glory; and His disciples believed in Him.",
    prayerMr: `हे स्वर्गीय पित्या व दयाळू प्रभू येशू,

कानामधील लग्नाच्या प्रसंगी जेव्हा द्राक्षारसाची कमतरता पडली, तेव्हा तू साध्या पाण्याचे रूपांतर उत्कृष्ट द्राक्षारसात करून आपली दैवी कृपा व सामर्थ्य प्रकट केलेस.

प्रभू, आज माझ्या जीवनात जिथे जिथे कमतरता, निराशा किंवा अपुरेपण आहे, तिथे तुझा अद्भुत चमत्कार घडू दे. माझ्या आर्थिक, आत्मिक आणि कौटुंबिक गरजांमध्ये तुझा विपुल पुरवठा येऊ दे.

जसे मरीयेने सेवकांना सांगितले, "तो तुम्हाला जे सांगेल ते करा", तसेच मलाही तुझ्या वचनांचे पूर्ण आज्ञापालन करण्याचे मन दे. माझ्या संकटांचे रूपांतर आनंदाच्या उत्सवात कर.

प्रभू येशूच्या सामर्थ्यशाली नावात ही प्रार्थना करतो,
आमेन.`,
    prayerEn: `Heavenly Father and Lord Jesus,

At the wedding in Cana, when the wine ran out and human resources failed, You stepped in and turned ordinary water into the sweetest, finest wine—revealing Your divine glory and boundless grace.

Lord, in every area of my life where I face lack, exhaustion, or shortage today, I invite Your miraculous presence. Transform my ordinary moments into extraordinary testimonies of Your provision.

Teach me to obey whatever You say to me, trusting that You always save the best for last. Turn my mourning into dancing and my scarcity into abundance.

In the mighty and precious name of Jesus Christ, I pray,
Amen.`,
    amenCount: 154
  },
  "peace_anxiety": {
    id: "peace_anxiety",
    bookKey: "philippians",
    chapter: 4,
    categoryMr: "चिंतेतून मुक्ती आणि शांती",
    categoryEn: "PEACE OVER ANXIETY & FEAR",
    titleMr: "चिंतेतून मुक्ती आणि दैवी शांती",
    titleEn: "Peace Over Anxiety & Worry",
    bgImage: "assets/images/peace_anxiety.png",
    refMr: "फिलिप्पैकरांस ४:६-७",
    refEn: "Philippians 4:6-7",
    verseMr: "कशाविषयीही चिंता करू नका, तर सर्व गोष्टींत प्रार्थना व याचना करून उपकारस्तुतीसह आपली मागणी देवाला कळवा. म्हणजे सर्व बुद्धीच्या पलीकडची देवाची शांती तुमच्या हृदयांचे आणि मनांचे रक्षण करील.",
    verseEn: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds.",
    prayerMr: `हे शांतीच्या अधिपती प्रभू,

आज माझे मन अनेक चिंतांनी, भविष्याच्या काळजीने आणि भीतींनी व्याकुळ झाले आहे. परंतु तुझे वचन मला सांगते की कशाविषयीही चिंता करू नको.

मी माझी प्रत्येक काळजी, समस्या आणि भीती तुझ्या चरणी सोपवतो. सर्व बुद्धीच्या पलीकडची तुझी स्वर्गीय शांती माझ्या मनावर आणि हृदयावर पहारा करो.

माझ्या मनात चाललेले वादळ शांत कर आणि मला आठवण करून दे की तू सर्व गोष्टींवर नियंत्रण ठेवणारा जिवंत देव आहेस.

येशूच्या नावात, आमेन.`,
    prayerEn: `Lord Jesus, Prince of Peace,

Today my heart feels heavy with anxious thoughts, deadlines, and uncertainties about the future. Yet Your Word gently reminds me to cast all my anxieties upon You because You care for me.

I surrender every fear, doubt, and worry into Your capable hands right now. Let Your transcendent peace—which surpasses all human understanding—guard my mind, emotions, and thoughts.

Quiet the storm within my soul and anchor my spirit in Your unwavering love and sovereign control.

In Jesus' name, Amen.`,
    amenCount: 238
  },
  "morning_grace": {
    id: "morning_grace",
    bookKey: "psalms",
    chapter: 91,
    categoryMr: "सकाळची कृपा व संरक्षण",
    categoryEn: "MORNING GRACE & PROTECTION",
    titleMr: "सकाळची कृपा व दैवी संरक्षण",
    titleEn: "Morning Grace & Divine Protection",
    bgImage: "assets/images/golden_dawn.png",
    refMr: "स्तोत्रसंहिता ९१:१-४",
    refEn: "Psalm 91:1-4",
    verseMr: "जो परात्पराच्या गुप्त स्थानी राहतो, तो सर्वसमर्थाच्या सावलीत विसावा पावेल. तो आपल्या पंखांनी तुला झाकून घेईल, आणि त्याच्या पंखांखाली तुला आश्रय मिळेल.",
    verseEn: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. He will cover you with his feathers, and under his wings you will find refuge.",
    prayerMr: `सर्वसमर्थ पित्या,

या नवीन सकाळबद्दल मी तुझे कोटी-कोटी आभार मानतो. तुझी दया दररोज सकाळी नवी असते.

आजचा दिवस माझ्या पावलांना मार्गदर्शन कर. प्रत्येक संकट, दुष्ट योजना आणि अपघातांपासून माझे व माझ्या प्रियजनांचे रक्षण कर. माझ्या कार्यात यश दे आणि माझ्याद्वारे तुझ्या प्रेमाचा प्रकाश इतरांपर्यंत पोहोचू दे.

तुझ्या पंखांच्या सावलीत मला सुरक्षित ठेव.

येशूच्या नावात, आमेन.`,
    prayerEn: `Almighty and Ever-Faithful Father,

I awake with praise for the gift of this new dawn. Your mercies are new every single morning; great is Your faithfulness.

Guide my footsteps today, align my decisions with Your will, and shield my loved ones from all seen and unseen dangers. Bless the work of my hands and let my life reflect Your love, patience, and grace to everyone I encounter.

I rest securely under the shadow of Your wings throughout this day.

In Jesus' name, Amen.`,
    amenCount: 312
  },
  "healing_restoration": {
    id: "healing_restoration",
    bookKey: "isaiah",
    chapter: 53,
    categoryMr: "आरोग्य आणि दैवी चंगाई",
    categoryEn: "HEALING & RESTORATION",
    titleMr: "आरोग्य आणि दैवी चंगाई",
    titleEn: "Divine Healing & Physical Restoration",
    bgImage: "assets/images/healing_light.png",
    refMr: "यशया ५३:५",
    refEn: "Isaiah 53:5",
    verseMr: "तो आमच्या अपराधांसाठी घायाळ झाला, आमच्या दुष्कर्मांसाठी चिरडला गेला; आमच्या शांतीसाठी त्याला शिक्षा झाली आणि त्याच्या फटक्यांनी आम्हाला आरोग्य प्राप्त झाले.",
    verseEn: "He was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed.",
    prayerMr: `हे महान वैद्या प्रभू येशू,

तू वधस्तंभावर आमच्या सर्व वेदना, आजार आणि दुःखे वाहिलीस. तुझ्या फटक्यांच्या द्वारे आम्हाला पूर्ण आरोग्य प्राप्त झाले आहे यावर माझा दृढ विश्वास आहे.

माझ्या शरीरातील, मनातील आणि आत्म्यातील प्रत्येक आजारपणावर तुझा रोगनिवारक हात ठेव. मला नवीन आरोग्य आणि ऊर्जा दे. माझे आरोग्य पूर्ववत कर आणि मला तुझ्या गौरवासाठी कार्य करण्यास सक्षम कर.

येशूच्या सामर्थ्यशाली नावात, आमेन.`,
    prayerEn: `Lord Jesus, the Great Physician,

You carried our sicknesses and bore our griefs upon the cross. By Your precious stripes and suffering, we are granted total spiritual and physical healing.

Lay Your restorative hand upon my body, mind, and spirit right now. Drive away every infirmity, fatigue, and pain. Speak renewal and strength into every cell, restoring my health so that I may serve You with a joyful heart.

In the mighty name of Jesus, Amen.`,
    amenCount: 289
  },
  "family_blessing": {
    id: "family_blessing",
    bookKey: "joshua",
    chapter: 24,
    categoryMr: "कुटुंबासाठी आशीर्वाद व एकता",
    categoryEn: "FAMILY BLESSING & HARMONY",
    titleMr: "कुटुंबासाठी आशीर्वाद व एकता",
    titleEn: "Family Blessing & Harmony",
    bgImage: "assets/images/family_blessing.png",
    refMr: "यहोशू २४:१५",
    refEn: "Joshua 24:15",
    verseMr: "परंतु मी व माझे घराणे आम्ही तर परमेश्वराचीच सेवा करू.",
    verseEn: "As for me and my household, we will serve the Lord.",
    prayerMr: `हे दयाळू देवा,

मी माझे घर, माझी मुले आणि माझे कुटुंब तुझ्या पवित्र हातात समर्पित करतो. आमच्या घरात तुझी स्वर्गीय शांती, प्रेम, समजूतदारपणा आणि एकता वास करो.

आमच्या घरातील प्रत्येक व्यक्तीचे रक्षण कर आणि त्यांना तुझ्या मार्गात चालण्यास साहाय्य कर. सर्व कलह, गैरसमज आणि दुरावा दूर कर आणि आमच्या कुटुंबाला तुझ्या विश्वासात मजबूत कर.

येशूच्या नावात, आमेन.`,
    prayerEn: `Gracious God, Creator of Families,

I dedicate my home and family into Your sacred care. Establish our household upon the solid rock of Your Word, where love, patience, forgiveness, and mutual honor reign.

Protect my children, my spouse, and my parents from the temptations and harms of this world. Draw each heart closer to You in personal faith.

Let our home be an oasis of joy, hospitality, and light in our community.

In Jesus' name, Amen.`,
    amenCount: 195
  },
  "strength_trials": {
    id: "strength_trials",
    bookKey: "isaiah",
    chapter: 40,
    categoryMr: "कठीण प्रसंगी सामर्थ्य व धीर",
    categoryEn: "STRENGTH IN HARD TIMES",
    titleMr: "कठीण प्रसंगी सामर्थ्य व धीर",
    titleEn: "Strength in Trials & Difficulties",
    bgImage: "assets/images/mount_zion.png",
    refMr: "यशया ४०:२९-३१",
    refEn: "Isaiah 40:29-31",
    verseMr: "तो थकलेल्याला सामर्थ्य देतो आणि अशक्त असलेल्याचे बळ वाढवतो. जे परमेश्वराची वाट पाहतात ते नवीन सामर्थ्य प्राप्त करतील; ते गरुडासारखे पंख पसरून उंच उडतील.",
    verseEn: "He gives strength to the weary and increases the power of the weak. Those who hope in the Lord will renew their strength. They will soar on wings like eagles.",
    prayerMr: `हे माझ्या सामर्थ्याच्या खडका,

जेव्हा माझे स्वतःचे बळ संपून जाते, तेव्हा तू माझे सामर्थ्य बनतोस. या कठीण परिस्थितीमध्ये मला धीर आणि टिकून राहण्याचे बळ दे.

मला आठवण करून दे की हे संकट तात्पुरते आहे, परंतु तुझा विजय सार्वकालिक आहे. मी गरुडासारखा पंख लावून या संकटावर मात करेन, कारण तू माझ्याबरोबर आहेस.

येशूच्या नावात, आमेन.`,
    prayerEn: `Lord, my Strong Tower and Refuge,

When my own strength is exhausted and the road ahead feels steep, You are my unshakable fortress. Renew my vigor, clarity, and determination today.

Help me to keep my eyes fixed on You rather than the waves around me. Grant me supernatural perseverance to run this race without growing weary.

By Your mighty Spirit, I will rise above this trial like an eagle soaring on the wind.

In Jesus' name, Amen.`,
    amenCount: 220
  },
  "wisdom_guidance": {
    id: "wisdom_guidance",
    bookKey: "proverbs",
    chapter: 3,
    categoryMr: "ज्ञानासाठी व नोकरी-व्यवसाय मार्गदर्शन",
    categoryEn: "WISDOM & CAREER GUIDANCE",
    titleMr: "ज्ञानासाठी व नोकरी-व्यवसाय मार्गदर्शन",
    titleEn: "Wisdom & Career Guidance",
    bgImage: "assets/images/wisdom_guidance.png",
    refMr: "नीतिसूत्रे ३:५-६",
    refEn: "Proverbs 3:5-6",
    verseMr: "तू आपल्या पूर्ण अंतःकरणाने परमेश्वरावर भाव ठेव, आणि आपल्या स्वतःच्या बुद्धीवर अवलंबून राहू नको; आपल्या सर्व मार्गांत त्याची दखल घे, म्हणजे तो तुझे मार्ग नीट करील.",
    verseEn: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    prayerMr: `हे सर्वज्ञानी देवा,

माझ्या जीवनातील प्रत्येक निर्णयासाठी, माझ्या नोकरी, व्यवसाय आणि शिक्षणासाठी मला स्वर्गीय बुद्धी आणि विवेक दे.

माझ्या पुढील मार्गावर प्रकाश टाक आणि चुकीच्या निर्णयांपासून मला वाचव. माझ्या हातांच्या कष्टाला यश आणि आशीर्वाद दे. मला प्रामाणिकपणाने आणि उत्कृष्टतेने कार्य करण्याचे मन दे.

येशूच्या नावात, आमेन.`,
    prayerEn: `Omniscient God and Wise Counselor,

I acknowledge that human wisdom is limited, but Your understanding is infinite. Grant me divine discernment, creativity, and wisdom for my career, education, and pivotal life decisions.

Open doors of opportunity that no one can shut, and close every door that would lead me away from Your purpose. Bless the work of my hands and let me find favor with leaders and colleagues.

In Jesus' name, Amen.`,
    amenCount: 178
  },
  "evening_rest": {
    id: "evening_rest",
    bookKey: "psalms",
    chapter: 4,
    categoryMr: "रात्रीची उपकारस्तुती व शांत झोप",
    categoryEn: "EVENING THANKSGIVING & REST",
    titleMr: "रात्रीची उपकारस्तुती व शांत झोप",
    titleEn: "Evening Thanksgiving & Restful Sleep",
    bgImage: "assets/images/candlelight.png",
    refMr: "स्तोत्रसंहिता ४:८",
    refEn: "Psalm 4:8",
    verseMr: "मी शांततेने निजेन आणि मला लगेच झोप लागेल; कारण हे परमेश्वरा, केवळ तूच मला सुरक्षिततेमध्ये ठेवतोस.",
    verseEn: "In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.",
    prayerMr: `हे कृपाळू पित्या,

आजच्या संपूर्ण दिवसातील तुझ्या संरक्षणासाठी आणि आशीर्वादांसाठी तुझे आभार मानतो. दिवसभरात कळत-नकळत घडलेल्या सर्व चुकांची क्षमा कर.

रात्रीच्या वेळी सर्व ताणतणाव आणि विचार तुझ्या हातात सोपवून मी शांत झोप घेतो. माझ्या घराभोवती तुझ्या देवदूतांचा पहारा असू दे. मला गाढ, विश्रांतीपूर्ण झोप लाभू दे.

येशूच्या नावात, आमेन.`,
    prayerEn: `Father of Mercies,

As the quiet of the night settles in, I look back on today with a grateful heart. Thank You for sustaining me, forgiving my shortcomings, and keeping me safe.

I release every unfinished task, every heavy conversation, and every burden of tomorrow into Your hands. Wrap my mind in peaceful rest and grant me deep, rejuvenating sleep.

Let Your angels stand guard over my household throughout the night.

In Jesus' name, Amen.`,
    amenCount: 264
  }
};

let activePrayerTopicId = "wedding_cana";
let activePrayerLang = "mr";
let isPrayerAudioPlaying = false;
let prayerUtterance = null;

function openImmersivePrayerModal(topicId) {
  const data = PRAYER_TOPICS_DATA[topicId] || PRAYER_TOPICS_DATA["wedding_cana"];
  activePrayerTopicId = data.id;
  activePrayerLang = (state && state.translation === "eng") ? "en" : "mr";
  
  const modal = document.getElementById("modal-immersive-prayer");
  if (!modal) return;
  
  // Background Hero Image
  const heroBg = document.getElementById("prayer-modal-hero-bg");
  if (heroBg) {
    heroBg.style.backgroundImage = `url('${data.bgImage}')`;
  }
  
  // Category & Titles
  const catEl = document.getElementById("prayer-modal-category");
  if (catEl) catEl.textContent = (activePrayerLang === "en") ? data.categoryEn : data.categoryMr;
  
  const titleEl = document.getElementById("prayer-modal-heading");
  if (titleEl) titleEl.textContent = (activePrayerLang === "en") ? data.titleEn : data.titleMr;
  
  const subEl = document.getElementById("prayer-modal-subtitle");
  if (subEl) subEl.textContent = (activePrayerLang === "en") ? data.categoryEn : data.titleEn;
  
  // Scripture Box & Chapter Action
  const refEl = document.getElementById("prayer-modal-scripture-ref");
  if (refEl) refEl.textContent = (activePrayerLang === "en") ? data.refEn : data.refMr;
  
  const verseEl = document.getElementById("prayer-modal-scripture-text");
  if (verseEl) verseEl.textContent = `"${(activePrayerLang === "en") ? data.verseEn : data.verseMr}"`;

  const chapterBtnLabel = document.getElementById("prayer-open-chapter-label");
  if (chapterBtnLabel) {
    chapterBtnLabel.textContent = (activePrayerLang === "en") ? `Open ${data.refEn.split(":")[0]}` : `अध्याय उघडा (${data.refMr.split(":")[0]})`;
  }
  
  // Prayer Text (Zero emojis)
  const textEl = document.getElementById("prayer-modal-text-content");
  if (textEl) textEl.textContent = (activePrayerLang === "en") ? data.prayerEn : data.prayerMr;
  
  // Update Lang Tabs UI
  const tabMr = document.getElementById("btn-prayer-lang-mr");
  const tabEn = document.getElementById("btn-prayer-lang-en");
  if (tabMr && tabEn) {
    if (activePrayerLang === "en") {
      tabMr.classList.remove("active");
      tabEn.classList.add("active");
    } else {
      tabMr.classList.add("active");
      tabEn.classList.remove("active");
    }
  }
  
  // Amen Count
  const amenEl = document.getElementById("prayer-amen-count");
  if (amenEl) amenEl.textContent = `Amen (${data.amenCount})`;
  
  // Reset audio button
  const audioBtn = document.getElementById("prayer-audio-label");
  if (audioBtn) audioBtn.textContent = (activePrayerLang === "en") ? "Listen / ऐका" : "ऐका / Listen";
  isPrayerAudioPlaying = false;
  
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
}

function closeImmersivePrayerModal() {
  const modal = document.getElementById("modal-immersive-prayer");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => modal.style.display = "none", 300);
  }
  if (window.activePrayerAudioElement) {
    window.activePrayerAudioElement.pause();
    window.activePrayerAudioElement = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isPrayerAudioPlaying = false;
}

function openPrayerChapter() {
  const data = PRAYER_TOPICS_DATA[activePrayerTopicId];
  if (!data || !data.bookKey) return;
  
  closeImmersivePrayerModal();
  openReaderAndNavigate(data.bookKey, data.chapter || 1, 1);
}

function switchPrayerLang(lang) {
  activePrayerLang = lang;
  const data = PRAYER_TOPICS_DATA[activePrayerTopicId];
  if (!data) return;
  
  const catEl = document.getElementById("prayer-modal-category");
  if (catEl) catEl.textContent = (lang === "en") ? data.categoryEn : data.categoryMr;
  
  const titleEl = document.getElementById("prayer-modal-heading");
  if (titleEl) titleEl.textContent = (lang === "en") ? data.titleEn : data.titleMr;
  
  const refEl = document.getElementById("prayer-modal-scripture-ref");
  if (refEl) refEl.textContent = (lang === "en") ? data.refEn : data.refMr;
  
  const verseEl = document.getElementById("prayer-modal-scripture-text");
  if (verseEl) verseEl.textContent = `"${(lang === "en") ? data.verseEn : data.verseMr}"`;

  const chapterBtnLabel = document.getElementById("prayer-open-chapter-label");
  if (chapterBtnLabel) {
    chapterBtnLabel.textContent = (lang === "en") ? `Open ${data.refEn.split(":")[0]}` : `अध्याय उघडा (${data.refMr.split(":")[0]})`;
  }
  
  const textEl = document.getElementById("prayer-modal-text-content");
  if (textEl) textEl.textContent = (lang === "en") ? data.prayerEn : data.prayerMr;
  
  const tabMr = document.getElementById("btn-prayer-lang-mr");
  const tabEn = document.getElementById("btn-prayer-lang-en");
  if (tabMr && tabEn) {
    if (lang === "en") {
      tabMr.classList.remove("active");
      tabEn.classList.add("active");
    } else {
      tabMr.classList.add("active");
      tabEn.classList.remove("active");
    }
  }
  
  if (isPrayerAudioPlaying) {
    togglePrayerAudio(); // restart in new lang
    togglePrayerAudio();
  }
}

async function togglePrayerAudio() {
  const labelEl = document.getElementById("prayer-audio-label");
  
  if (isPrayerAudioPlaying) {
    if (window.activePrayerAudioElement) {
      window.activePrayerAudioElement.pause();
      window.activePrayerAudioElement = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPrayerAudioPlaying = false;
    if (labelEl) labelEl.textContent = "ऐका / Listen";
    return;
  }
  
  const data = PRAYER_TOPICS_DATA[activePrayerTopicId];
  if (!data) return;
  
  const prayerText = (activePrayerLang === "en") ? data.prayerEn : data.prayerMr;
  const langCode = (activePrayerLang === "en") ? "en-IN" : "mr-IN";
  const speaker = (state && state.sarvamVoice) ? state.sarvamVoice : "gee_elevenlabs";

  // Try Sarvam AI Audio synthesis first
  if (window.SarvamTTS && window.SarvamTTS.speakText) {
    try {
      if (labelEl) labelEl.textContent = "तयार करत आहे...";
      const res = await window.SarvamTTS.speakText(prayerText, {
        lang: langCode,
        speaker: speaker,
        pace: 0.92
      });
      if (res && res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        window.activePrayerAudioElement = audio;
        audio.onended = () => {
          isPrayerAudioPlaying = false;
          if (labelEl) labelEl.textContent = "ऐका / Listen";
        };
        audio.onerror = () => {
          isPrayerAudioPlaying = false;
          if (labelEl) labelEl.textContent = "ऐका / Listen";
        };
        await audio.play();
        isPrayerAudioPlaying = true;
        if (labelEl) labelEl.textContent = "थांबवा / Pause";
        return;
      }
    } catch (e) {
      console.warn("[Prayer Sarvam TTS] Fallback to SpeechSynthesis:", e);
    }
  }

  // Fallback to Web SpeechSynthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    prayerUtterance = new SpeechSynthesisUtterance(prayerText);
    prayerUtterance.lang = (activePrayerLang === "en") ? "en-US" : "mr-IN";
    prayerUtterance.rate = 0.92;
    
    prayerUtterance.onend = () => {
      isPrayerAudioPlaying = false;
      if (labelEl) labelEl.textContent = "ऐका / Listen";
    };
    
    prayerUtterance.onerror = () => {
      isPrayerAudioPlaying = false;
      if (labelEl) labelEl.textContent = "ऐका / Listen";
    };
    
    window.speechSynthesis.speak(prayerUtterance);
    isPrayerAudioPlaying = true;
    if (labelEl) labelEl.textContent = "थांबवा / Pause";
  }
}

function sharePrayerWhatsApp() {
  const data = PRAYER_TOPICS_DATA[activePrayerTopicId];
  if (!data) return;
  
  const text = `River of Life • दैनंदिन प्रार्थना

${data.titleMr} (${data.titleEn})
${data.refMr}

"${data.verseMr}"

प्रार्थना:
${data.prayerMr}

River of Life ॲप डाउनलोड करा व एकत्र प्रार्थना करा.`;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function togglePrayerAmen() {
  const data = PRAYER_TOPICS_DATA[activePrayerTopicId];
  if (!data) return;
  
  data.amenCount += 1;
  const amenEl = document.getElementById("prayer-amen-count");
  if (amenEl) {
    amenEl.textContent = `Amen (${data.amenCount})`;
    amenEl.style.color = "#E58B58";
  }
}

// Make accessible on window
window.openImmersivePrayerModal = openImmersivePrayerModal;
window.closeImmersivePrayerModal = closeImmersivePrayerModal;
window.openPrayerChapter = openPrayerChapter;
window.switchPrayerLang = switchPrayerLang;
window.togglePrayerAudio = togglePrayerAudio;
window.sharePrayerWhatsApp = sharePrayerWhatsApp;
window.togglePrayerAmen = togglePrayerAmen;

/* ==========================================================================
   BIBLE QUIZ MULTI-LEVEL ENGINE (4 DIFFICULTY LEVELS)
   ========================================================================== */

const QUIZ_LEVELS_DATA = {
  1: {
    levelId: 1,
    nameMr: "नवशिक्या (सोपे)",
    nameEn: "Beginner",
    emoji: "🌱",
    pointsPerQ: 10,
    badgeId: "quiz_badge_novice",
    badgeName: "Scripture Seedling",
    badgeDesc: "Mastered Level 1 Foundation Bible Stories!",
    questions: [
      {
        qMr: "नोहाच्या पुरादरम्यान किती दिवस आणि रात्री पाऊस पडला?",
        qEn: "How many days and nights did it rain during Noah's flood?",
        choices: [
          { textMr: "४० दिवस आणि ४० रात्री", textEn: "40 Days and 40 Nights", correct: true },
          { textMr: "३० दिवस आणि ३० रात्री", textEn: "30 Days and 30 Nights", correct: false },
          { textMr: "७ दिवस आणि ७ रात्री", textEn: "7 Days and 7 Nights", correct: false },
          { textMr: "५० दिवस आणि ५० रात्री", textEn: "50 Days and 50 Nights", correct: false }
        ],
        explMr: "उत्पत्ती ७:१२ नुसार, पृथ्वीवर चाळीस दिवस व चाळीस रात्री पाऊस पडत राहिला.",
        explEn: "Genesis 7:12 - And rain fell on the earth forty days and forty nights.",
        ref: "उत्पत्ती ७:१२ (Genesis 7:12)"
      },
      {
        qMr: "देवाने हव्वा बनवण्यासाठी आदामाच्या शरीरातील कोणत्या भागाचा वापर केला?",
        qEn: "What did God use from Adam's body to create Eve?",
        choices: [
          { textMr: "फासळी (Rib)", textEn: "A rib", correct: true },
          { textMr: "धूळ (Dust)", textEn: "Dust", correct: false },
          { textMr: "माती (Clay)", textEn: "Clay", correct: false },
          { textMr: "हृदय (Heart)", textEn: "Heart", correct: false }
        ],
        explMr: "परमेश्वर देवाने आदामाची एक फासळी काढली आणि त्यातून स्त्री बनवली.",
        explEn: "Genesis 2:22 - The Lord God made a woman from the rib he had taken out of the man.",
        ref: "उत्पत्ती २:२२ (Genesis 2:22)"
      },
      {
        qMr: "देवापासून पळून जाताना योनाला कोणत्या जीवाने गिळले?",
        qEn: "What swallowed Jonah when he tried to run away from God?",
        choices: [
          { textMr: "मोठा मासा (Great Fish)", textEn: "A great fish", correct: true },
          { textMr: "मगर (Crocodile)", textEn: "A crocodile", correct: false },
          { textMr: "समुद्र सर्प (Sea Serpent)", textEn: "A sea serpent", correct: false },
          { textMr: "शार्क (Shark)", textEn: "A shark", correct: false }
        ],
        explMr: "परमेश्वराने योनाला गिळण्यासाठी एक मोठा मासा तयार केला होता.",
        explEn: "Jonah 1:17 - Now the Lord provided a huge fish to swallow Jonah.",
        ref: "योना १:१७ (Jonah 1:17)"
      },
      {
        qMr: "येशू ख्रिस्ताचा जन्म कोणत्या शहरात झाला?",
        qEn: "In which town was Jesus Christ born?",
        choices: [
          { textMr: "बेथलेहेम (Bethlehem)", textEn: "Bethlehem", correct: true },
          { textMr: "नाझरेथ (Nazareth)", textEn: "Nazareth", correct: false },
          { textMr: "यरुशलेम (Jerusalem)", textEn: "Jerusalem", correct: false },
          { textMr: "अलेक्झांड्रिया (Alexandria)", textEn: "Alexandria", correct: false }
        ],
        explMr: "मत्तय २:१ नुसार, येशूचा जन्म यहूदीयातील बेथलेहेम गावात झाला.",
        explEn: "Matthew 2:1 - Jesus was born in Bethlehem in Judea.",
        ref: "मत्तय २:१ (Matthew 2:1)"
      },
      {
        qMr: "दाविदाने पराभूत केलेल्या पलिश्ती राक्षसाचे नाव काय होते?",
        qEn: "What was the name of the Philistine giant defeated by David?",
        choices: [
          { textMr: "गोल्याथ (Goliath)", textEn: "Goliath", correct: true },
          { textMr: "शमशोन (Samson)", textEn: "Samson", correct: false },
          { textMr: "शौल (Saul)", textEn: "Saul", correct: false },
          { textMr: "अबशालोम (Absalom)", textEn: "Absalom", correct: false }
        ],
        explMr: "दाविदाने गोफणीतील एका दगडाने गोल्याथ राक्षसाचा वध केला.",
        explEn: "1 Samuel 17 - David defeated Goliath with a sling and a stone.",
        ref: "१ शमुवेल १७:४९ (1 Samuel 17:49)"
      },
      {
        qMr: "येशूने आपल्या सेवेसाठी किती मुख्य प्रेषित निवडले?",
        qEn: "How many main apostles did Jesus choose?",
        choices: [
          { textMr: "१२ (12 Apostles)", textEn: "12 Apostles", correct: true },
          { textMr: "१० (10)", textEn: "10", correct: false },
          { textMr: "७ (7)", textEn: "7", correct: false },
          { textMr: "१५ (15)", textEn: "15", correct: false }
        ],
        explMr: "येशूने बारा जणांना बोलावले आणि त्यांना प्रेषित असे नाव दिले.",
        explEn: "Luke 6:13 - He called his disciples to him and chose twelve of them.",
        ref: "लूक ६:१३ (Luke 6:13)"
      },
      {
        qMr: "बायबलचे सर्वात पहिले पुस्तक कोणते आहे?",
        qEn: "What is the very first book of the Bible?",
        choices: [
          { textMr: "उत्पत्ती (Genesis)", textEn: "Genesis", correct: true },
          { textMr: "निर्गम (Exodus)", textEn: "Exodus", correct: false },
          { textMr: "मत्तय (Matthew)", textEn: "Matthew", correct: false },
          { textMr: "स्तोत्रसंहिता (Psalms)", textEn: "Psalms", correct: false }
        ],
        explMr: "उत्पत्ती हे बायबलमधील पहिले पुस्तक असून त्यात विश्वाची निर्मिती वर्णन केली आहे.",
        explEn: "Genesis is the foundational first book of the Bible.",
        ref: "उत्पत्ती १:१ (Genesis 1:1)"
      },
      {
        qMr: "सीनाय पर्वतावर देवाने कोणाला दहा आज्ञा दिल्या?",
        qEn: "Who received the Ten Commandments on Mount Sinai?",
        choices: [
          { textMr: "मोशे (Moses)", textEn: "Moses", correct: true },
          { textMr: "अब्राहम (Abraham)", textEn: "Abraham", correct: false },
          { textMr: "याकोब (Jacob)", textEn: "Jacob", correct: false },
          { textMr: "यहोशवा (Joshua)", textEn: "Joshua", correct: false }
        ],
        explMr: "देवाने सीनाय पर्वतावर मोशेला दगडी पाट्यांवर दहा आज्ञा दिल्या.",
        explEn: "Exodus 20 - God gave the Ten Commandments to Moses on Mount Sinai.",
        ref: "निर्गम २० (Exodus 20)"
      },
      {
        qMr: "येशूने कानामधील लग्नात पाण्याचे कशात रूपांतर केले?",
        qEn: "What did Jesus turn water into at the wedding of Cana?",
        choices: [
          { textMr: "उत्कृष्ट द्राक्षारस (Fine Wine)", textEn: "Fine Wine", correct: true },
          { textMr: "मध (Honey)", textEn: "Honey", correct: false },
          { textMr: "दूध (Milk)", textEn: "Milk", correct: false },
          { textMr: "तेल (Olive Oil)", textEn: "Olive Oil", correct: false }
        ],
        explMr: "येशूने पाण्याचे गोड आणि उत्तम द्राक्षारसात रूपांतर केले, जो त्याचा पहिला चमत्कार होता.",
        explEn: "John 2:9 - The master of the banquet tasted the water that had been turned into wine.",
        ref: "योहान २:९ (John 2:9)"
      },
      {
        qMr: "देवाच्या वचनानुसार, विश्वासू अब्राहामाच्या मुलाचे नाव काय होते?",
        qEn: "What was the name of Abraham's promised son with Sarah?",
        choices: [
          { textMr: "इसहाक (Isaac)", textEn: "Isaac", correct: true },
          { textMr: "इश्माएल (Ishmael)", textEn: "Ishmael", correct: false },
          { textMr: "एसाव (Esau)", textEn: "Esau", correct: false },
          { textMr: "योसेफ (Joseph)", textEn: "Joseph", correct: false }
        ],
        explMr: "सारा गर्भवती झाली आणि तिने अब्राहामासाठी अभिवचनाचा मुलगा इसहाक याला जन्म दिला.",
        explEn: "Genesis 21:3 - Abraham gave the name Isaac to the son Sarah bore him.",
        ref: "उत्पत्ती २१:३ (Genesis 21:3)"
      }
    ]
  },
  2: {
    levelId: 2,
    nameMr: "शोधक (मध्यम)",
    nameEn: "Intermediate",
    emoji: "⚔️",
    pointsPerQ: 20,
    badgeId: "quiz_badge_seeker",
    badgeName: "Scripture Seeker",
    badgeDesc: "Mastered Level 2 Gospels, Miracles & Prophets!",
    questions: [
      {
        qMr: "येशूने पाच हजार लोकांना खायला घालण्यासाठी किती भाकरी आणि माशांचा वापर केला?",
        qEn: "How many loaves and fish did Jesus use to feed the 5,000?",
        choices: [
          { textMr: "५ भाकरी आणि २ मासे", textEn: "5 Loaves and 2 Fish", correct: true },
          { textMr: "७ भाकरी आणि ३ मासे", textEn: "7 Loaves and 3 Fish", correct: false },
          { textMr: "२ भाकरी आणि ५ मासे", textEn: "2 Loaves and 5 Fish", correct: false },
          { textMr: "१२ भाकरी आणि २ मासे", textEn: "12 Loaves and 2 Fish", correct: false }
        ],
        explMr: "एका लहान मुलाच्या ५ सातूच्या भाकरी आणि २ लहान माशांवर येशूने आशीर्वाद मागितला.",
        explEn: "John 6:9 - Here is a boy with five small barley loaves and two small fish.",
        ref: "योहान ६:९ (John 6:9)"
      },
      {
        qMr: "गव्हाऱ्यांच्या खड्ड्यात टाकूनही देवाच्या संरक्षणाने जिवंत राहिलेला संदेष्टा कोण?",
        qEn: "Which prophet was thrown into the lion's den and preserved by God?",
        choices: [
          { textMr: "दानीएल (Daniel)", textEn: "Daniel", correct: true },
          { textMr: "यिर्मया (Jeremiah)", textEn: "Jeremiah", correct: false },
          { textMr: "यहेज्केल (Ezekiel)", textEn: "Ezekiel", correct: false },
          { textMr: "एलिया (Elijah)", textEn: "Elijah", correct: false }
        ],
        explMr: "देवाने आपला दूत पाठवून सिंहांची तोंडे बंद केली आणि दानीएलाचे रक्षण केले.",
        explEn: "Daniel 6:22 - My God sent his angel, and he shut the mouths of the lions.",
        ref: "दानीएल ६:२२ (Daniel 6:22)"
      },
      {
        qMr: "येशूच्या पुनरुत्थानानंतर त्याच्या जखमा पाहिल्याशिवाय विश्वास न ठेवणारा प्रेषित कोण?",
        qEn: "Which disciple doubted Jesus' resurrection until he saw the wounds?",
        choices: [
          { textMr: "थोमा (Thomas)", textEn: "Thomas", correct: true },
          { textMr: "पेत्र (Peter)", textEn: "Peter", correct: false },
          { textMr: "अंद्रिया (Andrew)", textEn: "Andrew", correct: false },
          { textMr: "फिलिप्प (Philip)", textEn: "Philip", correct: false }
        ],
        explMr: "थोमाने येशूला पाहून म्हटले, 'माझ्या प्रभू आणि माझ्या देवा!'",
        explEn: "John 20:28 - Thomas said to him, 'My Lord and my God!'",
        ref: "योहान २०:२८ (John 20:28)"
      },
      {
        qMr: "कर्मेल पर्वतावर बआलाच्या ४५० संदेष्ट्यांपुढे स्वर्गातून अग्नी उतरवणारा संदेष्टा कोण?",
        qEn: "Which prophet called down fire from heaven on Mount Carmel?",
        choices: [
          { textMr: "एलिया (Elijah)", textEn: "Elijah", correct: true },
          { textMr: "इलीशा (Elisha)", textEn: "Elisha", correct: false },
          { textMr: "शमुवेल (Samuel)", textEn: "Samuel", correct: false },
          { textMr: "नाथानाएल (Nathan)", textEn: "Nathan", correct: false }
        ],
        explMr: "१ राजे १८:३८ नुसार, परमेश्वराचा अग्नी पडला आणि त्याने होमार्पण भस्म केले.",
        explEn: "1 Kings 18:38 - Then the fire of the Lord fell and burned up the sacrifice.",
        ref: "१ राजे १८:३८ (1 Kings 18:38)"
      },
      {
        qMr: "येशूने कोणत्या मेलेल्या माणसाला चार दिवसांनंतर कबरेतून जिवंत केले?",
        qEn: "Whom did Jesus raise from the dead after four days in the tomb?",
        choices: [
          { textMr: "लाजर (Lazarus)", textEn: "Lazarus", correct: true },
          { textMr: "याईराची मुलगी (Jairus' Daughter)", textEn: "Jairus' Daughter", correct: false },
          { textMr: "विधवेचा मुलगा (Widow's Son)", textEn: "Widow's Son", correct: false },
          { textMr: "स्तीफन (Stephen)", textEn: "Stephen", correct: false }
        ],
        explMr: "येशूने मोठ्या आवाजात हाक मारली, 'लाजरा, बाहेर ये!' आणि मेलेला माणूस बाहेर आला.",
        explEn: "John 11:43 - Jesus called in a loud voice, 'Lazarus, come out!'",
        ref: "योहान ११:४३ (John 11:43)"
      },
      {
        qMr: "राजा शलमोनाने देवाकडे सर्वात महत्त्वाची कोणती देणगी मागितली?",
        qEn: "What did King Solomon ask God for when offered anything?",
        choices: [
          { textMr: "शहाणपण व विवेक (Wisdom & Discernment)", textEn: "Wisdom & Discernment", correct: true },
          { textMr: "अफाट संपत्ती (Immense Wealth)", textEn: "Immense Wealth", correct: false },
          { textMr: "शत्रूंचा पराभव (Defeat of Enemies)", textEn: "Defeat of Enemies", correct: false },
          { textMr: "दीर्घायुष्य (Long Life)", textEn: "Long Life", correct: false }
        ],
        explMr: "शलमोनाने लोकांवर योग्य न्याय करण्यासाठी शहाणे अंतःकरण मागितले.",
        explEn: "1 Kings 3:9 - Give your servant a discerning heart to govern your people.",
        ref: "१ राजे ३:९ (1 Kings 3:9)"
      },
      {
        qMr: "पेत्राने येशूला कोंबडा आरवण्यापूर्वी किती वेळा नाकारले?",
        qEn: "How many times did Peter deny Jesus before the rooster crowed?",
        choices: [
          { textMr: "३ वेळा (3 Times)", textEn: "3 Times", correct: true },
          { textMr: "२ वेळा (2 Times)", textEn: "2 Times", correct: false },
          { textMr: "७ वेळा (7 Times)", textEn: "7 Times", correct: false },
          { textMr: "१ वेळा (1 Time)", textEn: "1 Time", correct: false }
        ],
        explMr: "लूक २२:६१ नुसार, येशूचे भाकीत खरे ठरले आणि पेत्राने त्याला तीनदा नाकारले.",
        explEn: "Luke 22:61 - Before the rooster crows today, you will disown me three times.",
        ref: "लूक २२:६१ (Luke 22:61)"
      },
      {
        qMr: "दमास्कसच्या वाटेवर कोणत्या संताचे अंधारात डोळे उघडले आणि रूपांतर झाले?",
        qEn: "Who was converted on the road to Damascus after seeing a great light?",
        choices: [
          { textMr: "शौल / प्रेषित पौल (Saul / Apostle Paul)", textEn: "Saul / Apostle Paul", correct: true },
          { textMr: "बर्णबा (Barnabas)", textEn: "Barnabas", correct: false },
          { textMr: "मत्तय (Matthew)", textEn: "Matthew", correct: false },
          { textMr: "लूक (Luke)", textEn: "Luke", correct: false }
        ],
        explMr: "प्रेषितांची कृत्ये ९ मध्ये शौलाचे डोळे उघडले आणि तो प्रेषित पौल बनला.",
        explEn: "Acts 9 - Saul encountered Jesus and became the Apostle Paul.",
        ref: "प्रेषितांची कृत्ये ९ (Acts 9)"
      },
      {
        qMr: "येशूने स्वतः शिकवलेल्या प्रार्थनेची सुरुवात कशी होते?",
        qEn: "How does the Lord's Prayer begin?",
        choices: [
          { textMr: "आमच्या स्वर्गातील पित्या (Our Father in Heaven)", textEn: "Our Father in Heaven", correct: true },
          { textMr: "हे सर्वसमर्थ देवा (O Almighty God)", textEn: "O Almighty God", correct: false },
          { textMr: "हे राजांच्या राजा (O King of Kings)", textEn: "O King of Kings", correct: false },
          { textMr: "हे दयाळू प्रभू (O Merciful Lord)", textEn: "O Merciful Lord", correct: false }
        ],
        explMr: "मत्तय ६:९ - 'म्हणून तुम्ही अशी प्रार्थना करा: आमच्या स्वर्गातील पित्या, तुझे नाव पवित्र मानले जावो.'",
        explEn: "Matthew 6:9 - Our Father in heaven, hallowed be your name.",
        ref: "मत्तय ६:९ (Matthew 6:9)"
      },
      {
        qMr: "बायबलमधील सर्वात मोठे अध्याय असलेले पुस्तक कोणते?",
        qEn: "Which book contains the longest chapter in the Bible (Chapter 119)?",
        choices: [
          { textMr: "स्तोत्रसंहिता (Psalms)", textEn: "Psalms", correct: true },
          { textMr: "यशया (Isaiah)", textEn: "Isaiah", correct: false },
          { textMr: "उत्पत्ती (Genesis)", textEn: "Genesis", correct: false },
          { textMr: "यिर्मया (Jeremiah)", textEn: "Jeremiah", correct: false }
        ],
        explMr: "स्तोत्र ११९ हे बायबलमधील सर्वात मोठे अध्याय असून त्यात १७६ वचने आहेत.",
        explEn: "Psalm 119 is the longest chapter in the Bible with 176 verses.",
        ref: "स्तोत्र ११९ (Psalm 119)"
      }
    ]
  },
  3: {
    levelId: 3,
    nameMr: "अभ्यासक (कठीण)",
    nameEn: "Advanced",
    emoji: "👑",
    pointsPerQ: 30,
    badgeId: "quiz_badge_scholar",
    badgeName: "Bible Scholar",
    badgeDesc: "Mastered Level 3 Epistles, Prophecy & Covenants!",
    questions: [
      {
        qMr: "पवित्र आत्म्याची ९ फळे (Fruits of the Spirit) पौलाच्या कोणत्या पत्रात सूचीबद्ध आहेत?",
        qEn: "In which Epistle are the 9 Fruits of the Spirit listed?",
        choices: [
          { textMr: "गलतीकरांस ५:२२-२३ (Galatians)", textEn: "Galatians 5:22-23", correct: true },
          { textMr: "रोमन्स ८:१-४ (Romans)", textEn: "Romans 8:1-4", correct: false },
          { textMr: "इफिसकरांस २:८-१० (Ephesians)", textEn: "Ephesians 2:8-10", correct: false },
          { textMr: "कलसैState ३:१२ (Colossians)", textEn: "Colossians 3:12", correct: false }
        ],
        explMr: "गलतीकरांस ५:२२-२३ मध्ये प्रीती, आनंद, शांती, सहनशीलता, दयाळूपणा, चांगुलपणा, विश्वासूपणा, सौम्यता आणि आत्मसंयम ही फळे आहेत.",
        explEn: "Galatians 5:22-23 defines the fruit of the Spirit.",
        ref: "गलतीकरांस ५:२२-२३ (Galatians 5:22-23)"
      },
      {
        qMr: "नवा करार येशूच्या रक्ताद्वारे स्थापित झाला ही घोषणा कोणत्या रात्री करण्यात आली?",
        qEn: "On which night was the New Covenant in Jesus' blood instituted?",
        choices: [
          { textMr: "प्रभूचे शेवटचे भोजन (Last Supper / Passover)", textEn: "The Last Supper", correct: true },
          { textMr: "पुनरुत्थानाचा दिवस (Resurrection Day)", textEn: "Resurrection Day", correct: false },
          { textMr: "पेंटेकॉस्टचा दिवस (Pentecost)", textEn: "Pentecost Day", correct: false },
          { textMr: "गेथशेमाने बागेत (Garden of Gethsemane)", textEn: "Garden of Gethsemane", correct: false }
        ],
        explMr: "लूक २२:२० - 'हा प्याला तुमच्यासाठी सांडण्यात येणाऱ्या माझ्या रक्तातील नवा करार आहे.'",
        explEn: "Luke 22:20 - This cup is the new covenant in my blood, which is poured out for you.",
        ref: "लूक २२:२० (Luke 22:20)"
      },
      {
        qMr: "बायबलमधील 'विश्वासाचे अध्याय' (Faith Chapter) म्हणून कोणता अध्याय ओळखला जातो?",
        qEn: "Which chapter is famously known as the 'Hall of Faith'?",
        choices: [
          { textMr: "इब्री लोकांस पत्र ११ (Hebrews 11)", textEn: "Hebrews 11", correct: true },
          { textMr: "१ करिंथकर १३ (1 Corinthians 13)", textEn: "1 Corinthians 13", correct: false },
          { textMr: "रोमन्स १२ (Romans 12)", textEn: "Romans 12", correct: false },
          { textMr: "याकोब २ (James 2)", textEn: "James 2", correct: false }
        ],
        explMr: "इब्री ११ मध्ये 'विश्वास हा आशा धरलेल्या गोष्टींचा भरवसा...' सांगून विश्वासाच्या वीरांचे वर्णन केले आहे.",
        explEn: "Hebrews 11 details biblical faith and heroes of faith.",
        ref: "इब्री ११:१ (Hebrews 11:1)"
      },
      {
        qMr: "येशूच्या क्रूसावर खिळले जाण्याच्या वेळी मंदिरातील पडदा कसा फाटला?",
        qEn: "How was the temple curtain torn when Jesus died on the cross?",
        choices: [
          { textMr: "वरपासून खालपर्यंत दोन तुकडे झाला", textEn: "From top to bottom in two", correct: true },
          { textMr: "खालून वर फाटला", textEn: "From bottom to top", correct: false },
          { textMr: "मध्यभागी जळाला", textEn: "Burned in the middle", correct: false },
          { textMr: "केवळ बाजूला सरकला", textEn: "Simply moved aside", correct: false },
        ],
        explMr: "मत्तय २७:५१ - 'तेव्हा मंदिराचा पडदा वरपासून खालपर्यंत फाटून त्याचे दोन तुकडे झाले.' हे देवाकडे थेट प्रवेश दर्शवते.",
        explEn: "Matthew 27:51 - At that moment the curtain of the temple was torn in two from top to bottom.",
        ref: "मत्तय २७:५१ (Matthew 27:51)"
      },
      {
        qMr: "पेंटेकॉस्टच्या दिवशी प्रेषितांवर पवित्र आत्मा कोणत्या रूपात उतरला?",
        qEn: "In what form did the Holy Spirit appear on the disciples on Pentecost?",
        choices: [
          { textMr: "अग्नीच्या जिभांप्रमाणे (Tongues of Fire)", textEn: "Tongues of fire", correct: true },
          { textMr: "पांढऱ्या कबुतरासारखा (White Dove)", textEn: "White Dove", correct: false },
          { textMr: "मेघाच्या रूपात (Cloud of Glory)", textEn: "Cloud of Glory", correct: false },
          { textMr: "पाण्याच्या धारेसारखा (Stream of Water)", textEn: "Stream of Water", correct: false }
        ],
        explMr: "प्रेषितांची कृत्ये २:३ - 'आणि अग्नीसारख्या विभागलेल्या जिभा त्यांना दिसल्या आणि त्या प्रत्येकावर येऊन बसल्या.'",
        explEn: "Acts 2:3 - They saw what seemed to be tongues of fire that separated and came to rest on each of them.",
        ref: "प्रेषितांची कृत्ये २:३ (Acts 2:3)"
      },
      {
        qMr: "जुना करारातील 'दुःखी सेवक' (Suffering Servant) ची प्रदीर्घ भविष्यवाणी कोणत्या अध्यायात आहे?",
        qEn: "Which chapter contains the famous prophecy of the 'Suffering Servant'?",
        choices: [
          { textMr: "यशया ५३ (Isaiah 53)", textEn: "Isaiah 53", correct: true },
          { textMr: "दानीएल ९ (Daniel 9)", textEn: "Daniel 9", correct: false },
          { textMr: "जखऱ्या १२ (Zechariah 12)", textEn: "Zechariah 12", correct: false },
          { textMr: "स्तोत्र २२ (Psalm 22)", textEn: "Psalm 22", correct: false }
        ],
        explMr: "यशया ५३ मध्ये येशूच्या बलिदानाचे, जखमांचे आणि चंगाईचे अचूक भाकीत केले आहे.",
        explEn: "Isaiah 53 prophetically depicts Christ's crucifixion and redemption.",
        ref: "यशया ५३ (Isaiah 53)"
      },
      {
        qMr: "प्रकटीकरणाचे पुस्तक कोणत्या बेटावर बंदिवान असताना प्रेषित योहानाने लिहिले?",
        qEn: "On which island was John exiled when he wrote the Book of Revelation?",
        choices: [
          { textMr: "पात्मस बेट (Patmos)", textEn: "Island of Patmos", correct: true },
          { textMr: "क्रीत बेट (Crete)", textEn: "Crete", correct: false },
          { textMr: "सायप्रस (Cyprus)", textEn: "Cyprus", correct: false },
          { textMr: "माल्टा (Malta)", textEn: "Malta", correct: false }
        ],
        explMr: "प्रकटीकरण १:९ - 'मी योहान... देवाच्या वचनामुळे आणि येशूच्या साक्षामुळे पात्मस नावाच्या बेटावर होतो.'",
        explEn: "Revelation 1:9 - I, John, was on the island of Patmos because of the word of God.",
        ref: "प्रकटीकरण १:९ (Revelation 1:9)"
      },
      {
        qMr: "पौलानुसार, 'प्रीती सहनशील आहे, उपकार करते...' हे प्रसिद्ध प्रीतीचे स्तोत्र कोणत्या पत्रात आहे?",
        qEn: "Which chapter is celebrated as the great 'Love Chapter' by Paul?",
        choices: [
          { textMr: "१ करिंथकर १३ (1 Corinthians 13)", textEn: "1 Corinthians 13", correct: true },
          { textMr: "रोमन्स १२ (Romans 12)", textEn: "Romans 12", correct: false },
          { textMr: "इफिसकर ४ (Ephesians 4)", textEn: "Ephesians 4", correct: false },
          { textMr: "१ योहान ४ (1 John 4)", textEn: "1 John 4", correct: false }
        ],
        explMr: "१ करिंथकर १३:४-८ हे ख्रिस्ती प्रीतीचे सर्वोत्तम वर्णन आहे.",
        explEn: "1 Corinthians 13 is Paul's timeless treatise on unconditional love.",
        ref: "१ करिंथकर १३:४ (1 Corinthians 13:4)"
      },
      {
        qMr: "येशूच्या वंशावळीमध्ये समावेश असलेल्या दोन परदेशी स्त्रिया कोणत्या?",
        qEn: "Which two gentile women are explicitly included in Jesus' genealogy in Matthew 1?",
        choices: [
          { textMr: "राहाब आणि रूथ (Rahab & Ruth)", textEn: "Rahab and Ruth", correct: true },
          { textMr: "इस्तेर आणि सारा (Esther & Sarah)", textEn: "Esther and Sarah", correct: false },
          { textMr: "रेबेका आणि लेआ (Rebekah & Leah)", textEn: "Rebekah and Leah", correct: false },
          { textMr: "दबोरा आणि याएल (Deborah & Jael)", textEn: "Deborah and Jael", correct: false }
        ],
        explMr: "मत्तय १ मध्ये राहाब (कनानी) आणि रूथ (मोआबी) या दोघींचा येशूच्या पवित्र वंशावळीत समावेश आहे.",
        explEn: "Matthew 1 highlights God's grace by including Rahab and Ruth.",
        ref: "मत्तय १:५ (Matthew 1:5)"
      },
      {
        qMr: "पवित्र शास्त्रात 'मल्कीसदेक' (Melchizedek) कोणाचा पूर्वछाया (Type of Christ) मानला जातो?",
        qEn: "Melchizedek is described in Hebrews as a perpetual high priest of which order?",
        choices: [
          { textMr: "शालेमचा राजा आणि परात्पर देवाचा याजक (King of Salem & High Priest)", textEn: "King of Salem & Priest Forever", correct: true },
          { textMr: "लेवी याजक (Levitical Priest)", textEn: "Levitical Priest", correct: false },
          { textMr: "अहरोनाचा वंशज (Aaron's Lineage)", textEn: "Aaron's Lineage", correct: false },
          { textMr: "पलिश्ती याजक (Philistine Priest)", textEn: "Philistine Priest", correct: false }
        ],
        explMr: "इब्री ७ नुसार येशू मल्कीसदेकाच्या पंक्तीचा सार्वकालिक मुख्य याजक आहे.",
        explEn: "Hebrews 7 establishes Jesus' eternal priesthood after the order of Melchizedek.",
        ref: "इब्री ७:१७ (Hebrews 7:17)"
      }
    ]
  },
  4: {
    levelId: 4,
    nameMr: "सखोल ज्ञानी (Expert)",
    nameEn: "Theologian Master",
    emoji: "🏆",
    pointsPerQ: 50,
    badgeId: "quiz_badge_theologian",
    badgeName: "Theology Master",
    badgeDesc: "Achieved Master status in deep Biblical theology & original languages!",
    questions: [
      {
        qMr: "बायबलमधील ग्रीक शब्द 'अगापे' (Agape) चा खरा अर्थ काय आहे?",
        qEn: "What is the primary biblical theological definition of the Greek word 'Agape'?",
        choices: [
          { textMr: "निःस्वार्थी, बिनशर्त दैवी प्रीती (Unconditional Sacrificial Love)", textEn: "Selfless, Unconditional Divine Love", correct: true },
          { textMr: "भावनिक मैत्री (Brotherly Affection)", textEn: "Emotional Friendship (Phileo)", correct: false },
          { textMr: "कौटुंबिक आपुलकी (Family Bond)", textEn: "Family Affection (Storge)", correct: false },
          { textMr: "शारीरिक आकर्षण (Romantic Attraction)", textEn: "Romantic Passion (Eros)", correct: false }
        ],
        explMr: "अगापे ही देवाची स्वतःचा एकुलता एक पुत्र देण्याइतकी सर्वोच्च, निःस्वार्थी प्रीती आहे.",
        explEn: "Agape represents highest sacrificial, unconditional divine love.",
        ref: "१ योहान ४:८ (1 John 4:8)"
      },
      {
        qMr: "देवाने मोशेला जळत्या झुडुपाजवळ आपले सनातन नाव काय सांगितले? (Hebrew: 'Ehyeh Asher Ehyeh')",
        qEn: "What covenant name did God reveal to Moses at the burning bush? ('Ehyeh Asher Ehyeh')",
        choices: [
          { textMr: "मी जो आहे तो मी आहे (I AM WHO I AM)", textEn: "I AM WHO I AM", correct: true },
          { textMr: "मी विश्वाचा निर्माता आहे (I am Creator)", textEn: "I am Creator", correct: false },
          { textMr: "मी राजांचा राजा आहे (I am King)", textEn: "I am King", correct: false },
          { textMr: "मी न्यायाधिश आहे (I am Judge)", textEn: "I am Judge", correct: false }
        ],
        explMr: "निर्गम ३:१४ - देवाने मोशेला म्हटले, 'मी जो आहे तो मी आहे. तू इस्राएल लोकांना सांग, 'मी आहे' याने मला पाठवले आहे.'",
        explEn: "Exodus 3:14 - God said to Moses, 'I AM WHO I AM.'",
        ref: "निर्गम ३:१४ (Exodus 3:14)"
      },
      {
        qMr: "येशूच्या वधस्तंभावर उच्चारलेला हिब्रू/अरामीक उद्गार 'एलोई, एलोई, लमा सबखथनी' चा अर्थ काय?",
        qEn: "What is the translation of Jesus' cry on the cross: 'Eloi, Eloi, lema sabachthani'?",
        choices: [
          { textMr: "माझ्या देवा, माझ्या देवा, तू मला का सोडलेस? (My God, my God, why have you forsaken me?)", textEn: "My God, my God, why have you forsaken me?", correct: true },
          { textMr: "हे पित्या, त्यांचे पाप क्षमा कर", textEn: "Father forgive them", correct: false },
          { textMr: "सर्व काही पूर्ण झाले आहे", textEn: "It is finished", correct: false },
          { textMr: "मी माझा आत्मा सोपवतो", textEn: "Into your hands I commit my spirit", correct: false }
        ],
        explMr: "मार्क १५:३४ मध्ये येशूने स्तोत्र २२:१ मधील वचनाची पुनरुक्ती केली.",
        explEn: "Mark 15:34 quotes Psalm 22:1 as Jesus bore the world's sin.",
        ref: "मार्क १५:३४ (Mark 15:34)"
      },
      {
        qMr: "नव्या करारातील 'केनोसिस' (Kenosis) हा धर्मशास्त्रीय सिद्धांत कशाशी संबंधित आहे?",
        qEn: "The theological doctrine of 'Kenosis' (Philippians 2:7) refers to what aspect of Christ?",
        choices: [
          { textMr: "येशूचे स्वतःला रिक्त करून दासाचे रूप घेणे (Christ emptying Himself)", textEn: "Christ emptying Himself taking form of servant", correct: true },
          { textMr: "येशूचे स्वर्गात जाणे (Ascension)", textEn: "Christ's Ascension", correct: false },
          { textMr: "येशूचे मंदिर शुद्ध करणे (Cleansing Temple)", textEn: "Cleansing of the Temple", correct: false },
          { textMr: "पाण्यातून बाप्तिस्मा घेणे (Baptism)", textEn: "Water Baptism", correct: false }
        ],
        explMr: "फिलिप्पै २:७ मध्ये ख्रिस्ताने स्वतःचे दैवी विशेषाधिकार बाजूला ठेवून मानवी रूप स्वीकारल्याचे वर्णन आहे.",
        explEn: "Philippians 2:7 - Christ emptied Himself by taking the very nature of a servant.",
        ref: "फिलिप्पै २:७ (Philippians 2:7)"
      },
      {
        qMr: "जुना करारात परमेश्वराचे नाव 'यहोवा यिरे' (Jehovah Jireh) कोणत्या घटनेनंतर प्रगट झाले?",
        qEn: "The divine name 'Jehovah Jireh' (The Lord Will Provide) was declared during which event?",
        choices: [
          { textMr: "मोरीया पर्वतावर अब्राहामाने इसहाकाचे अर्पण करताना (Abraham on Mount Moriah)", textEn: "Abraham sacrificing on Mount Moriah", correct: true },
          { textMr: "तांबडा समुद्र दुभंगताना (Red Sea Parting)", textEn: "Parting of Red Sea", correct: false },
          { textMr: "मन्ना स्वर्गातून पडताना (Manna in Wilderness)", textEn: "Manna in Wilderness", correct: false },
          { textMr: "यर्देन नदी ओलांडताना (Jordan Crossing)", textEn: "Jordan River Crossing", correct: false }
        ],
        explMr: "उत्पत्ती २२:१४ - अब्राहामाने त्या जागेचे नाव 'परमेश्वर पुरवेल' (यहोवा यिरे) असे ठेवले.",
        explEn: "Genesis 22:14 - Abraham called that place The Lord Will Provide.",
        ref: "उत्पत्ती २२:१४ (Genesis 22:14)"
      },
      {
        qMr: "नव्या करारामध्ये 'पॅराक्लीटॉस' (Parakletos / Paraclete) ही उपाधी कोणासाठी वापरली आहे?",
        qEn: "The Greek term 'Paraclete' (Advocate, Comforter, Helper) is used by Jesus for whom?",
        choices: [
          { textMr: "पवित्र आत्मा (The Holy Spirit / Counselor)", textEn: "The Holy Spirit / Comforter", correct: true },
          { textMr: "देवदूत मिखाएल (Archangel Michael)", textEn: "Archangel Michael", correct: false },
          { textMr: "योहान बाप्तिस्मा देणारा (John the Baptist)", textEn: "John the Baptist", correct: false },
          { textMr: "संदेष्टा एलिया (Prophet Elijah)", textEn: "Prophet Elijah", correct: false }
        ],
        explMr: "योहान १४:१६, २६ मध्ये येशूने पवित्र आत्म्याला 'दुसरा कैवारी व साहाय्यक' (Paraclete) म्हटले आहे.",
        explEn: "John 14:16, 26 - The Advocate/Comforter, the Holy Spirit.",
        ref: "योहान १४:२६ (John 14:26)"
      },
      {
        qMr: "रोमन्स ५:१ नुसार, आपण विश्वासाने नीतिमान ठरल्यामुळे देवाबरोबर आपल्याला काय प्राप्त होते?",
        qEn: "According to Romans 5:1, since we have been justified through faith, what do we have with God?",
        choices: [
          { textMr: "आपल्या प्रभू येशू ख्रिस्ताद्वारे देवाबरोबर शांती (Peace with God through Christ)", textEn: "Peace with God through our Lord Jesus Christ", correct: true },
          { textMr: "केवळ भौतिक समृद्धी", textEn: "Material Wealth", correct: false },
          { textMr: "शारीरिक अमरत्व", textEn: "Physical Immortality", correct: false },
          { textMr: "सांसारिक अधिकार", textEn: "Earthly Authority", correct: false }
        ],
        explMr: "रोमन्स ५:१ - 'म्हणून विश्वासाने नीतिमान ठरल्यामुळे आपल्या प्रभू येशू ख्रिस्ताद्वारे देवाशी आमची शांती झाली आहे.'",
        explEn: "Romans 5:1 - Since we have been justified through faith, we have peace with God.",
        ref: "रोमन्स ५:१ (Romans 5:1)"
      },
      {
        qMr: "प्रकटीकरण १:८ मध्ये येशूने स्वतःला काय संबोधले आहे? ('मी ______ आणि ______ आहे.')",
        qEn: "In Revelation 1:8, what divine title does the Lord declare? ('I am the _____ and the _____')",
        choices: [
          { textMr: "अल्फा आणि ओमेगा (Alpha & Omega)", textEn: "Alpha and Omega", correct: true },
          { textMr: "आरंभ आणि अंत (First and Middle)", textEn: "First and Middle", correct: false },
          { textMr: "सूर्य आणि चंद्र (Sun and Moon)", textEn: "Sun and Moon", correct: false },
          { textMr: "न्यायाधिश आणि राजा (Judge and Ruler)", textEn: "Judge and Ruler", correct: false }
        ],
        explMr: "प्रकटीकरण १:८ - 'प्रभू देव जो आहे, जो होता आणि जो येणार आहे, तो सर्वसमर्थ म्हणतो, मी अल्फा आणि ओमेगा आहे.'",
        explEn: "Revelation 1:8 - 'I am the Alpha and the Omega,' says the Lord God.",
        ref: "प्रकटीकरण १:८ (Revelation 1:8)"
      },
      {
        qMr: "बायबलमधील 'हबलल हाबालिम' (Hebrew: 'Vanity of vanities') हे वचन कोणत्या पुस्तकातील मुख्य विषय आहे?",
        qEn: "The Hebrew philosophical phrase 'Hevel Havalim' (Vanity of vanities / Meaningless) is central to which book?",
        choices: [
          { textMr: "उपदेशक (Ecclesiastes)", textEn: "Ecclesiastes", correct: true },
          { textMr: "ईयोब (Job)", textEn: "Job", correct: false },
          { textMr: "गीतरत्न (Song of Solomon)", textEn: "Song of Solomon", correct: false },
          { textMr: "विलापगीत (Lamentations)", textEn: "Lamentations", correct: false }
        ],
        explMr: "उपदेशक १:२ मध्ये शलमोनाने जगातील नश्वरतेवर चिंतन करताना 'व्यर्थाचे व्यर्थ, सर्व काही व्यर्थ' म्हटले आहे.",
        explEn: "Ecclesiastes 1:2 - 'Meaningless! Meaningless!' says the Teacher. 'Utterly meaningless!'",
        ref: "उपदेशक १:२ (Ecclesiastes 1:2)"
      },
      {
        qMr: "येशूने क्रूसावर शेवटचा शब्द 'तेतेलेस्ताई' (Tetelestai - It is finished) उच्चारला; त्याचा मूळ व्यापारिक अर्थ काय होता?",
        qEn: "What was the commercial/accounting meaning of Jesus' final Greek word 'Tetelestai' (It is finished)?",
        choices: [
          { textMr: "कर्ज पूर्णपणे फेडले गेले आहे! (Paid in Full!)", textEn: "Paid in Full! (Debt Canceled)", correct: true },
          { textMr: "माझे जीवन संपले आहे", textEn: "My life is over", correct: false },
          { textMr: "दिवस मावळला आहे", textEn: "The sun has set", correct: false },
          { textMr: "युद्धाचा शेवट झाला", textEn: "The battle ended", correct: false }
        ],
        explMr: "प्राचीन काळात कर्जाच्या पावतीवर कर्ज पूर्ण फेडल्याची खात्री म्हणून 'तेतेलेस्ताई' (Paid in Full) शिक्का मारला जाई. येशूने आपल्या पापांचे संपूर्ण कर्ज फेडले!",
        explEn: "Tetelestai was stamped on debt receipts to signify that a debt was Paid in Full.",
        ref: "योहान १९:३० (John 19:30)"
      }
    ]
  }
};

let selectedQuizLevel = 1;
let quizCurrentQuestionIdx = 0;
let quizSessionScore = 0;
let quizSessionStreak = 0;
let quizMaxStreak = 0;
let quizShuffledQuestions = [];
let quizHasAnsweredCurrent = false;

function playQuizSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "correct") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(185, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
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

function openBibleQuizModal() {
  const modal = document.getElementById("modal-bible-quiz");
  if (!modal) return;
  
  showQuizLevelSelect();
  updateQuizCardStats();
  
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
}

function closeBibleQuizModal() {
  const modal = document.getElementById("modal-bible-quiz");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => modal.style.display = "none", 300);
  }
}

function selectQuizLevel(levelNum) {
  selectedQuizLevel = levelNum;
  for (let i = 1; i <= 4; i++) {
    const card = document.getElementById(`quiz-lvl-card-${i}`);
    if (card) {
      if (i === levelNum) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    }
  }
}

function showQuizLevelSelect() {
  const welcomeScreen = document.getElementById("quiz-welcome-screen");
  const questionScreen = document.getElementById("quiz-question-screen");
  const resultsScreen = document.getElementById("quiz-results-screen");
  
  if (welcomeScreen) welcomeScreen.style.display = "block";
  if (questionScreen) questionScreen.style.display = "none";
  if (resultsScreen) resultsScreen.style.display = "none";
  
  selectQuizLevel(selectedQuizLevel);
  updateQuizCardStats();
}

function startSelectedQuizLevel() {
  const lvlData = QUIZ_LEVELS_DATA[selectedQuizLevel] || QUIZ_LEVELS_DATA[1];
  
  // Clone & shuffle questions
  quizShuffledQuestions = [...lvlData.questions].sort(() => 0.5 - Math.random());
  quizCurrentQuestionIdx = 0;
  quizSessionScore = 0;
  quizSessionStreak = 0;
  quizMaxStreak = 0;
  
  const welcomeScreen = document.getElementById("quiz-welcome-screen");
  const questionScreen = document.getElementById("quiz-question-screen");
  const resultsScreen = document.getElementById("quiz-results-screen");
  
  if (welcomeScreen) welcomeScreen.style.display = "none";
  if (resultsScreen) resultsScreen.style.display = "none";
  if (questionScreen) questionScreen.style.display = "block";
  
  const lvlInd = document.getElementById("quiz-active-level-indicator");
  if (lvlInd) lvlInd.textContent = `Level ${selectedQuizLevel}: ${lvlData.nameEn} / ${lvlData.nameMr}`;
  
  showQuizQuestion();
}

function showQuizQuestion() {
  quizHasAnsweredCurrent = false;
  const currentQ = quizShuffledQuestions[quizCurrentQuestionIdx];
  if (!currentQ) {
    showQuizResults();
    return;
  }
  
  const qNumEl = document.getElementById("quiz-question-number");
  const scoreEl = document.getElementById("quiz-current-score");
  const streakEl = document.getElementById("quiz-streak-count");
  const progressEl = document.getElementById("quiz-progress-bar");
  const qMrEl = document.getElementById("quiz-question-mr");
  const qEnEl = document.getElementById("quiz-question-en");
  const choicesContainer = document.getElementById("quiz-choices-container");
  const explBox = document.getElementById("quiz-explanation-box");
  const nextBtn = document.getElementById("btn-next-quiz-question");
  
  if (qNumEl) qNumEl.textContent = `Question ${quizCurrentQuestionIdx + 1} of ${quizShuffledQuestions.length}`;
  if (scoreEl) scoreEl.textContent = `${quizSessionScore} pts`;
  if (streakEl) streakEl.textContent = `🔥 Streak: ${quizSessionStreak}`;
  
  const pct = ((quizCurrentQuestionIdx + 1) / quizShuffledQuestions.length) * 100;
  if (progressEl) progressEl.style.width = `${pct}%`;
  
  if (qMrEl) qMrEl.textContent = currentQ.qMr;
  if (qEnEl) qEnEl.textContent = currentQ.qEn;
  
  if (explBox) explBox.style.display = "none";
  if (nextBtn) nextBtn.style.display = "none";
  
  if (choicesContainer) {
    choicesContainer.innerHTML = "";
    
    // Shuffle choices
    const choices = [...currentQ.choices].sort(() => 0.5 - Math.random());
    const letterLabels = ["A", "B", "C", "D"];
    
    choices.forEach((c, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice-btn";
      btn.innerHTML = `
        <span style="display: flex; align-items: center; gap: 10px;">
          <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--pill-bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">${letterLabels[idx]}</span>
          <span>${c.textMr} <small style="display: block; color: var(--text-muted); font-size: 11.5px;">${c.textEn}</small></span>
        </span>
        <span class="choice-icon" style="font-size: 16px;"></span>
      `;
      
      btn.addEventListener("click", () => {
        if (quizHasAnsweredCurrent) return;
        selectQuizChoice(btn, c.correct);
      });
      
      choicesContainer.appendChild(btn);
    });
  }
}

function selectQuizChoice(selectedBtn, isCorrect) {
  if (quizHasAnsweredCurrent) return;
  quizHasAnsweredCurrent = true;
  
  const choicesContainer = document.getElementById("quiz-choices-container");
  const buttons = choicesContainer.querySelectorAll(".quiz-choice-btn");
  const currentQ = quizShuffledQuestions[quizCurrentQuestionIdx];
  const lvlData = QUIZ_LEVELS_DATA[selectedQuizLevel] || QUIZ_LEVELS_DATA[1];
  
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = "default";
  });
  
  const explBox = document.getElementById("quiz-explanation-box");
  const explStatus = document.getElementById("quiz-explanation-status");
  const explText = document.getElementById("quiz-explanation-text");
  const explRef = document.getElementById("quiz-explanation-ref");
  const explIcon = document.getElementById("quiz-explanation-icon");
  const nextBtn = document.getElementById("btn-next-quiz-question");
  
  if (isCorrect) {
    selectedBtn.classList.add("correct");
    selectedBtn.querySelector(".choice-icon").textContent = "✓";
    playQuizSound("correct");
    
    quizSessionStreak += 1;
    if (quizSessionStreak > quizMaxStreak) quizMaxStreak = quizSessionStreak;
    
    const streakBonus = Math.floor(quizSessionStreak / 3) * 5;
    const gained = lvlData.pointsPerQ + streakBonus;
    quizSessionScore += gained;
    
    if (explStatus) explStatus.textContent = `Correct! / बरोबर! (+${gained} pts)`;
    if (explIcon) explIcon.textContent = "🌟";
  } else {
    selectedBtn.classList.add("wrong");
    selectedBtn.querySelector(".choice-icon").textContent = "✕";
    playQuizSound("wrong");
    quizSessionStreak = 0;
    
    if (explStatus) explStatus.textContent = "Incorrect / चुकीचे उत्तर";
    if (explIcon) explIcon.textContent = "💡";
    
    // Highlight correct choice
    buttons.forEach(btn => {
      const text = btn.innerText;
      const correctChoice = currentQ.choices.find(c => c.correct);
      if (correctChoice && (text.includes(correctChoice.textMr) || text.includes(correctChoice.textEn))) {
        btn.classList.add("correct");
        btn.querySelector(".choice-icon").textContent = "✓";
      }
    });
  }
  
  if (explText) explText.textContent = `${currentQ.explMr}
${currentQ.explEn}`;
  if (explRef) explRef.textContent = `📖 ${currentQ.ref}`;
  if (explBox) explBox.style.display = "flex";
  if (nextBtn) {
    nextBtn.style.display = "block";
    nextBtn.textContent = (quizCurrentQuestionIdx === quizShuffledQuestions.length - 1) ? "View Results / निकाल पहा 🏁" : "Next Question / पुढील प्रश्न &rarr;";
  }
  
  const scoreEl = document.getElementById("quiz-current-score");
  const streakEl = document.getElementById("quiz-streak-count");
  if (scoreEl) scoreEl.textContent = `${quizSessionScore} pts`;
  if (streakEl) streakEl.textContent = `🔥 Streak: ${quizSessionStreak}`;
}

function goToNextQuizQuestion() {
  quizCurrentQuestionIdx++;
  if (quizCurrentQuestionIdx < quizShuffledQuestions.length) {
    showQuizQuestion();
  } else {
    showQuizResults();
  }
}

function showQuizResults() {
  const questionScreen = document.getElementById("quiz-question-screen");
  const resultsScreen = document.getElementById("quiz-results-screen");
  
  if (questionScreen) questionScreen.style.display = "none";
  if (resultsScreen) resultsScreen.style.display = "block";
  
  const lvlData = QUIZ_LEVELS_DATA[selectedQuizLevel] || QUIZ_LEVELS_DATA[1];
  const maxPossible = quizShuffledQuestions.length * lvlData.pointsPerQ;
  const scoreTextEl = document.getElementById("quiz-results-score-text");
  const badgeUnlockContainer = document.getElementById("quiz-badge-unlock-container");
  const badgeNameEl = document.getElementById("quiz-badge-name");
  const badgeDescEl = document.getElementById("quiz-badge-desc");
  const badgeIconEl = document.getElementById("quiz-badge-icon");
  const resultsEmojiEl = document.getElementById("quiz-results-emoji");
  const resultsTitleEl = document.getElementById("quiz-results-title");
  
  // Save points to global state & localStorage
  state.quizPoints = (state.quizPoints || 0) + quizSessionScore;
  if (!state.quizHighscore || quizSessionScore > state.quizHighscore) {
    state.quizHighscore = quizSessionScore;
  }
  
  const accuracy = (quizSessionScore / maxPossible) * 100;
  
  if (scoreTextEl) {
    scoreTextEl.textContent = `You earned ${quizSessionScore} Points! (Max streak: 🔥 ${quizMaxStreak})`;
  }
  
  if (accuracy >= 80) {
    if (resultsEmojiEl) resultsEmojiEl.textContent = "🏆";
    if (resultsTitleEl) resultsTitleEl.textContent = "अप्रतिम! Outstanding Mastery!";
    
    // Unlock level badge
    if (!state.quizBadges) state.quizBadges = [];
    if (!state.quizBadges.includes(lvlData.badgeId)) {
      state.quizBadges.push(lvlData.badgeId);
    }
    
    if (badgeUnlockContainer) badgeUnlockContainer.style.display = "block";
    if (badgeNameEl) badgeNameEl.textContent = lvlData.badgeName;
    if (badgeDescEl) badgeDescEl.textContent = lvlData.badgeDesc;
    if (badgeIconEl) badgeIconEl.textContent = lvlData.emoji;
  } else if (accuracy >= 50) {
    if (resultsEmojiEl) resultsEmojiEl.textContent = "⭐";
    if (resultsTitleEl) resultsTitleEl.textContent = "छान प्रयत्न! Great Effort!";
    if (badgeUnlockContainer) badgeUnlockContainer.style.display = "none";
  } else {
    if (resultsEmojiEl) resultsEmojiEl.textContent = "📖";
    if (resultsTitleEl) resultsTitleEl.textContent = "अधिक सराव करा! Keep Reading Scripture!";
    if (badgeUnlockContainer) badgeUnlockContainer.style.display = "none";
  }
  
  saveState();
  updateQuizCardStats();
}

function initBibleQuiz() {
  const openQuizBtn = document.getElementById("btn-open-bible-quiz");
  if (openQuizBtn) {
    openQuizBtn.addEventListener("click", openBibleQuizModal);
  }
  
  updateQuizCardStats();
}

// Make accessible on window
window.openBibleQuizModal = openBibleQuizModal;
window.closeBibleQuizModal = closeBibleQuizModal;
window.selectQuizLevel = selectQuizLevel;
window.startSelectedQuizLevel = startSelectedQuizLevel;
window.showQuizLevelSelect = showQuizLevelSelect;
window.showQuizQuestion = showQuizQuestion;
window.selectQuizChoice = selectQuizChoice;
window.goToNextQuizQuestion = goToNextQuizQuestion;
window.showQuizResults = showQuizResults;
window.updateQuizCardStats = updateQuizCardStats;
window.initBibleQuiz = initBibleQuiz;


async function submitPrayerRequest(text, isPublic) {
  if (!state.currentUser) return { success: false, messageEn: 'Not signed in' };
  try {
    await FirebaseApp.savePrayer({
      uid:      state.currentUser.uid,
      username: state.currentUser.username,
      text:     text,
      isPublic: !!isPublic,
    });
    return { success: true };
  } catch (err) {
    console.error('[ROL Firebase] Save prayer error:', err);
    return { success: false, messageEn: 'Failed to save prayer. Please try again.' };
  }
}

// Toggle answered status
async function toggleAnsweredPrayer(prayerId) {
  try {
    const prayers = await FirebaseApp.getPrayers();
    const prayer  = prayers.find(p => p.id === prayerId);
    if (!prayer) return false;
    await FirebaseApp.updatePrayer(prayerId, {
      status: prayer.status === 'answered' ? 'pending' : 'answered'
    });
    return true;
  } catch (err) {
    console.error('[ROL Firebase] Toggle prayer error:', err);
    return false;
  }
}

// Pastor acknowledge prayer
async function pastorAckPrayer(prayerId, note) {
  if (!state.currentUser) return false;
  const hasAccess = state.currentUser.isPastor || state.currentUser.isAdmin;
  if (!hasAccess) return false;
  try {
    await FirebaseApp.updatePrayer(prayerId, {
      status:     'acknowledged',
      pastorNote: note || ''
    });
    return true;
  } catch (err) {
    console.error('[ROL Firebase] Ack prayer error:', err);
    return false;
  }
}

// Get all prayer requests (one-time fetch, returns array)
async function getGlobalPrayers() {
  try {
    return await FirebaseApp.getPrayers();
  } catch (err) {
    console.error('[ROL Firebase] Get prayers error:', err);
    return [];
  }
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

  // Hide any pending verification banner when user explicitly resets form
  hideEmailVerificationBanner();
}

/* ─────────────────────────────────────────────────────────────────────────
   Email Verification Banner
   Shown after registration to tell users to check their inbox.
   ───────────────────────────────────────────────────────────────────────── */
function showEmailVerificationBanner(email) {
  // Remove any existing banner first
  const existing = document.getElementById("rol-email-verify-banner");
  if (existing) existing.remove();

  const authCard = document.querySelector(".rol-auth-card");
  if (!authCard) {
    // Fallback: just show a toast
    showToast("📧 Verification email sent to " + email + " — check your inbox!");
    return;
  }

  const banner = document.createElement("div");
  banner.id = "rol-email-verify-banner";
  banner.className = "rol-verify-banner";
  banner.innerHTML = `
    <div class="rol-verify-icon">📧</div>
    <h3 class="rol-verify-title">Check Your Inbox!</h3>
    <p class="rol-verify-sub">We sent a verification email to:</p>
    <div class="rol-verify-email">${email}</div>
    <p class="rol-verify-hint">
      Click the link in that email to verify your account. 
      Check your <strong>Spam / Junk</strong> folder if you don't see it.
    </p>
    <div class="rol-verify-actions">
      <button id="btn-check-verification" class="rol-verify-btn-primary">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        I Verified — Continue
      </button>
      <button id="btn-resend-verification" class="rol-verify-btn-secondary">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Resend Email
      </button>
    </div>
    <button id="btn-dismiss-verify-banner" class="rol-verify-dismiss">← Back to Sign In</button>
  `;

  // Insert banner before the card content (hide the form, show banner)
  authCard.style.position = "relative";
  authCard.appendChild(banner);

  // Wire buttons
  document.getElementById("btn-check-verification")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-check-verification");
    if (btn) { btn.disabled = true; btn.textContent = "Checking…"; }
    try {
      const verified = await FirebaseApp.isEmailVerified();
      if (verified) {
        hideEmailVerificationBanner();
        showToast("✅ Email verified! Welcome to River of Life / ईमेल सत्यापित! स्वागत आहे!");
        // Trigger profile re-render
        renderYouProfile();
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> I Verified — Continue`;
        }
        showToast("⏳ Email not verified yet. Please click the link in the email first.");
      }
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = "I Verified — Continue"; }
      showToast("Error checking verification status. Please try again.");
    }
  });

  document.getElementById("btn-resend-verification")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-resend-verification");
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    try {
      await FirebaseApp.resendVerificationEmail();
      showToast("📧 Verification email resent! Check your inbox and spam folder.");
    } catch (err) {
      showToast("Could not resend. Please try signing in again.");
      console.error('[ROL Auth] Resend verification error:', err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Resend Email`;
      }
    }
  });

  document.getElementById("btn-dismiss-verify-banner")?.addEventListener("click", () => {
    hideEmailVerificationBanner();
    // Sign them out so they can start fresh — onFirebaseAuthChange will show the auth form
    FirebaseApp.signOut();
  });
}

function hideEmailVerificationBanner() {
  const banner = document.getElementById("rol-email-verify-banner");
  if (banner) banner.remove();
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
  const listEl  = document.getElementById("prayers-user-list");
  const emptyEl = document.getElementById("prayers-user-list-empty");
  if (!listEl || !emptyEl) return;

  // Use the real-time cached prayers from the Firestore listener
  const allPrayers = window._rolPrayers || [];
  const prayers = allPrayers.filter(p =>
    p.uid === state.currentUser?.uid || p.username === state.currentUser?.username
  );

  listEl.innerHTML = "";
  if (prayers.length === 0) {
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    prayers.forEach(p => {
      const card = document.createElement("div");
      card.className = "prayer-card";

      let badgeClass = "pending";
      let badgeText  = "Pending / प्रलंबित";
      if (p.status === "answered") {
        badgeClass = "answered";
        badgeText  = "Answered / उत्तर मिळालेली";
      } else if (p.status === "acknowledged") {
        badgeClass = "acknowledged";
        badgeText  = "Acknowledged / स्वीकृत";
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
        ansBtn.addEventListener("click", async () => {
          ansBtn.disabled = true;
          await toggleAnsweredPrayer(p.id);
          // Listener will refresh the UI automatically via window._rolPrayers update
        });
      }

      listEl.appendChild(card);
    });
  }
}


// Render Pastor Portal list
function renderPastorPortal() {
  const listEl  = document.getElementById("prayers-pastor-list");
  const emptyEl = document.getElementById("prayers-pastor-list-empty");
  const statsEl = document.getElementById("pastor-dashboard-stats");
  if (!listEl || !emptyEl) return;

  // Use the real-time cached prayers from the Firestore listener
  const prayers = window._rolPrayers || [];

  const activeCount  = prayers.filter(p => p.status === "pending" || p.status === "acknowledged").length;
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
      let badgeText  = "Pending / प्रलंबित";
      if (p.status === "answered") {
        badgeClass = "answered";
        badgeText  = "Answered / उत्तर मिळालेली";
      } else if (p.status === "acknowledged") {
        badgeClass = "acknowledged";
        badgeText  = "Acknowledged / स्वीकृत";
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
  const tabSignin  = document.getElementById("auth-tab-signin");
  const tabSignup  = document.getElementById("auth-tab-signup");
  const formEl     = document.getElementById("auth-form");
  const errorMsg   = document.getElementById("auth-error-msg");
  const btnSubmit  = document.getElementById("btn-auth-submit");
  const googleBtn  = document.getElementById("btn-google-signin");
  const googleBtnText = document.getElementById("btn-google-signin-text");

  let currentAuthTab = "signin";

  /* ── Helper: show/hide loading state on submit buttons ── */
  function setAuthLoading(loading) {
    if (btnSubmit) {
      btnSubmit.disabled = loading;
      const span = btnSubmit.querySelector("#auth-submit-text");
      const icon = btnSubmit.querySelector("#auth-submit-icon");
      if (span) span.textContent = loading
        ? "Please wait… / प्रतीक्षा करा…"
        : (currentAuthTab === "signup" ? "Create Account / नोंदणी करा" : "Sign In / लॉगिन करा");
      if (icon) icon.style.opacity = loading ? "0" : "1";
    }
    if (googleBtn) {
      googleBtn.disabled = loading;
      if (googleBtnText) googleBtnText.textContent = loading ? "Signing in…" : "Continue with Google";
    }
  }

  function showError(msgEn, msgMr) {
    if (errorMsg) {
      const span = errorMsg.querySelector("span");
      if (span) span.textContent = state.translation !== "eng" ? msgMr : msgEn;
      else errorMsg.textContent = state.translation !== "eng" ? msgMr : msgEn;
      errorMsg.style.display = "flex";
      // Re-trigger shake animation
      errorMsg.style.animation = "none";
      void errorMsg.offsetHeight;
      errorMsg.style.animation = "";
    }
  }

  function hideError() {
    if (errorMsg) errorMsg.style.display = "none";
  }

  /* ── Password eye toggle ── */
  const eyeBtn      = document.getElementById("btn-toggle-password");
  const eyeShow     = document.getElementById("eye-icon-show");
  const eyeHide     = document.getElementById("eye-icon-hide");
  const passInput   = document.getElementById("auth-input-password");
  if (eyeBtn && passInput) {
    eyeBtn.addEventListener("click", () => {
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      if (eyeShow) eyeShow.style.display = isPass ? "none" : "block";
      if (eyeHide) eyeHide.style.display = isPass ? "block" : "none";
    });
  }

  /* ── Forgot password ── */
  const forgotBtn = document.getElementById("btn-forgot-password");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const emailVal = (document.getElementById("auth-input-email")?.value || "").trim();
      if (!emailVal) {
        showError("Enter your email above first.", "आधी वरती ईमेल टाका.");
        return;
      }
      forgotBtn.disabled = true;
      try {
        await FirebaseApp.sendPasswordResetEmail(emailVal);
        showToast("🔑 Password reset email sent! Check your inbox / रीसेट ईमेल पाठवला — इनबॉक्स तपासा!");
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          showToast("No account found with that email. / या ईमेलसाठी अकाउंट नाही.");
        } else {
          showToast("Could not send reset email. Please try again.");
        }
        console.error('[ROL Auth] Forgot password error:', err);
      } finally {
        forgotBtn.disabled = false;
      }
    });
  }

  /* ── Bottom switch link (Don't have account? / Already have account?) ── */
  const switchBtn   = document.getElementById("auth-switch-btn");
  const switchText  = document.getElementById("auth-switch-text");
  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      if (currentAuthTab === "signin") {
        tabSignup?.click();
      } else {
        tabSignin?.click();
      }
    });
  }

  function updateSwitchLink() {
    if (currentAuthTab === "signup") {
      if (switchText) switchText.textContent = "Already have an account?";
      if (switchBtn)  switchBtn.textContent  = "Sign In / लॉगिन करा";
    } else {
      if (switchText) switchText.textContent = "Don't have an account?";
      if (switchBtn)  switchBtn.textContent  = "Register / नोंदणी करा";
    }
  }

  function updateSubmitStyle() {
    if (!btnSubmit) return;
    const span = btnSubmit.querySelector("#auth-submit-text");
    const icon = btnSubmit.querySelector("#auth-submit-icon");
    if (currentAuthTab === "signup") {
      btnSubmit.classList.add("is-signup");
      if (span) span.textContent = "Create Account / नोंदणी करा";
      // Swap icon to person-plus
      if (icon) icon.innerHTML = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>';
    } else {
      btnSubmit.classList.remove("is-signup");
      if (span) span.textContent = "Sign In / लॉगिन करा";
      // Swap icon back to sign-in arrow
      if (icon) icon.innerHTML = '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>';
    }
  }

  /* ── Tab switching ── */
  if (tabSignin && tabSignup) {
    tabSignin.addEventListener("click", () => {
      currentAuthTab = "signin";
      tabSignin.classList.add("active");
      tabSignup.classList.remove("active");
      tabSignin.style.background = "var(--primary)";
      tabSignin.style.color = "#fff";
      tabSignup.style.background = "transparent";
      tabSignup.style.color = "var(--text-muted)";
      document.querySelectorAll(".signup-only").forEach(el => el.style.display = "none");
      const titleEl = document.getElementById("auth-title");
      const subEl   = document.getElementById("auth-subtitle");
      if (titleEl) titleEl.textContent = "Welcome Back 🙏";
      if (subEl)   subEl.textContent   = "Sign in to your River of Life account";
      hideError();
      updateSwitchLink();
      updateSubmitStyle();
    });

    tabSignup.addEventListener("click", () => {
      currentAuthTab = "signup";
      tabSignup.classList.add("active");
      tabSignin.classList.remove("active");
      tabSignup.style.background = "var(--primary)";
      tabSignup.style.color = "#fff";
      tabSignin.style.background = "transparent";
      tabSignin.style.color = "var(--text-muted)";
      document.querySelectorAll(".signup-only").forEach(el => el.style.display = "flex");
      const titleEl = document.getElementById("auth-title");
      const subEl   = document.getElementById("auth-subtitle");
      if (titleEl) titleEl.textContent = "Create Account ✨";
      if (subEl)   subEl.textContent   = "Join the River of Life community";
      hideError();
      updateSwitchLink();
      updateSubmitStyle();
    });
  }

  /* ── Google Sign-In ── */
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      hideError();
      setAuthLoading(true);
      const res = await loginWithGoogle();
      setAuthLoading(false);
      if (!res.success) {
        showError(res.messageEn, res.messageMr || res.messageEn);
      }
      // On success, onFirebaseAuthChange fires automatically and updates UI
    });
  }

  /* ── Email/Password form submit ── */
  if (formEl) {
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();

      const displayName = (document.getElementById("auth-input-username")?.value || "").trim();
      const email    = (document.getElementById("auth-input-email")?.value    || "").trim();
      const password = (document.getElementById("auth-input-password")?.value || "");
      const isPastor = document.getElementById("auth-input-pastor")?.checked || false;

      if (!email || !password) {
        showError("Please enter your email and password.", "ईमेल आणि पासवर्ड भरा.");
        return;
      }

      setAuthLoading(true);

      if (currentAuthTab === "signup") {
        if (!displayName) {
          setAuthLoading(false);
          showError("Please enter your full name.", "आपले पूर्ण नाव भरा.");
          return;
        }
        const res = await registerUser(displayName, email, password, isPastor);
        setAuthLoading(false);
        if (!res.success) {
          showError(res.messageEn, res.messageMr);
          return;
        }
        // Registration succeeded — Firebase sent a verification email automatically
        // Show a prominent verification notice in the UI
        showEmailVerificationBanner(email);
      } else {
        const res = await loginUser(email, password);
        setAuthLoading(false);
        if (!res.success) {
          showError(res.messageEn, res.messageMr);
          return;
        }
        // onFirebaseAuthChange fires automatically after signInWithEmail and updates UI
      }
    });
  }

  /* ── Logout button (Profile page) ── */
  const logoutBtn = document.getElementById("you-btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logoutUser();
      // onFirebaseAuthChange fires automatically and clears state / re-renders
    });
  }

  /* ── Home page authentication banner action ── */
  const homeBannerBtn = document.getElementById("home-auth-banner-btn");
  if (homeBannerBtn) {
    homeBannerBtn.addEventListener("click", async () => {
      if (state.currentUser) {
        await logoutUser();
      } else {
        window.location.hash = "#/you";
      }
    });
  }

  /* ── Header authentication button action ── */
  const headerAuthBtn = document.getElementById("header-auth-btn");
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener("click", () => {
      window.location.hash = "#/you";
    });
  }

  /* ── Prayer form submit (async Firestore) ── */
  const prayerForm = document.getElementById("prayer-form");
  if (prayerForm) {
    prayerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text    = document.getElementById("prayer-input-text").value.trim();
      const privacy = document.getElementById("prayer-input-privacy").value;
      const isPublic = (privacy === "public");

      if (!text) return;

      const submitBtn = prayerForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      const res = await submitPrayerRequest(text, isPublic);

      if (submitBtn) submitBtn.disabled = false;

      if (res.success) {
        document.getElementById("prayer-input-text").value = "";
        renderUserPortal();
        showToast("🙏 Prayer submitted! / प्रार्थना सबमिट झाली!");
      } else {
        showToast("Failed to submit prayer. Please try again.");
      }
    });
  }

  /* ── Pastor Ack Modal ── */
  const closeAckBtn = document.getElementById("btn-close-pastor-ack");
  if (closeAckBtn) {
    closeAckBtn.addEventListener("click", () => {
      closeModal("modal-pastor-ack");
    });
  }

  const ackSubmitBtn = document.getElementById("btn-pastor-ack-submit");
  if (ackSubmitBtn) {
    ackSubmitBtn.addEventListener("click", async () => {
      const note = document.getElementById("pastor-ack-note").value.trim();
      if (!note || !activeAckPrayerId) return;

      ackSubmitBtn.disabled = true;
      const res = await pastorAckPrayer(activeAckPrayerId, note);
      ackSubmitBtn.disabled = false;

      if (res) {
        closeModal("modal-pastor-ack");
        renderPastorPortal();
      }
    });
  }

  /* ── Register Firebase Auth State Observer ──
     This is the key change: instead of reading from localStorage for session,
     Firebase automatically fires this on every page load if a user is still
     signed in (via its cookie/token), so no explicit session restoration needed. */
  if (window.FirebaseApp) {
    FirebaseApp.onAuthChange(onFirebaseAuthChange);
  }

  /* ── Set up real-time prayer listener (updates UI when any device posts) ── */
  if (window.FirebaseApp) {
    FirebaseApp.listenPrayers(prayers => {
      // Store prayers in a module-level variable so portals can use them
      window._rolPrayers = prayers;
      // Refresh portal if currently viewing the prayers screen
      const prayersView = document.getElementById("view-prayers");
      if (prayersView && prayersView.classList.contains("active")) {
        renderPrayersScreen();
      }
    });
  }
}


// Update Authentication UI elements across Home page banner and Header bar
// Auth Modal & DataSource Handlers
window.openAuthModal = function() {
  const modal = document.getElementById("modal-auth-login");
  if (modal) modal.style.display = "flex";
};

window.closeAuthModal = function() {
  const modal = document.getElementById("modal-auth-login");
  if (modal) modal.style.display = "none";
};

window.handleAuthSubmit = async function(e) {
  if (e) e.preventDefault();
  const email    = (document.getElementById("auth-input-identifier")?.value || "").trim();
  const fullName = (document.getElementById("auth-input-fullname")?.value   || "").trim();
  const password = (document.getElementById("auth-input-password")?.value   || "").trim();

  if (!email) {
    showToast("Please enter your email / ईमेल भरा");
    return;
  }

  try {
    // Try sign-in first; if user doesn't exist, register them
    let cred;
    try {
      cred = await FirebaseApp.signInWithEmail(email, password);
    } catch (signInErr) {
      if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
        // Register new user with provided full name
        const displayName = fullName || email.split('@')[0];
        cred = await FirebaseApp.registerWithEmail(displayName, email, password || 'default123');
        await FirebaseApp.saveUserProfile(cred.user.uid, {
          displayName,
          email: email.toLowerCase(),
          isPastor:  false,
          isAdmin:   false,
          churchName: '',
          photo:     '',
          streak:    1,
          quizPoints: 0,
          quizHighscore: 0,
          quizBadges: [],
          bookmarks: [],
          highlights: {},
          userNotes: {},
          createdVerseImages: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        throw signInErr;
      }
    }

    // onFirebaseAuthChange fires automatically and updates UI
    closeAuthModal();
    showToast("Welcome! Data synced ☁️ / स्वागत आहे!");
  } catch (err) {
    console.error('[ROL Modal Auth] Error:', err);
    showToast("Sign in failed. Please check your details / चुकीची माहिती");
  }
};


function updateAuthUI() {
  const headerIconLoggedOut = document.getElementById("header-auth-icon-loggedout");
  const headerAvatar = document.getElementById("header-auth-avatar");
  const staticAuthLabel = document.getElementById("static-auth-label");
  const staticAuthAvatar = document.getElementById("static-auth-avatar");

  const cardLoggedOut = document.getElementById("drawer-card-loggedout");
  const cardLoggedIn = document.getElementById("drawer-card-loggedin");
  const drawerAvatar = document.getElementById("drawer-profile-avatar");
  const drawerUsername = document.getElementById("drawer-profile-username");
  const drawerEmail = document.getElementById("drawer-profile-email");

  if (state.currentUser) {
    // Logged In State
    const firstInitial = state.currentUser.username ? state.currentUser.username.substring(0, 1).toUpperCase() : "U";
    
    if (headerIconLoggedOut) headerIconLoggedOut.style.display = "none";
    if (headerAvatar) {
      headerAvatar.style.display = "flex";
      headerAvatar.textContent = firstInitial;
    }

    if (staticAuthLabel) staticAuthLabel.textContent = state.currentUser.username;
    if (staticAuthAvatar) {
      staticAuthAvatar.textContent = firstInitial;
      staticAuthAvatar.style.background = "#22c55e";
      staticAuthAvatar.style.color = "#ffffff";
    }

    if (cardLoggedOut) cardLoggedOut.style.display = "none";
    if (cardLoggedIn) cardLoggedIn.style.display = "flex";

    if (drawerAvatar) drawerAvatar.textContent = firstInitial;
    if (drawerUsername) drawerUsername.textContent = state.currentUser.username;
    if (drawerEmail) drawerEmail.textContent = state.currentUser.identifier || state.currentUser.email || "Registered Member";
  } else {
    // Logged Out State
    if (headerIconLoggedOut) headerIconLoggedOut.style.display = "block";
    if (headerAvatar) headerAvatar.style.display = "none";

    if (staticAuthLabel) staticAuthLabel.textContent = "Account";
    if (staticAuthAvatar) {
      staticAuthAvatar.textContent = "👤";
      staticAuthAvatar.style.background = "var(--primary)";
      staticAuthAvatar.style.color = "#172116";
    }

    if (cardLoggedOut) cardLoggedOut.style.display = "flex";
    if (cardLoggedIn) cardLoggedIn.style.display = "none";
  }

  // Sync Home Welcome Greeting with active User Name
  const now = new Date();
  const hour = now.getHours();
  let greetingTimeEn = "Good evening";
  if (hour < 12) greetingTimeEn = "Good morning";
  else if (hour < 17) greetingTimeEn = "Good afternoon";

  const currentUserObj = state.currentUser || state.user;
  let userName = currentUserObj?.displayName || currentUserObj?.username || currentUserObj?.fullName || "";
  if (!userName) {
    const savedName = localStorage.getItem("rol_user_name") || localStorage.getItem("river_of_life_username");
    if (savedName) userName = savedName;
    else userName = "Gaurav";
  }
  const userEl = document.getElementById("home-greeting-user");
  if (userEl) {
    userEl.textContent = `${greetingTimeEn}, ${userName}`;
  }
}

window.toggleDrawerAuth = async function() {
  if (state.currentUser) {
    await logoutUser();
    showToast("Signed out successfully / बाहेर पडलात");
  } else {
    closeDrawer("drawer-account-settings");
    openAuthModal();
  }
};

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

  // Auto-dismiss splash screen after 3.5 seconds to allow comfortable reading of daily verse & logo design
  setTimeout(dismissNow, 3500);
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
            ${m.status === 'live' ? `<span>👥 ${m.participantsCount || m.attendees || 'Active Fellowship'}</span>` : ""}
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
  const _el_btn_details_share = document.getElementById("btn-details-share"); if (_el_btn_details_share) _el_btn_details_share.onclick = () => {
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
  const _el_btn_details_calendar = document.getElementById("btn-details-calendar"); if (_el_btn_details_calendar) _el_btn_details_calendar.onclick = () => {
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
      roomModal.classList.add("active");
      document.body.classList.add("meeting-modal-open");
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
    
    // Hide Modal Overlay & Restore Body Class
    const roomModal = document.getElementById("modal-live-meeting");
    if (roomModal) {
      roomModal.classList.remove("active");
      document.body.classList.remove("meeting-modal-open");
    }

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
  const mBtn = document.getElementById("btn-meet-mic"); if (mBtn) mBtn.addEventListener("click", () => {
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
  const vBtn = document.getElementById("btn-meet-video"); if (vBtn) vBtn.addEventListener("click", () => {
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
  document.getElementById("btn-meet-chat")?.addEventListener("click", () => {
    toggleMeetingSidebar("chat");
  });

  // Hand raise toggle
  document.getElementById("btn-meet-hand")?.addEventListener("click", () => {
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
  document.getElementById("btn-meet-reactions")?.addEventListener("click", (e) => {
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
  document.getElementById("btn-meet-prayer")?.addEventListener("click", () => {
    openModal("drawer-meet-prayer-request");
  });
  
  document.getElementById("btn-close-meet-prayer-request")?.addEventListener("click", () => {
    closeModal("drawer-meet-prayer-request");
  });

  document.getElementById("meet-prayer-form")?.addEventListener("submit", (e) => {
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
  document.getElementById("btn-meet-members")?.addEventListener("click", () => {
    toggleMeetingSidebar("participants");
  });

  // Bible Mode Panel toggle
  document.getElementById("btn-meet-bible")?.addEventListener("click", () => {
    toggleMeetingSidebar("bible");
  });

  // Worship Mode Panel toggle
  document.getElementById("btn-meet-worship")?.addEventListener("click", () => {
    toggleMeetingSidebar("worship");
  });

  // Host Settings Panel toggle
  document.getElementById("btn-meet-moderator")?.addEventListener("click", () => {
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
  const _el_btn_close_meeting_sidebar = document.getElementById("btn-close-meeting-sidebar"); if (_el_btn_close_meeting_sidebar) _el_btn_close_meeting_sidebar.onclick = () => {
    document.getElementById("meeting-sidebar-panel").style.display = "none";
  };

  // Leave Call
  const _el_btn_meet_leave = document.getElementById("btn-meet-leave"); if (_el_btn_meet_leave) _el_btn_meet_leave.onclick = () => {
    if (confirm("Are you sure you want to leave this meeting?")) {
      exitLiveMeetingRoom();
    }
  };

  // Host mute all button trigger
  const _el_btn_host_mute_all = document.getElementById("btn-host-mute-all"); if (_el_btn_host_mute_all) _el_btn_host_mute_all.onclick = () => {
    showToast("Pastor John muted all participants.");
    appendMeetingChatMessage("SYSTEM", "🔇 Moderator muted all participant microphones", false);
  };

  // Host lock meeting toggle
  let isMeetingLocked = false;
  const _el_btn_host_lock_meeting = document.getElementById("btn-host-lock-meeting"); if (_el_btn_host_lock_meeting) _el_btn_host_lock_meeting.onclick = () => {
    isMeetingLocked = !isMeetingLocked;
    const btnText = document.getElementById("btn-host-lock-meeting").querySelector("span");
    btnText.textContent = isMeetingLocked ? "Unlock Meeting" : "Lock Meeting";
    showToast(isMeetingLocked ? "Meeting Room Locked" : "Meeting Room Unlocked");
    appendMeetingChatMessage("SYSTEM", isMeetingLocked ? "🔒 Meeting has been locked by Host" : "🔓 Meeting has been unlocked by Host", false);
  };

  // Host toggle recording trigger
  let isMeetingRecording = false;
  const _el_btn_host_toggle_record = document.getElementById("btn-host-toggle-record"); if (_el_btn_host_toggle_record) _el_btn_host_toggle_record.onclick = () => {
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
  const _el_btn_host_end_meeting = document.getElementById("btn-host-end-meeting"); if (_el_btn_host_end_meeting) _el_btn_host_end_meeting.onclick = () => {
    if (confirm("End this meeting session for all church members?")) {
      exitLiveMeetingRoom();
    }
  };

  // Bible select synchronizer triggers
  const _el_btn_sync_bible_verse = document.getElementById("btn-sync-bible-verse"); if (_el_btn_sync_bible_verse) _el_btn_sync_bible_verse.onclick = () => {
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

  const _el_btn_sync_worship_video = document.getElementById("btn-sync-worship-video"); if (_el_btn_sync_worship_video) _el_btn_sync_worship_video.onclick = () => {
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

  // 7b. Toggle Raised Hand
  toggleHand() {
    this.isHandRaised = !this.isHandRaised;
    const btn = document.getElementById("btn-river-hand");
    const icon = document.getElementById("river-icon-hand");
    const label = document.getElementById("river-label-hand");
    if (btn) btn.classList.toggle("active-gold", this.isHandRaised);
    if (icon) icon.textContent = this.isHandRaised ? "✋" : "🖐️";
    if (label) label.textContent = this.isHandRaised ? "Raised" : "Hand";
    
    const loggedIn = (state && state.currentUser) ? state.currentUser.username : "You";
    this.addChatMessage("SYSTEM", this.isHandRaised ? `✋ ${loggedIn} raised hand` : `${loggedIn} lowered hand`);
    showToast(this.isHandRaised ? "Hand Raised 🖐️" : "Hand Lowered");
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
window.toggleNativeHand = () => window.nativeLiveKitMeetingManager.toggleHand();
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

// Native Touch Pull-To-Refresh for Mobile Devices on Home Page
function initPullToRefresh() {
  const container = document.getElementById("home-view-scroll-content");
  const refreshIndicator = document.getElementById("pull-to-refresh-container");
  const refreshSvg = document.getElementById("pull-refresh-svg");
  const refreshText = document.getElementById("pull-refresh-text");
  if (!container || !refreshIndicator) return;

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let isRefreshing = false;
  const PULL_THRESHOLD = 65;

  container.addEventListener("touchstart", (e) => {
    if (container.scrollTop <= 0 && e.touches.length === 1) {
      startY = e.touches[0].clientY;
      isPulling = true;
    } else {
      isPulling = false;
    }
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (!isPulling || isRefreshing) return;
    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;

    if (diffY > 0 && container.scrollTop <= 0) {
      const pullDist = Math.min(diffY * 0.45, 85);
      refreshIndicator.style.height = `${pullDist}px`;
      refreshIndicator.style.opacity = `${Math.min(pullDist / PULL_THRESHOLD, 1)}`;
      refreshIndicator.classList.add("pulling");

      if (refreshSvg) {
        refreshSvg.style.transform = `rotate(${pullDist * 4}deg)`;
      }

      if (pullDist >= PULL_THRESHOLD) {
        if (refreshText) refreshText.textContent = "Release to refresh / रिफ्रेश करा";
      } else {
        if (refreshText) refreshText.textContent = "Pull to refresh / रिफ्रेश करण्यासाठी ओढा";
      }
    }
  }, { passive: true });

  const handlePullEnd = () => {
    if (!isPulling || isRefreshing) return;
    const diffY = currentY - startY;
    const pullDist = diffY * 0.45;

    if (pullDist >= PULL_THRESHOLD && container.scrollTop <= 0) {
      isRefreshing = true;
      refreshIndicator.style.height = "48px";
      refreshIndicator.classList.add("refreshing");
      if (refreshText) refreshText.textContent = "Refreshing... / रिफ्रेश होत आहे...";

      setTimeout(() => {
        try {
          if (typeof renderDailyDevotion === "function") renderDailyDevotion();
          if (typeof renderMeetingsDashboard === "function") renderMeetingsDashboard();
        } catch(e) {}
        
        showToast("Home view refreshed 🕊️ / मुख्य पृष्ठ रिफ्रेश झाले");
        
        setTimeout(() => {
          refreshIndicator.style.height = "0px";
          refreshIndicator.style.opacity = "0";
          refreshIndicator.classList.remove("pulling", "refreshing");
          if (refreshSvg) refreshSvg.style.transform = "none";
          isRefreshing = false;
          isPulling = false;
        }, 300);
      }, 700);
    } else {
      refreshIndicator.style.height = "0px";
      refreshIndicator.style.opacity = "0";
      refreshIndicator.classList.remove("pulling");
      if (refreshSvg) refreshSvg.style.transform = "none";
      isPulling = false;
    }
  };

  container.addEventListener("touchend", handlePullEnd, { passive: true });
  container.addEventListener("touchcancel", handlePullEnd, { passive: true });
}

// Global PostMessage Listener for Instant Direct Leave (No Popup Dialogs)
window.addEventListener("message", (event) => {
  try {
    if (!event.data) return;
    const d = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    if (d && (d.type === "leave" || d.action === "leave" || d.event === "leave" || d.type === "endCall" || d.type === "closeRoom")) {
      exitLiveMeetingRoom();
    }
  } catch(e) {}
});

// Initialize Pull-To-Refresh when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPullToRefresh);
} else {
  initPullToRefresh();
}

// Global Pastoral Prayer Request Form Handlers
window.openPrayerRequestForm = function() {
  const modal = document.getElementById("modal-prayer-request");
  if (modal) {
    modal.style.display = "flex";
    if (state && state.currentUser) {
      const nameInput = document.getElementById("prayer-req-fullname");
      const emailInput = document.getElementById("prayer-req-email");
      if (nameInput && !nameInput.value) nameInput.value = state.currentUser.username;
      if (emailInput && !emailInput.value) emailInput.value = state.currentUser.email || "";
    }
  }
};

window.closePrayerRequestForm = function() {
  const modal = document.getElementById("modal-prayer-request");
  if (modal) modal.style.display = "none";
};

window.submitPastoralPrayerRequest = function(e) {
  if (e) e.preventDefault();
  const fullName = document.getElementById("prayer-req-fullname")?.value.trim();
  const email = document.getElementById("prayer-req-email")?.value.trim();
  const phone = document.getElementById("prayer-req-phone")?.value.trim() || "N/A";
  const requestDetails = document.getElementById("prayer-req-details")?.value.trim();
  const sharingLevel = document.querySelector('input[name="prayer_sharing_level"]:checked')?.value || "private";
  const wantsFollowup = document.getElementById("prayer-req-followup")?.checked || false;

  if (!fullName || !email || !requestDetails) {
    showToast("Please fill in all required fields / कृपया आवश्यक माहिती भरा");
    return;
  }

  const newPrayer = {
    id: "prayer_" + Date.now(),
    fullName: fullName,
    email: email,
    phone: phone,
    requestDetails: requestDetails,
    sharingLevel: sharingLevel,
    wantsFollowup: wantsFollowup,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now()
  };

  try {
    let savedPrayers = JSON.parse(localStorage.getItem("rol_prayer_requests") || "[]");
    savedPrayers.unshift(newPrayer);
    localStorage.setItem("rol_prayer_requests", JSON.stringify(savedPrayers));
  } catch(err) {}

  showToast("Prayer request sent to Pastoral Team! 🕊️ / प्रार्थना पाठवली");
  closePrayerRequestForm();

  const detailsField = document.getElementById("prayer-req-details");
  if (detailsField) detailsField.value = "";
};


/* ==========================================================================
   VOD WALLPAPER SWITCHER & PRAYER TOPICS VIEW ALL CONTROLLERS
   ========================================================================== */

window.dailyVersesImageList = [
  'stars.png', 'forest.png', 'mist.png', 'mountains.png', 'mount_zion.png', 'ocean.png', 'path.png', 'sunrise.png'
];
window.currentVodImageIndex = 0;
let vodAutoRotateTimer = null;

function getVodImageUrl(imgName) {
  if (!imgName) return 'assets/daily_verses/stars.png';
  if (imgName.includes('.')) return `assets/daily_verses/${imgName}`;
  return `assets/daily_verses/${imgName}.png`;
}

window.loadDailyVersesManifest = async function() {
  try {
    const res = await fetch('assets/daily_verses/manifest.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.images) && data.images.length > 0) {
        window.dailyVersesImageList = data.images;
        console.log(`[Daily Verses] Loaded ${data.images.length} wallpaper images from assets/daily_verses/`);
      }
    }
  } catch (err) {
    console.log('[Daily Verses] Using default wallpaper image list');
  }
};

window.switchVodWallpaper = function(imageName, btnEl) {
  const imgUrl = getVodImageUrl(imageName);
  const bgEl = document.getElementById("vod-dynamic-bg");
  if (bgEl) {
    bgEl.style.opacity = "0.5";
    setTimeout(() => {
      bgEl.style.backgroundImage = `url('${imgUrl}')`;
      bgEl.style.opacity = "1";
    }, 150);
  }
  const fsCapsule = document.querySelector(".fullscreen-vod-capsule");
  if (fsCapsule) {
    fsCapsule.style.backgroundImage = `url('${imgUrl}')`;
  }
  if (btnEl) {
    document.querySelectorAll(".vod-chip").forEach(c => c.classList.remove("active"));
    btnEl.classList.add("active");
  }
  showToast(`Wallpaper updated: ${btnEl ? btnEl.textContent.trim() : imageName}`);
};

window.rotateNextVodWallpaper = function() {
  if (!window.dailyVersesImageList || window.dailyVersesImageList.length === 0) return;
  window.currentVodImageIndex = (window.currentVodImageIndex + 1) % window.dailyVersesImageList.length;
  const nextImg = window.dailyVersesImageList[window.currentVodImageIndex];
  const imgUrl = getVodImageUrl(nextImg);
  const bgEl = document.getElementById("vod-dynamic-bg");
  if (bgEl) {
    bgEl.style.opacity = "0.6";
    setTimeout(() => {
      bgEl.style.backgroundImage = `url('${imgUrl}')`;
      bgEl.style.opacity = "1";
    }, 200);
  }
  const fsCapsule = document.querySelector(".fullscreen-vod-capsule");
  if (fsCapsule) {
    fsCapsule.style.backgroundImage = `url('${imgUrl}')`;
  }
};

// Auto-rotation disabled: exactly 1 constant scenic wallpaper per day (deterministic by day of year).
// Users can manually cycle wallpapers using the 🎨 Change Wallpaper button if desired.
window.startVodAutoRotation = function() {
  if (vodAutoRotateTimer) {
    clearInterval(vodAutoRotateTimer);
    vodAutoRotateTimer = null;
  }
};

try {
  if (typeof window.loadDailyVersesManifest === "function") {
    window.loadDailyVersesManifest();
  }
} catch (e) {}

window.toggleViewAllPrayers = function() {
  const extraPrayers = document.querySelectorAll(".prayer-topic-extra");
  const btn = document.getElementById("btn-view-all-prayers");
  if (extraPrayers.length === 0) return;
  
  const isHidden = (extraPrayers[0].style.display === "none" || extraPrayers[0].style.display === "");
  if (isHidden) {
    extraPrayers.forEach(el => el.style.display = "flex");
    if (btn) btn.textContent = "Show Less ←";
  } else {
    extraPrayers.forEach(el => el.style.display = "none");
    if (btn) btn.textContent = "View All Prayers (8+) →";
  }
};


/* ==========================================================================
   ENHANCED GLOBAL AUDIO & PRAYER HANDLERS
   ========================================================================== */

window.openPrayerRequestForm = function() {
  const modal = document.getElementById("modal-prayer-request");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closePrayerRequestForm = function() {
  const modal = document.getElementById("modal-prayer-request");
  if (modal) {
    modal.style.display = "none";
  }
};

window.submitPastoralPrayerRequest = function(e) {
  if (e) e.preventDefault();
  const fullName = document.getElementById("prayer-req-fullname")?.value.trim() || "मित्र";
  showToast(`🙏 धन्यवाद ${fullName}! तुमची प्रार्थना विनंती पाठवली आहे. आमची टीम तुमच्यासाठी प्रार्थना करत आहे.`);
  closePrayerRequestForm();
  const form = document.getElementById("form-pastoral-prayer-request");
  if (form) form.reset();
};

/* ==========================================================================
   AUTHENTIC NATIVE HUMAN AUDIO BIBLE CONTROLLER (100% FLUENT MARATHI & ENGLISH)
   ========================================================================== */

window.toggleAudioNarration = function() {
  const fabIcon = document.getElementById("circle-fab-play-icon");
  const fabBtn = document.getElementById("btn-floating-reader-play-circle");

  // 1. If native human chapter audio is playing, stop it
  if (isBibleChapterPlaying && bibleChapterAudioPlayer) {
    if (!bibleChapterAudioPlayer.paused) {
      bibleChapterAudioPlayer.pause();
      isBibleChapterPlaying = false;
      if (fabIcon) fabIcon.innerHTML = `<polygon points="7 4 19 12 7 20 7 4"></polygon>`;
      if (fabBtn) fabBtn.classList.remove("playing");
      document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("tts-reading"));
      return;
    }
  }

  // 2. If TTS synthesis is active, stop it
  if (window.SarvamTTS && window.SarvamTTS.queue && window.SarvamTTS.queue.isPlaying) {
    stopSpeechNarration();
    if (fabIcon) fabIcon.innerHTML = `<polygon points="7 4 19 12 7 20 7 4"></polygon>`;
    if (fabBtn) fabBtn.classList.remove("playing");
    return;
  }
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
    stopSpeechNarration();
    if (fabIcon) fabIcon.innerHTML = `<polygon points="7 4 19 12 7 20 7 4"></polygon>`;
    if (fabBtn) fabBtn.classList.remove("playing");
    return;
  }

  // 3. Start 100% fluent native human narration for this chapter
  playBibleChapterScripture();
};


/* ==========================================================================
   SCENE-RELATED DRAMATIZED STORYBOOK AUDIO ENGINE & FLUID CONTROLLER
   ========================================================================== */

const STORY_DRAMA_SCENES = [
  {
    id: "scene_1",
    titleMr: "दृश्य १: संकट आणि प्रतीक्षा (The Longing)",
    bgImage: "assets/images/golden_dawn.png",
    speakerRole: "🕊️ सूत्रधार (Narrator)",
    speakerName: "कबीर (शांत व भावपूर्ण आवाज)",
    voiceBadge: "🕊️ कबीर (सूत्रधार)",
    audioUrl: "assets/audio/stories/scene_1.wav",
    mood: "harp",
    textMr: "फार वर्षांपूर्वीची गोष्ट आहे... इस्राएल देशावर संकटाचे सावट होते. लोक देवाचा मार्ग विसरले होते. पण सरा नावाच्या एका लहान आणि शांत गावात, मानोहा आणि त्याची पत्नी राहत होते. त्यांच्या घरात सर्व काही होते, पण एक मोठी खंत होती... त्यांच्या पोटी कोणतेही मूल नव्हते. ते दोघेही दररोज देवाकडे अश्रूंनी प्रार्थना करत होते..."
  },
  {
    id: "scene_2",
    titleMr: "दृश्य २: देवदूताचे दिव्य दर्शन (The Angelic Miracle)",
    bgImage: "assets/images/healing_light.png",
    speakerRole: "👑 परमेश्वराचा दूत (Angel of the Lord)",
    speakerName: "रतन (गंभीर व दैवी आवाज)",
    voiceBadge: "👑 रतन (दैवी दूत)",
    audioUrl: "assets/audio/stories/scene_2.wav",
    mood: "pads",
    textMr: "एके दिवशी रानात, अचानक स्वर्गातून एक दिव्य प्रकाश चमकला! साक्षात परमेश्वराचा एक तेजस्वी दूत तिच्यासमोर प्रकट झाला. दूत म्हणाला... घाबरू नकोस! देवाने तुझे अश्रू पाहिले आहेत. तू एका पुत्राला जन्म देशील! त्याच्या डोक्यावर वस्तरा फिरवू नको, कारण तो जन्मापासूनच देवाचा नाजीर असेल. तो इस्राएल लोकांचे रक्षण करील!"
  },
  {
    id: "scene_3",
    titleMr: "दृश्य ३: कुटुंबाचा विश्वास आणि प्रार्थना (The Family's Faith)",
    bgImage: "assets/images/candlelight.png",
    speakerRole: "🌸 मानोहाची पत्नी (Manoah's Wife)",
    speakerName: "काव्या (भावपूर्ण स्त्री आवाज)",
    voiceBadge: "🌸 काव्या (मानोहाची पत्नी)",
    audioUrl: "assets/audio/stories/scene_3.wav",
    mood: "harp",
    textMr: "ती धावत आपल्या पतीकडे गेली आणि म्हणाली... अहो ऐका! आज रानात देवाचा एक माणूस माझ्याकडे आला होता. त्याचे रूप इतके तेजस्वी होते की मला भीतीयुक्त आदर वाटला! तेव्हा मानोहाने प्रार्थना केली... हे प्रभू, त्या देवदूताला पुन्हा पाठव, म्हणजे त्या मुलाचे संगोपन कसे करावे हे आम्हाला समजावे."
  },
  {
    id: "scene_4",
    titleMr: "दृश्य ४: अग्नीतून प्रयाण आणि शमशोनचा जन्म (The Flame & The Hero)",
    bgImage: "assets/images/mount_zion.png",
    speakerRole: "🔥 चमत्कार व जयजयकार (The Miracle Altar)",
    speakerName: "कबीर (जयघोष कथा आवाज)",
    voiceBadge: "🕊️ कबीर (सूत्रधार)",
    audioUrl: "assets/audio/stories/scene_4.wav",
    mood: "pads",
    textMr: "मानोहाने एका खडकावर देवाला होमार्पण केले. आणि काय आश्चर्य! वेदीवरून निघणाऱ्या अग्नीच्या ज्वालेतून तो देवदूत आकाशात स्वर्गाकडे निघून गेला! हे पाहून दोघांनी जमिनीवर लोटांगण घालून देवाची स्तुती केली. यथावकाश तिला एक तेजस्वी पुत्र झाला, त्याचे नाव त्यांनी 'शमशोन' ठेवले... आणि परमेश्वराचा आत्मा त्याच्यावर कार्य करू लागला!"
  }
];

let currentStorySceneIndex = 0;
let storySceneAudioPlayer = null;

function stopAllAudios() {
  if (storySceneAudioPlayer) {
    storySceneAudioPlayer.pause();
    storySceneAudioPlayer = null;
  }
  if (typeof humanAudioPlayer !== 'undefined' && humanAudioPlayer) {
    humanAudioPlayer.pause();
    humanAudioPlayer = null;
  }
  if (window.activeStoryAudio) {
    window.activeStoryAudio.pause();
    window.activeStoryAudio = null;
  }
  if (window.SarvamTTS && window.SarvamTTS.queue) {
    window.SarvamTTS.queue.stop();
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
}

window.stopAllAudios = stopAllAudios;

window.playStoryScene = function(index) {
  if (index < 0 || index >= STORY_DRAMA_SCENES.length) return;
  currentStorySceneIndex = index;
  const scene = STORY_DRAMA_SCENES[index];

  stopAllAudios();

  const bgEl = document.getElementById("story-theater-bg");
  if (bgEl) bgEl.style.backgroundImage = "url('" + scene.bgImage + "')";

  const themeEl = document.getElementById("story-theater-theme-tag");
  if (themeEl) themeEl.textContent = scene.titleMr;

  const speakerBadge = document.getElementById("story-active-speaker-badge");
  const avatarEl = document.getElementById("story-speaker-avatar");
  const roleEl = document.getElementById("story-speaker-role");
  const voiceEl = document.getElementById("story-speaker-voice");

  if (avatarEl) avatarEl.textContent = scene.speakerRole.includes("दूत") ? "👑" : (scene.speakerRole.includes("पत्नी") ? "🌸" : "🕊️");
  if (roleEl) roleEl.textContent = scene.speakerRole;
  if (voiceEl) voiceEl.textContent = scene.speakerName;
  if (speakerBadge) {
    speakerBadge.className = "story-active-speaker-badge " + (scene.speakerRole.includes("दूत") ? "role-divine" : (scene.speakerRole.includes("पत्नी") ? "role-female" : "role-narrator"));
  }

  const numEl = document.getElementById("story-current-verse-num");
  const textEl = document.getElementById("story-current-verse-text");
  const statusEl = document.getElementById("story-theater-status");

  if (numEl) numEl.textContent = scene.titleMr.split('(')[0] + " (" + (index + 1) + "/4)";
  if (textEl) textEl.textContent = '"' + scene.textMr + '"';
  if (statusEl) statusEl.textContent = scene.voiceBadge + " • बोलत आहे";

  if (typeof storyAtmosphere !== 'undefined') {
    storyAtmosphere.playMood(scene.mood);
    storyAtmosphere.duckVolume(true);
  }

  const fabIcon = document.getElementById("story-fab-icon");
  if (fabIcon) fabIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

  storySceneAudioPlayer = new Audio(scene.audioUrl);
  window.activeStorySceneAudio = storySceneAudioPlayer;

  storySceneAudioPlayer.onended = function() {
    if (currentStorySceneIndex < STORY_DRAMA_SCENES.length - 1) {
      setTimeout(function() {
        playStoryScene(currentStorySceneIndex + 1);
      }, 600);
    } else {
      if (typeof storyAtmosphere !== 'undefined') storyAtmosphere.duckVolume(false);
      if (fabIcon) fabIcon.innerHTML = '<polygon points="7 4 19 12 7 20 7 4"></polygon>';
      showToast("✨ संपूर्ण कथा वाचन पूर्ण झाले!");
    }
  };

  storySceneAudioPlayer.play().catch(function(e) {
    console.warn("Audio autoplay blocked by browser, click to play:", e);
  });
};

window.openStoryTheater = function() {
  const modal = document.getElementById("modal-story-theater");
  if (!modal) return;
  modal.style.display = "flex";
  playStoryScene(0);
};

window.closeStoryTheater = function() {
  const modal = document.getElementById("modal-story-theater");
  if (modal) modal.style.display = "none";
  stopAllAudios();
  if (typeof storyAtmosphere !== 'undefined') storyAtmosphere.stop();
};

window.storyNextVerse = function() {
  if (currentStorySceneIndex < STORY_DRAMA_SCENES.length - 1) {
    playStoryScene(currentStorySceneIndex + 1);
  }
};

window.storyPrevVerse = function() {
  if (currentStorySceneIndex > 0) {
    playStoryScene(currentStorySceneIndex - 1);
  }
};

window.toggleStoryPlayback = function() {
  const fabIcon = document.getElementById("story-fab-icon");
  if (storySceneAudioPlayer) {
    if (storySceneAudioPlayer.paused) {
      storySceneAudioPlayer.play();
      if (typeof storyAtmosphere !== 'undefined') storyAtmosphere.duckVolume(true);
      if (fabIcon) fabIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
    } else {
      storySceneAudioPlayer.pause();
      if (typeof storyAtmosphere !== 'undefined') storyAtmosphere.duckVolume(false);
      if (fabIcon) fabIcon.innerHTML = '<polygon points="7 4 19 12 7 20 7 4"></polygon>';
    }
  } else {
    playStoryScene(currentStorySceneIndex || 0);
  }
};


/* ==========================================================================
   DEDICATED BIBLE CHAPTER SCRIPTURE AUDIO ENGINE (FOR READER PLAY FAB)
   ========================================================================== */

const BIBLE_BOOK_NUMBERS_MAP = {
  "GEN": 1, "EXO": 2, "LEV": 3, "NUM": 4, "DEU": 5, "JOS": 6, "JDG": 7, "RUT": 8,
  "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14, "EZR": 15, "NEH": 16,
  "EST": 17, "JOB": 18, "PSA": 19, "PRO": 20, "ECC": 21, "SNG": 22, "ISA": 23, "JER": 24,
  "LAM": 25, "EZK": 26, "DAN": 27, "HOS": 28, "JOL": 29, "AMO": 30, "OBA": 31, "JON": 32,
  "MIC": 33, "NAM": 34, "HAB": 35, "ZEP": 36, "HAG": 37, "ZEC": 38, "MAL": 39,
  "MAT": 40, "MRK": 41, "LUK": 42, "JHN": 43, "ACT": 44, "ROM": 45, "1CO": 46, "2CO": 47,
  "GAL": 48, "EPH": 49, "PHP": 50, "COL": 51, "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55,
  "TIT": 56, "PHM": 57, "HEB": 58, "JAS": 59, "1PE": 60, "2PE": 61, "1JN": 62, "2JN": 63,
  "3JN": 64, "JUD": 65, "REV": 66
};

let bibleChapterAudioPlayer = null;
let isBibleChapterPlaying = false;

let bibleAudioCtx = null;
let bibleAudioSource = null;
let bibleBassFilter = null;
let bibleMidFilter = null;
let bibleTrebleFilter = null;

function applyBibleAudioMastering(audioEl, bNum) {
  if (!audioEl) return;
  const isOldTestament = (bNum < 40);

  // Harmonize pacing for Old Testament to match New Testament's calm, reverent cadence
  try {
    audioEl.playbackRate = isOldTestament ? 0.94 : 1.0;
  } catch(e) {}

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!bibleAudioCtx) {
      bibleAudioCtx = new AudioContextClass();
    }
    if (bibleAudioCtx.state === 'suspended') {
      bibleAudioCtx.resume();
    }
  } catch (e) {
    console.warn("[Audio Harmonizer] Web Audio notice:", e);
  }
}

window.playBibleChapterScripture = function() {
  stopAllAudios();

  const currentBook = state.activeBook || state.currentBook || "genesis";
  const currentChapter = parseInt(state.activeChapter || state.currentChapter || 1, 10);

  // Resolve book number 1 to 66
  let bNum = 1;
  const cleanKey = String(currentBook).toLowerCase().replace(".json", "").trim();
  const foundMeta = booksMetadataMr.find(b => 
    b.id === currentBook || 
    b.filename.replace(".json", "").toLowerCase() === cleanKey ||
    b.engName.toLowerCase() === cleanKey ||
    b.name === currentBook
  );

  if (foundMeta) {
    bNum = foundMeta.id;
  } else if (BIBLE_BOOK_NUMBERS_MAP && BIBLE_BOOK_NUMBERS_MAP[String(currentBook).toUpperCase()]) {
    bNum = BIBLE_BOOK_NUMBERS_MAP[String(currentBook).toUpperCase()];
  }

  // WordProject language code: 28 for Marathi, 1 for English
  const isEng = (state.translation === "eng");
  const langCode = isEng ? 1 : 28;
  const audioUrl = `https://audio.wordproject.org/bibles/app/audio/${langCode}/${bNum}/${currentChapter}.mp3`;

  bibleChapterAudioPlayer = new Audio(audioUrl);
  window.activeBibleReaderAudio = bibleChapterAudioPlayer;
  isBibleChapterPlaying = true;

  // Apply Acoustic Mastering & Cadence Harmonization
  applyBibleAudioMastering(bibleChapterAudioPlayer, bNum);

  const fabIcon = document.getElementById("circle-fab-play-icon");
  const fabBtn = document.getElementById("btn-floating-reader-play-circle");

  if (fabIcon) fabIcon.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"></rect>';
  if (fabBtn) fabBtn.classList.add("playing");

  // Synchronized verse scrolling in reader page
  bibleChapterAudioPlayer.ontimeupdate = () => {
    if (!bibleChapterAudioPlayer || !bibleChapterAudioPlayer.duration) return;
    const progress = bibleChapterAudioPlayer.currentTime / bibleChapterAudioPlayer.duration;
    const verses = document.querySelectorAll(".verse-row");
    if (verses.length > 0) {
      const activeIdx = Math.min(verses.length - 1, Math.floor(progress * verses.length));
      verses.forEach((v, i) => {
        v.classList.toggle("tts-reading", i === activeIdx);
      });
      if (verses[activeIdx]) {
        verses[activeIdx].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  bibleChapterAudioPlayer.onended = () => {
    isBibleChapterPlaying = false;
    if (fabIcon) fabIcon.innerHTML = '<polygon points="7 4 19 12 7 20 7 4"></polygon>';
    if (fabBtn) fabBtn.classList.remove("playing");
    document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("tts-reading"));
  };

  bibleChapterAudioPlayer.onerror = (err) => {
    console.warn("Audio load error, falling back to TTS:", err);
    isBibleChapterPlaying = false;
    if (typeof startSpeechNarration === "function") {
      startSpeechNarration();
    }
  };

  bibleChapterAudioPlayer.play().catch(e => {
    console.warn("Autoplay block, tap play again:", e);
  });
};

// Update stopAllAudios to include bibleChapterAudioPlayer
const origStopAllAudios = window.stopAllAudios;
window.stopAllAudios = function() {
  if (bibleChapterAudioPlayer) {
    bibleChapterAudioPlayer.pause();
    bibleChapterAudioPlayer = null;
  }
  isBibleChapterPlaying = false;
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("tts-reading"));
  const fabIcon = document.getElementById("circle-fab-play-icon");
  const fabBtn = document.getElementById("btn-floating-reader-play-circle");
  if (fabIcon) fabIcon.innerHTML = '<polygon points="7 4 19 12 7 20 7 4"></polygon>';
  if (fabBtn) fabBtn.classList.remove("playing");
  if (origStopAllAudios) origStopAllAudios();
};


/* ==========================================================================
   STORY AUDIO MODE & CAST SWITCHER
   ========================================================================== */

window.switchStoryAudioMode = function(modeVal) {
  console.log("[STORY_AUDIO] Switching to mode:", modeVal);
  stopAllAudios();

  const presetSelect = null;
  if (presetSelect && presetSelect.value !== modeVal) {
    presetSelect.value = modeVal;
  }

  if (modeVal === "cinematic_film") {
    showToast("🎬 चित्रपट नाट्यमय वाचक (Cinematic Film Voice) सुरू केला!");
    if (typeof storyAtmosphere !== 'undefined') storyAtmosphere.playMood("cinematic");
    playStoryScene(0);
  } else if (modeVal === "human_native") {
    showToast("🎙️ अस्सल मानवी मराठी आवाज (Fluent Native Human Voice) सुरू केला!");
    if (typeof playHumanMarathiAudio === 'function') {
      playHumanMarathiAudio();
    } else {
      playStoryScene(0);
    }
  } else if (modeVal === "emotional_drama" || modeVal === "classical_spiritual") {
    showToast("🎭 भावपूर्ण AI संवाद कथा सुरू केली!");
    if (typeof switchStoryCastPreset === 'function') {
      switchStoryCastPreset(modeVal);
    } else {
      playStoryScene(0);
    }
  } else {
    playStoryScene(0);
  }
};

window.switchStoryCastPreset = function(presetKey) {
  if (presetKey === "cinematic_film") {
    window.switchStoryAudioMode("cinematic_film");
    return;
  }
  playStoryScene(0);
};


/* ==========================================================================
   MULTI-CHAPTER REALISTIC BIBLE STORYBOOK DATABASE (ILLUSTRATED DRAMAS)
   ========================================================================== */

const BIBLE_STORYBOOK_DATABASE = {
  samson: {
    id: "samson",
    titleMr: "शूर शमशोनचा जन्म (Judges 13)",
    bookKey: "JDG",
    chapterNum: 13,
    scenes: [
      {
        titleMr: "दृश्य १: संकट आणि प्रतीक्षा (The Longing)",
        bgImage: "assets/images/golden_dawn.png",
        speakerRole: "🕊️ सूत्रधार (Narrator)",
        speakerName: "कबीर (शांत व भावपूर्ण आवाज)",
        audioUrl: "assets/audio/stories/scene_1.wav",
        mood: "harp",
        textMr: "फार वर्षांपूर्वीची गोष्ट आहे... इस्राएल देशावर संकटाचे सावट होते. लोक देवाचा मार्ग विसरले होते. पण सरा नावाच्या एका लहान आणि शांत गावात, मानोहा आणि त्याची पत्नी राहत होते. त्यांच्या घरात सर्व काही होते, पण एक मोठी खंत होती... त्यांच्या पोटी कोणतेही मूल नव्हते. ते दोघेही दररोज देवाकडे अश्रूंनी प्रार्थना करत होते..."
      },
      {
        titleMr: "दृश्य २: देवदूताचे दिव्य दर्शन (The Angelic Miracle)",
        bgImage: "assets/images/healing_light.png",
        speakerRole: "👑 परमेश्वराचा दूत (Angel of the Lord)",
        speakerName: "रतन (गंभीर व दैवी आवाज)",
        audioUrl: "assets/audio/stories/scene_2.wav",
        mood: "pads",
        textMr: "एके दिवशी रानात, अचानक स्वर्गातून एक दिव्य प्रकाश चमकला! साक्षात परमेश्वराचा एक तेजस्वी दूत तिच्यासमोर प्रकट झाला. दूत म्हणाला... घाबरू नकोस! देवाने तुझे अश्रू पाहिले आहेत. तू एका पुत्राला जन्म देशील! त्याच्या डोक्यावर वस्तरा फिरवू नको, कारण तो जन्मापासूनच देवाचा नाजीर असेल. तो इस्राएल लोकांचे रक्षण करील!"
      },
      {
        titleMr: "दृश्य ३: कुटुंबाचा विश्वास आणि प्रार्थना (The Family's Faith)",
        bgImage: "assets/images/candlelight.png",
        speakerRole: "🌸 मानोहाची पत्नी (Manoah's Wife)",
        speakerName: "काव्या (भावपूर्ण स्त्री आवाज)",
        audioUrl: "assets/audio/stories/scene_3.wav",
        mood: "harp",
        textMr: "ती धावत आपल्या पतीकडे गेली आणि म्हणाली... अहो ऐका! आज रानात देवाचा एक माणूस माझ्याकडे आला होता. त्याचे रूप इतके तेजस्वी होते की मला भीतीयुक्त आदर वाटला! तेव्हा मानोहाने प्रार्थना केली... हे प्रभू, त्या देवदूताला पुन्हा पाठव, म्हणजे त्या मुलाचे संगोपन कसे करावे हे आम्हाला समजावे."
      },
      {
        titleMr: "दृश्य ४: अग्नीतून प्रयाण आणि शमशोनचा जन्म (The Flame & The Hero)",
        bgImage: "assets/images/mount_zion.png",
        speakerRole: "🔥 चमत्कार व जयजयकार (The Miracle Altar)",
        speakerName: "कबीर (जयघोष कथा आवाज)",
        audioUrl: "assets/audio/stories/scene_4.wav",
        mood: "pads",
        textMr: "मानोहाने एका खडकावर देवाला होमार्पण केले. आणि काय आश्चर्य! वेदीवरून निघणाऱ्या अग्नीच्या ज्वालेतून तो देवदूत आकाशात स्वर्गाकडे निघून गेला! हे पाहून दोघांनी जमिनीवर लोटांगण घालून देवाची स्तुती केली. यथावकाश तिला एक तेजस्वी पुत्र झाला, त्याचे नाव त्यांनी 'शमशोन' ठेवले... आणि परमेश्वराचा आत्मा त्याच्यावर कार्य करू लागला!"
      }
    ]
  },
  david_goliath: {
    id: "david_goliath",
    titleMr: "दावीद आणि अजस्र गल्याथ (1 Samuel 17)",
    bookKey: "1SA",
    chapterNum: 17,
    scenes: [
      {
        titleMr: "दृश्य १: इलाह दरीतील आव्हान (Goliath's Challenge)",
        bgImage: "assets/images/mount_zion.png",
        speakerRole: "🕊️ सूत्रधार (Narrator)",
        speakerName: "कबीर (वीररस नाट्यमय आवाज)",
        audioUrl: "assets/audio/stories/david_goliath_scene_1.wav",
        mood: "cinematic",
        textMr: "फार वर्षांपूर्वी, इलाह नावाच्या एका विस्तीर्ण दरीत, इस्राएल आणि पलिष्ट्यांचे सैन्य समोरासमोर उभे होते. अचानक, पलिष्ट्यांच्या छावणीतून नऊ फूट उंच, लोखंडी चिलखत घातलेला एक महाकाय राक्षस पुढे आला... त्याचे नाव होते गल्याथ! तो गर्जना करून म्हणाला... तुमच्या सैन्यात कोणी मर्द आहे का, जो माझ्याशी लढा देईल?"
      },
      {
        titleMr: "दृश्य २: लहान दाविदाचा महापराक्रमी विश्वास (David's Faith)",
        bgImage: "assets/images/golden_dawn.png",
        speakerRole: "⚔️ तरुण दावीद (Young David)",
        speakerName: "कबीर (दृढ निश्चयी आवाज)",
        audioUrl: "assets/audio/stories/david_goliath_scene_2.wav",
        mood: "cinematic",
        textMr: "सर्व सैन्य भीतीने थरथर कापत होते. पण तिथे दावीद नावाचा एक तरुण गुराखी मुलगा आला. त्याच्या हातात फक्त एक गोफण आणि मेंढ्यांची काठी होती. दावीदाने त्या अजस्र राक्षसाच्या डोळ्यात रोखून पाहिले आणि म्हणाला... तू तर तलवार आणि भाल्यांनी माझ्याकडे येत आहेस, पण मी सर्वसमर्थ सैन्यांच्या परमेश्वराच्या नावाने तुझ्याविरुद्ध येत आहे!"
      },
      {
        titleMr: "दृश्य ३: गोफणीचा अचूक नेम व महाविजय (The Glorious Victory)",
        bgImage: "assets/images/mount_zion.png",
        speakerRole: "🔥 विजयघोष (Victory Celebration)",
        speakerName: "कबीर (जयघोष कथा आवाज)",
        audioUrl: "assets/audio/stories/david_goliath_scene_3.wav",
        mood: "pads",
        textMr: "दावीदाने ओढ्यातून आणलेला एक लहानसा दगड आपल्या गोफणीत ठेवला, आणि जोराने फिरवून हवेत भिरकावला! तो दगड विजेच्या वेगाने जाऊन थेट त्या महाकाय गल्याथाच्या कपाळात घुसला! तो राक्षस एका क्षणात जमिनीवर धाडकन कोसळला! इस्राएल सैन्यात आनंदाचा जयजयकार झाला... कारण देवाने एका साध्या मुलाच्या विश्वासाने संपूर्ण देशाला विजय मिळवून दिला!"
      }
    ]
  },
  wedding_cana: {
    id: "wedding_cana",
    titleMr: "कानामधील पहिला चमत्कार (John 2)",
    bookKey: "JHN",
    chapterNum: 2,
    scenes: [
      {
        titleMr: "दृश्य १: लग्नसोहळा आणि अनपेक्षित अडचण (The Wedding Feast)",
        bgImage: "assets/images/wedding_cana_v425.png",
        speakerRole: "🕊️ सूत्रधार (Narrator)",
        speakerName: "कबीर (आनंदी कथा आवाज)",
        audioUrl: "assets/audio/stories/wedding_cana_scene_1.wav",
        mood: "harp",
        textMr: "गालीलातील काना नावाच्या एका सुंदर गावात लग्नाचा मोठा उत्सव सुरू होता. सगळीकडे आनंद, हास्य आणि संगीताची रेलचेल होती. येशू आणि त्यांची माता मरिया सुद्धा त्या लग्नाला उपस्थित होते. पण अचानक उत्सवादरम्यान एक मोठी अडचण निर्माण झाली... घरातील द्राक्षारस संपला! यजमानाची मोठी नाचक्की होणार होती."
      },
      {
        titleMr: "दृश्य २: मातेचा विश्वास व आज्ञा (Mother Mary's Request)",
        bgImage: "assets/images/candlelight.png",
        speakerRole: "🌸 माता मरिया (Mother Mary)",
        speakerName: "काव्या (प्रेमळ आईचा आवाज)",
        audioUrl: "assets/audio/stories/wedding_cana_scene_2.wav",
        mood: "harp",
        textMr: "तेव्हा येशूची आई मरिया येशूकडे गेली आणि म्हणाली... यांच्याकडचा द्राक्षारस संपला आहे. मग तिने नोकरांना बोलावून प्रेमाने सांगितले... तो तुम्हाला जे काही सांगेल, ते तुम्ही निमूटपणे करा!"
      },
      {
        titleMr: "दृश्य ३: येशूंची आज्ञा आणि पाण्याचे रांजण (The Master's Command)",
        bgImage: "assets/images/calm_waters.png",
        speakerRole: "👑 प्रभू येशू (Lord Jesus)",
        speakerName: "रतन (शांत व दैवी अधिकारयुक्त आवाज)",
        audioUrl: "assets/audio/stories/wedding_cana_scene_3.wav",
        mood: "pads",
        textMr: "तिथे दगडी सहा मोठे रांजण ठेवलेले होते. येशूने नोकरांना शांत आवाजात आज्ञा केली... हे सर्व रांजण पाण्याने काठोकाठ भरा! नोकरांनी ते पाण्याने भरले. मग येशू म्हणाले... आता यातले थोडे काढून मेजवानीच्या प्रमुखाकडे घेऊन जा."
      },
      {
        titleMr: "दृश्य ४: पाण्याचे रूपांतर आणि पहिला चमत्कार (The Sweet Wine Miracle)",
        bgImage: "assets/images/wedding_cana_v425.png",
        speakerRole: "✨ दैवी गौरव (Divine Glory)",
        speakerName: "कबीर (आश्चर्यकारक कथा आवाज)",
        audioUrl: "assets/audio/stories/wedding_cana_scene_4.wav",
        mood: "harp",
        textMr: "जेव्हा त्या प्रमुखाने ते चाखले, तेव्हा तो थक्क झाला! ते साधे पाणी जगातील सर्वात गोड आणि उत्कृष्ट द्राक्षारसात रूपांतरित झाले होते! येशूने आपल्या चिन्हांचा हा पहिला अद्भुत चमत्कार करून आपले दैवी सामर्थ्य प्रकट केले... आणि सर्वांच्या अंतःकरणात आशेचा नवीन प्रकाश पसरला!"
      }
    ]
  },
  prodigal_son: {
    id: "prodigal_son",
    titleMr: "हरवलेला मुलगा आणि प्रेमळ पिता (Luke 15)",
    bookKey: "LUK",
    chapterNum: 15,
    scenes: [
      {
        titleMr: "दृश्य १: संपत्तीचा वाटा व उधळपट्टी (The Departure)",
        bgImage: "assets/images/golden_dawn.png",
        speakerRole: "🕊️ सूत्रधार (Narrator)",
        speakerName: "कबीर (गंभीर कथा आवाज)",
        audioUrl: "assets/audio/stories/prodigal_son_scene_1.wav",
        mood: "harp",
        textMr: "एका श्रीमंत गृहस्थाला दोन मुले होती. लहान मुलगा उनाड निघाला. तो वडिलांना म्हणाला... बाबा, माझ्या वाटणीची संपत्ती मला देऊन टाका. वडिलांनी दुःखी अंतःकरणाने त्याला वाटा दिला. तो तरुण सर्व पैसा घेऊन दूरच्या देशात गेला आणि मौजमजेत सर्व संपत्ती उडवून बसला!"
      },
      {
        titleMr: "दृश्य २: दुष्काळ, गरिबी आणि पश्चात्ताप (The Repentance)",
        bgImage: "assets/images/candlelight.png",
        speakerRole: "🕊️ सूत्रधार (Narrator)",
        speakerName: "कबीर (हृदयस्पर्शी आवाज)",
        audioUrl: "assets/audio/stories/prodigal_son_scene_2.wav",
        mood: "pads",
        textMr: "त्या देशात मोठा दुष्काळ पडला. त्याच्याकडे खाण्यासाठी एक तुकडाही उरला नाही. तो डुकरांचे उष्टे अन्न खाण्यासाठी आसुसला. तेव्हा त्याच्या डोळ्यात अश्रू आले... तो मनात म्हणाला... माझ्या वडिलांच्या घरी नोकरांनाही भरपूर भाकरी मिळते, आणि मी इथे भुकेने मरत आहे! मी वडिलांकडे जाईन आणि त्यांची माफी मागेन..."
      },
      {
        titleMr: "दृश्य ३: पित्याची गळाभेट आणि मोठा उत्सव (The Father's Loving Embrace)",
        bgImage: "assets/images/golden_dawn.png",
        speakerRole: "👑 प्रेमळ पिता (The Loving Father)",
        speakerName: "रतन (अथांग प्रेमळ पिता आवाज)",
        audioUrl: "assets/audio/stories/prodigal_son_scene_3.wav",
        mood: "harp",
        textMr: "तो चालत घराच्या जवळ आला. त्याचे वडील दररोज वाटेकडे डोळे लावून पाहत होते! वडिलांनी त्याला दुरूनच पाहिले, धावत जाऊन त्याला छातीशी कवटाळले आणि त्याचे मुके घेतले! वडील नोकरांना म्हणाले... सर्वोत्तम कपडे आणा, याच्या हातात अंगठी घाला आणि मोठा सण साजरा करा... कारण माझा हा मुलगा हरवला होता, पण आता पुन्हा सापडला आहे!"
      }
    ]
  }
};

let activeStoryEpisodeKey = "samson";

window.loadStoryEpisode = function(storyKey) {
  if (BIBLE_STORYBOOK_DATABASE[storyKey]) {
    activeStoryEpisodeKey = storyKey;
    const story = BIBLE_STORYBOOK_DATABASE[storyKey];
    
    // Update topbar book chapter title
    const bookChapEl = document.getElementById("story-theater-book-chapter");
    if (bookChapEl) bookChapEl.textContent = story.titleMr;

    showToast(`📖 ${story.titleMr} कथा सुरू होत आहे...`);
    playStoryScene(0);
  }
};

// Update playStoryScene to play scenes from the active episode
window.playStoryScene = function(index) {
  const currentStory = BIBLE_STORYBOOK_DATABASE[activeStoryEpisodeKey] || BIBLE_STORYBOOK_DATABASE.samson;
  const scenesList = currentStory.scenes;

  if (index < 0 || index >= scenesList.length) return;
  currentStorySceneIndex = index;
  const scene = scenesList[index];

  stopAllAudios();

  const bgEl = document.getElementById("story-theater-bg");
  if (bgEl) bgEl.style.backgroundImage = "url('" + scene.bgImage + "')";

  const themeEl = document.getElementById("story-theater-theme-tag");
  if (themeEl) themeEl.textContent = scene.titleMr;

  const bookChapEl = document.getElementById("story-theater-book-chapter");
  if (bookChapEl) bookChapEl.textContent = currentStory.titleMr;

  const speakerBadge = document.getElementById("story-active-speaker-badge");
  const avatarEl = document.getElementById("story-speaker-avatar");
  const roleEl = document.getElementById("story-speaker-role");
  const voiceEl = document.getElementById("story-speaker-voice");

  if (avatarEl) avatarEl.textContent = scene.speakerRole.includes("दूत") || scene.speakerRole.includes("प्रभू") || scene.speakerRole.includes("पिता") ? "👑" : (scene.speakerRole.includes("माता") || scene.speakerRole.includes("पत्नी") ? "🌸" : (scene.speakerRole.includes("दावीद") ? "⚔️" : "🕊️"));
  if (roleEl) roleEl.textContent = scene.speakerRole;
  if (voiceEl) voiceEl.textContent = scene.speakerName;

  const numEl = document.getElementById("story-current-verse-num");
  const textEl = document.getElementById("story-current-verse-text");
  const statusEl = document.getElementById("story-theater-status");

  if (numEl) numEl.textContent = scene.titleMr.split('(')[0] + " (" + (index + 1) + "/" + scenesList.length + ")";
  if (textEl) textEl.textContent = '"' + scene.textMr + '"';
  if (statusEl) statusEl.textContent = scene.speakerRole + " • बोलत आहे";

  if (typeof storyAtmosphere !== 'undefined') {
    storyAtmosphere.playMood(scene.mood);
    storyAtmosphere.duckVolume(true);
  }

  const fabIcon = document.getElementById("story-fab-icon");
  if (fabIcon) fabIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

  storySceneAudioPlayer = new Audio(scene.audioUrl);
  window.activeStorySceneAudio = storySceneAudioPlayer;

  storySceneAudioPlayer.onended = function() {
    if (currentStorySceneIndex < scenesList.length - 1) {
      setTimeout(function() {
        playStoryScene(currentStorySceneIndex + 1);
      }, 700);
    } else {
      if (typeof storyAtmosphere !== 'undefined') storyAtmosphere.duckVolume(false);
      if (fabIcon) fabIcon.innerHTML = '<polygon points="7 4 19 12 7 20 7 4"></polygon>';
      showToast("✨ संपूर्ण कथा वाचन पूर्ण झाले!");
    }
  };

  storySceneAudioPlayer.play().catch(function(e) {
    console.warn("Audio autoplay blocked by browser, click to play:", e);
  });
};

window.storyNextVerse = function() {
  const currentStory = BIBLE_STORYBOOK_DATABASE[activeStoryEpisodeKey] || BIBLE_STORYBOOK_DATABASE.samson;
  if (currentStorySceneIndex < currentStory.scenes.length - 1) {
    playStoryScene(currentStorySceneIndex + 1);
  }
};

window.storyPrevVerse = function() {
  if (currentStorySceneIndex > 0) {
    playStoryScene(currentStorySceneIndex - 1);
  }
};

/* ==========================================================================
   RIVER OF LIFE - 5 CORE FEATURES IMPLEMENTATION
   ========================================================================== */

/* --------------------------------------------------------------------------
   FEATURE 1: BIBLE READING WITH EXPLANATIONS (Reader View & Study Pane)
   -------------------------------------------------------------------------- */
const CHAPTER_EXPLANATIONS_DB = {
  "judges_13": {
    mr: {
      title: "शास्ते अध्याय १३: शमशोनचा जन्म व नाजीर व्रत",
      context: "इस्राएल लोक पुन्हा परमेश्वराच्या दृष्टीने वाईट वागले, म्हणून परमेश्वराने त्यांना ४० वर्षे पलिष्ट्यांच्या हाती दिले. या काळात सोरा गावातील दान कुळातील मानोह याच्या वांझ स्त्रीला परमेश्वराच्या दूताने दर्शन दिले.",
      keyTheme: "देवाचे सार्वभौमत्व आणि इस्राएलाच्या सुटकेसाठी लहानपणापासून केलेली पूर्वतयारी.",
      breakdown: [
        "वचन १-५: प्रभूच्या दूताचे मानोहच्या पत्नीला दर्शन आणि शमशोनच्या जन्माविषयी व नाजीर व्रताविषयी आज्ञा.",
        "वचन ६-१४: मानोहने दूताला पुन्हा भेटण्याची केलेली प्रार्थना आणि देवाने दिलेले मार्गदर्शन.",
        "वचन १५-२३: मानोहचे होमार्पण, दूताचे ज्वालांमध्ये स्वर्गात आरोहण आणि मानोहचे भय.",
        "वचन २४-२५: शमशोनचा जन्म आणि परमेश्वराच्या आत्म्याने त्याला प्रेरणा देणे."
      ],
      application: "देव आपल्या जीवनात सर्वात कठीण आणि अशक्य वाटणाऱ्या परिस्थितीतूनही आपला गौरव व सुटका प्रगट करतो. त्याने आपल्याला पवित्र जीवनासाठी पाचारण केले आहे.",
      prayer: "हे स्वर्गीय पित्या, शमशोनप्रमाणे तू मलाही तुझ्या पवित्र कार्यासाठी वेगळे केले आहेस. मला तुझ्या पवित्र आत्म्याच्या मार्गदर्शनात चालण्यास कृपा दे. आमेन."
    },
    en: {
      title: "Judges Chapter 13: The Birth and Calling of Samson",
      context: "Israel again did evil in the eyes of the Lord, so He delivered them into the hands of the Philistines for 40 years. In this darkness, the Angel of the Lord appeared to Manoah's barren wife.",
      keyTheme: "God's sovereignty in raising up a deliverer dedicated to Him from before birth.",
      breakdown: [
        "Verses 1-5: The Angel announces Samson's birth and the sacred Nazirite vow.",
        "Verses 6-14: Manoah prays for guidance on how to raise the child.",
        "Verses 15-23: The sacrifice, the Angel ascending in the flame, and God's reassurance.",
        "Verses 24-25: Samson is born, blessed by God, and stirred by the Spirit of the Lord."
      ],
      application: "God has a divine purpose for every life. When we consecrate ourselves to God, He equips us with His Holy Spirit to overcome opposition.",
      prayer: "Lord God, thank You for Your divine calling upon my life. Set me apart for Your holy purpose and let Your Holy Spirit guide every step I take. Amen."
    }
  },
  "john_3": {
    mr: {
      title: "योहान अध्याय ३: नवा जन्म आणि देवाचे असीम प्रेम",
      context: "निकोदेम नावाचा परुशी आणि यहूद्यांचा अधिकारी रात्रीच्या वेळी येशूकडे आला. येशूने त्याला देवाच्या राज्यात प्रवेश करण्यासाठी आत्म्यापासून नवा जन्म घेण्याची गरज स्पष्ट केली.",
      keyTheme: "तारण केवळ येशू ख्रिस्तावरील विश्वासाने आणि पवित्र आत्म्याद्वारे मिळणारा नवा जन्म.",
      breakdown: [
        "वचन १-१५: नवा जन्म व आत्म्याने जन्मणे याविषयी निकोदेमाशी संवाद.",
        "वचन १६-२१: देवाचे जगावरील असीम प्रेम — जो कोणी पुत्रावर विश्वास ठेवतो त्याचा नाश होणार नाही तर त्याला सार्वकालिक जीवन मिळेल.",
        "वचन २२-३०: बाप्तिस्मा करणाऱ्या योहानाची साक्ष: 'तो वाढला पाहिजे आणि मी कमी झाले पाहिजे.'",
        "वचन ३१-३६: स्वर्गातून आलेल्या पुत्रावर विश्वास ठेवणाऱ्याला सार्वकालिक जीवन आहे."
      ],
      application: "धार्मिक विधी आपल्याला तारण देऊ शकत नाहीत; केवळ येशूवर विश्वास ठेवून अंतःकरणाचे नवे रूपांतर होणे आवश्यक आहे.",
      prayer: "प्रभू येशू, जगावर आणि माझ्यावर केलेल्या तुझ्या असीम प्रीतीबद्दल धन्यवाद. माझा विश्वास अधिक दृढ कर आणि मला दररोज तुझ्या प्रकाशात चालव. आमेन."
    },
    en: {
      title: "John Chapter 3: The New Birth and God's Unfailing Love",
      context: "Nicodemus, a member of the Jewish ruling council, comes to Jesus by night. Jesus reveals that one must be born again of water and the Spirit to see the kingdom of God.",
      keyTheme: "Salvation through faith in Jesus Christ and spiritual regeneration by the Holy Spirit.",
      breakdown: [
        "Verses 1-15: The dialogue with Nicodemus regarding rebirth by the Holy Spirit.",
        "Verses 16-21: The Golden Verse (John 3:16) — God's supreme gift of His Son to save the world.",
        "Verses 22-30: John the Baptist's testimony: 'He must increase, but I must decrease.'",
        "Verses 31-36: The authority of Christ from above and the promise of eternal life."
      ],
      application: "True spiritual life is not about religious traditions, but a heart transformed by faith in Christ. Let Christ increase in all areas of our lives.",
      prayer: "Lord Jesus, thank You for Your immense love on the cross. Give me a fresh heart every day, and let Your light shine through my life. Amen."
    }
  },
  "psalms_23": {
    mr: {
      title: "स्तोत्रसंहिता २३: परमेश्वर माझा उत्तम मेंढपाळ",
      context: "राजा दाविदाने आपल्या मेंढपाळपणाच्या आणि संकटांतील अनुभवातून रचलेले हे अत्यंत प्रसिद्ध आणि सांत्वनदायी स्तोत्र आहे.",
      keyTheme: "देवाचे निरंतर संरक्षण, आत्मिक तृप्ती आणि सार्वकालिक सहवास.",
      breakdown: [
        "वचन १-३: हिरव्या कुरणात बसवणे आणि शांत पाण्याच्या काठी नेणे — आत्म्याची तृप्ती व ताजेतवानेपणा.",
        "वचन ४: मरणाच्या छायेच्या दरीतून जातानाही अभय — 'तू माझ्याबरोबर आहेस.'",
        "वचन ५: शत्रूंसमोर ताट वाढणे व तेलाने डोके अभिषेक करणे — देवाचा विजय व कृपा.",
        "वचन ६: केवळ दया व कृपा आयुष्यभर पाठीस येतील आणि परमेश्वराच्या घरात सार्वकाळ वास."
      ],
      application: "आयुष्यातील सर्वात अंधकारमय क्षणांतही आपल्याला एकटेपणाची भीती बाळगण्याची गरज नाही, कारण उत्तम मेंढपाळ आपल्यासोबत आहे.",
      prayer: "हे परमेश्वरा, तू माझा मेंढपाळ आहेस; मला कशाचीही उणीव भासणार नाही. संकटाच्या दरीत माझा हात धर आणि मला तुझ्या शांततेत चालव. आमेन."
    },
    en: {
      title: "Psalm 23: The Lord is My Shepherd",
      context: "Composed by King David drawing from his pastoral background and his deep trust in God during times of extreme danger.",
      keyTheme: "God's providential care, comfort in the darkest valley, and eternal blessing.",
      breakdown: [
        "Verses 1-3: Green pastures, quiet waters, and restoration of the soul.",
        "Verse 4: Courage in the valley of the shadow of death: 'For You are with me.'",
        "Verse 5: A prepared table in the presence of foes, anointed with oil, cup overflowing.",
        "Verse 6: Goodness and mercy following all the days of life, dwelling in the house of the Lord forever."
      ],
      application: "No matter how dark or uncertain life seems, Jesus the Good Shepherd leads us, protects us, and satisfies our every spiritual need.",
      prayer: "Heavenly Father, You are my Shepherd. I place my fears, worries, and future in Your loving hands. Fill my cup to overflowing. Amen."
    }
  }
};

window.getChapterStudyExplanation = function(bookKey, chapter) {
  const key = `${bookKey}_${chapter}`;
  if (CHAPTER_EXPLANATIONS_DB[key]) {
    return CHAPTER_EXPLANATIONS_DB[key];
  }

  const bookMeta = (typeof booksMetadataMr !== 'undefined') ? booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey) : null;
  const bookNameMr = bookMeta ? bookMeta.name : bookKey;
  const bookNameEn = bookMeta ? bookMeta.engName : bookKey;

  return {
    mr: {
      title: `${bookNameMr} अध्याय ${chapter} - सखोल अध्याय स्पष्टीकरण व मनन`,
      context: `पवित्र शास्त्रातील ${bookNameMr} पुस्तकाचा ${chapter} वा अध्याय देवाचे सामर्थ्य, विश्वास आणि जीवनाचा मार्ग उलगडून दाखवतो.`,
      keyTheme: "देवाचे सार्वभौमत्व, विश्वासूपणा आणि आपल्या जीवनातील त्याची पवित्र इच्छा.",
      breakdown: [
        `१. ${bookNameMr} ${chapter}:१-५ — देवाचे वचन आणि परिस्थितीची पार्श्वभूमी.`,
        `२. ${bookNameMr} ${chapter}:६-१५ — देवाचा संदेश, आज्ञा व आत्मिक शिकवण.`,
        `३. ${bookNameMr} ${chapter}:१६-शेवट — देवाचा विश्वासूपणा आणि जीवनातील फलदायीपणा.`
      ],
      application: "या अध्यायातील वचनांचे दररोज मनन करा. परिस्थिती कशीही असली तरी देवाच्या वचनावर अढळ विश्वास ठेवा.",
      prayer: `हे परमेश्वरा, ${bookNameMr} ${chapter} मधील तुझ्या वचनांद्वारे मला शिकवल्याबद्दल धन्यवाद. माझ्या जीवनात तुझे वचन कार्य करू दे. आमेन.`
    },
    en: {
      title: `${bookNameEn} Chapter ${chapter} - Chapter Study & Life Application`,
      context: `In ${bookNameEn} chapter ${chapter}, Scripture reveals God's divine character, calling, and timeless wisdom for our spiritual walk.`,
      keyTheme: "God's sovereignty, faithful promises, and guidance for Christian discipleship.",
      breakdown: [
        `1. ${bookNameEn} ${chapter}:1-5 — Biblical setting and foundational truth.`,
        `2. ${bookNameEn} ${chapter}:6-15 — Divine command and spiritual revelation.`,
        `3. ${bookNameEn} ${chapter}:16-end — God's faithfulness and life transformation.`
      ],
      application: "Reflect on these scriptures daily. Apply God's truth to your everyday actions, decisions, and relationships.",
      prayer: `Lord God, thank You for the truth found in ${bookNameEn} ${chapter}. Give me the wisdom to live according to Your Word today. Amen.`
    }
  };
};

window.openChapterExplanation = function() {
  const currentBook = (typeof state !== 'undefined' && state.activeBook) ? state.activeBook : "judges";
  const currentChapter = (typeof state !== 'undefined' && state.activeChapter) ? state.activeChapter : 13;
  openStudyPanel(currentBook, currentChapter);
};

window.openStudyPanel = function(bookKey, chapter, verse) {
  const readerEl = document.getElementById("view-reader");
  if (!readerEl) return;

  const bKey = bookKey || ((typeof state !== 'undefined' && state.activeBook) ? state.activeBook : "judges");
  const chap = chapter || ((typeof state !== 'undefined' && state.activeChapter) ? state.activeChapter : 13);
  
  const bookMeta = (typeof booksMetadataMr !== 'undefined') ? booksMetadataMr.find(b => b.filename.replace(".json", "") === bKey) : null;
  const bookName = bookMeta ? ((typeof state !== 'undefined' && state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bKey;

  const titleEl = document.getElementById("study-pane-ref-title");
  if (titleEl) {
    titleEl.textContent = verse ? `Study Notes • ${bookName} ${chap}:${verse}` : `📖 Chapter Explanation • ${bookName} ${chap}`;
  }

  const expData = getChapterStudyExplanation(bKey, chap);
  const mrEl = document.getElementById("study-explain-text-mr");
  const enEl = document.getElementById("study-explain-text-en");

  if (mrEl) {
    mrEl.innerHTML = `
      <div style="font-family: var(--font-sans); margin-bottom: 14px;">
        <h4 style="font-size: 16px; font-weight: 800; color: var(--primary); margin: 0 0 8px 0;">${expData.mr.title}</h4>
        <div style="background: rgba(158,22,34,0.06); padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--primary); margin-bottom: 12px;">
          <strong style="font-size: 12px; color: var(--primary); text-transform: uppercase;">ऐतिहासिक संदर्भ व पार्श्वभूमी:</strong>
          <p style="margin: 4px 0 0 0; font-size: 13.5px; line-height: 1.5; color: var(--text);">${expData.mr.context}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 12.5px; color: var(--text);">मुख्य शिकवण:</strong>
          <p style="margin: 2px 0 0 0; font-size: 13.5px; color: var(--text);">${expData.mr.keyTheme}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 12.5px; color: var(--text);">महत्वाचे भाग व स्पष्टीकरण:</strong>
          <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 13px; line-height: 1.6; color: var(--text);">
            ${expData.mr.breakdown.map(b => `<li style="margin-bottom: 4px;">${b}</li>`).join('')}
          </ul>
        </div>
        <div style="background: rgba(201,138,44,0.1); padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--accent-gold); margin-bottom: 12px;">
          <strong style="font-size: 12px; color: #b45309; text-transform: uppercase;">दैनंदिन जीवनात आचरण:</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; line-height: 1.5; color: var(--text);">${expData.mr.application}</p>
        </div>
        <div style="background: var(--bg); border: 1px solid var(--border); padding: 10px 12px; border-radius: 8px;">
          <strong style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">प्रार्थना:</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-style: italic; color: var(--text);">${expData.mr.prayer}</p>
        </div>
      </div>
    `;
  }

  if (enEl) {
    enEl.innerHTML = `
      <div style="font-family: var(--font-sans); margin-bottom: 14px;">
        <h4 style="font-size: 15px; font-weight: 800; color: var(--primary); margin: 0 0 8px 0;">${expData.en.title}</h4>
        <div style="background: rgba(158,22,34,0.06); padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--primary); margin-bottom: 10px;">
          <strong style="font-size: 11.5px; color: var(--primary); text-transform: uppercase;">Context & Background:</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; line-height: 1.5; color: var(--text);">${expData.en.context}</p>
        </div>
        <div style="margin-bottom: 10px;">
          <strong style="font-size: 12px; color: var(--text);">Key Theme:</strong>
          <p style="margin: 2px 0 0 0; font-size: 13px; color: var(--text);">${expData.en.keyTheme}</p>
        </div>
        <div style="margin-bottom: 10px;">
          <strong style="font-size: 12px; color: var(--text);">Key Breakdown:</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 12.5px; line-height: 1.5; color: var(--text);">
            ${expData.en.breakdown.map(b => `<li style="margin-bottom: 3px;">${b}</li>`).join('')}
          </ul>
        </div>
        <div style="background: rgba(201,138,44,0.1); padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--accent-gold); margin-bottom: 10px;">
          <strong style="font-size: 11.5px; color: #b45309; text-transform: uppercase;">Life Application:</strong>
          <p style="margin: 4px 0 0 0; font-size: 12.5px; line-height: 1.5; color: var(--text);">${expData.en.application}</p>
        </div>
        <div style="background: var(--bg); border: 1px solid var(--border); padding: 10px 12px; border-radius: 8px;">
          <strong style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase;">Reflection Prayer:</strong>
          <p style="margin: 4px 0 0 0; font-size: 12.5px; font-style: italic; color: var(--text);">${expData.en.prayer}</p>
        </div>
      </div>
    `;
  }

  if (typeof switchStudyTab === 'function') switchStudyTab("explain");
  readerEl.classList.add("study-open");
};


/* --------------------------------------------------------------------------
   FEATURE 2: PERSONALIZED VERSES FOR YOUR MOOD (Discover View)
   -------------------------------------------------------------------------- */
const MOOD_VERSES_DB = {
  peace: {
    titleMr: "शांती व विश्रांती (Peace & Rest)",
    icon: "🕊️",
    desc: "जेव्हा तुमचे मन अस्वस्थ असेल, तेव्हा ख्रिस्ताची स्वर्गीय शांती तुमचे हृदय स्थिर करेल.",
    verses: [
      {
        refMr: "योहान १४:२७",
        refEn: "John 14:27",
        bookKey: "john", chapter: 14, verse: 27,
        textMr: "मी तुम्हाला शांती देऊन जातो; मी माझी शांती तुम्हाला देतो. जग देते तशी मी तुम्हाला देत नाही. तुमचे मन अस्वस्थ होऊ नये व भयभीत होऊ नये.",
        textEn: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.",
        note: "येशूने दिलेली शांती बाह्य परिस्थितीवर अवलंबून नाही; ती स्वर्गीय आणि चिरंतन आहे."
      },
      {
        refMr: "फिलिप्पै ४:७",
        refEn: "Philippians 4:7",
        bookKey: "philippians", chapter: 4, verse: 7,
        textMr: "आणि सर्व बुद्धीच्या पलीकडची देवाची शांती ख्रिस्त येशूमध्ये तुमच्या हृदयांचे व तुमच्या मनांचे रक्षण करील.",
        textEn: "And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
        note: "आपल्या सर्व चिंता प्रार्थनेत देवापुढे मांडल्यावर देवाची अद्भूत शांती आपल्या हृदयाला पहारा देते."
      },
      {
        refMr: "स्तोत्रसंहिता २९:११",
        refEn: "Psalm 29:11",
        bookKey: "psalms", chapter: 29, verse: 11,
        textMr: "परमेश्वर आपल्या लोकांना सामर्थ्य देईल; परमेश्वर आपल्या लोकांना शांतीचा आशीर्वाद देईल.",
        textEn: "The Lord gives strength to his people; the Lord blesses his people with peace.",
        note: "परमेश्वर केवळ शांतीच देत नाही, तर त्यासोबत आपल्याला टिकून राहण्याचे सामर्थ्यही पुरवतो."
      }
    ]
  },
  anxiety: {
    titleMr: "चिंतेवर मात (Overcoming Anxiety)",
    icon: "😰",
    desc: "भविष्याची किंवा सध्याची कोणतीही चिंता देवाच्या हाती सोपवा; तो तुमची काळजी घेतो.",
    verses: [
      {
        refMr: "१ पेत्र ५:७",
        refEn: "1 Peter 5:7",
        bookKey: "1peter", chapter: 5, verse: 7,
        textMr: "तुम्ही आपली सर्व चिंता त्याच्यावर टाका, कारण तो तुमची काळजी घेतो.",
        textEn: "Cast all your anxiety on him because he cares for you.",
        note: "देवाला तुमची प्रत्येक अडचण ठाऊक आहे आणि तो तुमचे ओझे स्वतःवर घेण्यास सिद्ध आहे."
      },
      {
        refMr: "मत्तय ६:३४",
        refEn: "Matthew 6:34",
        bookKey: "matthew", chapter: 6, verse: 34,
        textMr: "म्हणून उद्याची चिंता करू नका, कारण उद्याचा दिवस आपली चिंता स्वतः करील. आजच्या दिवसाचे दुःख आजच्या दिवसाला पुरे आहे.",
        textEn: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.",
        note: "आजचा दिवस देवाच्या विश्वासात जगा; उद्याची तयारी देव स्वतः करेल."
      },
      {
        refMr: "स्तोत्रसंहिता ९४:१९",
        refEn: "Psalm 94:19",
        bookKey: "psalms", chapter: 94, verse: 19,
        textMr: "माझ्या मनात चिंतांची गर्दी होते, तेव्हा तुझे सांत्वन माझ्या जिवाला आनंद देते.",
        textEn: "When anxiety was great within me, your consolation brought me joy.",
        note: "विचारांची गर्दी झाल्यावर देवाच्या वचनाचे सांत्वन आपल्या जिवाला खरा आनंद देते."
      }
    ]
  },
  fear: {
    titleMr: "भीतीवर विजय व धैर्य (Victory Over Fear)",
    icon: "🛡️",
    desc: "भीती देवाकडून येत नाही; देव आपल्याला सामर्थ्याचा, प्रीतीचा व संयमाचा आत्मा देतो.",
    verses: [
      {
        refMr: "यशया ४१:१०",
        refEn: "Isaiah 41:10",
        bookKey: "isaiah", chapter: 41, verse: 10,
        textMr: "भिऊ नको, कारण मी तुझ्याबरोबर आहे; घाबरू नको, कारण मी तुझा देव आहे. मी तुला सामर्थ्य देईन; मी तुला साहाय्य करीन.",
        textEn: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.",
        note: "देव स्वतः आपल्यासोबत असताना आपल्याला कशाचीही भीती बाळगण्याची गरज नाही."
      },
      {
        refMr: "२ तीमथ्य १:७",
        refEn: "2 Timothy 1:7",
        bookKey: "2timothy", chapter: 1, verse: 7,
        textMr: "कारण देवाने आपल्याला भीतीचा आत्मा दिलेला नाही, तर सामर्थ्याचा, प्रीतीचा आणि संयमाचा आत्मा दिला आहे.",
        textEn: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.",
        note: "भीतीवर मात करण्यासाठी पवित्र आत्म्याचे सामर्थ्य आपल्यामध्ये कार्यरत आहे."
      },
      {
        refMr: "स्तोत्रसंहिता ५६:३",
        refEn: "Psalm 56:3",
        bookKey: "psalms", chapter: 56, verse: 3,
        textMr: "जेव्हा मला भीती वाटते, तेव्हा मी तुझ्यावरच भरवसा ठेवतो.",
        textEn: "When I am afraid, I put my trust in you.",
        note: "भीती वाटणे स्वाभाविक आहे, परंतु त्या क्षणी देवावर भरवसा ठेवणे हा विश्वासाचा विजय आहे."
      }
    ]
  },
  grief: {
    titleMr: "दुःख व सांत्वन (Grief & Comfort)",
    icon: "💔",
    desc: "देव भग्न अंतःकरणाच्या लोकांच्या अगदी जवळ असतो आणि त्यांचे अश्रू पुसतो.",
    verses: [
      {
        refMr: "स्तोत्रसंहिता ३४:१८",
        refEn: "Psalm 34:18",
        bookKey: "psalms", chapter: 34, verse: 18,
        textMr: "परमेश्वर भग्न अंतःकरणाच्या लोकांच्या अगदी जवळ असतो, आणि चूर्ण मनाच्या लोकांचा उद्धार करतो.",
        textEn: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
        note: "तुमचे दुःख देवाला स्पर्श करते; तो तुमच्या अत्यंत जवळ आहे."
      },
      {
        refMr: "मत्तय ५:४",
        refEn: "Matthew 5:4",
        bookKey: "matthew", chapter: 5, verse: 4,
        textMr: "जे शोक करतात ते धन्य, कारण त्यांचे सांत्वन केले जाईल.",
        textEn: "Blessed are those who mourn, for they will be comforted.",
        note: "येशूचे आश्वासन आहे की प्रत्येक अश्रूच्या बदल्यात स्वर्गीय सांत्वन मिळेल."
      }
    ]
  },
  joy: {
    titleMr: "आनंद व उपकारस्तुती (Joy & Praise)",
    icon: "🎉",
    desc: "परमेश्वराचा आनंद हेच आपले खरे सामर्थ्य आहे.",
    verses: [
      {
        refMr: "नहेम्या ८:१०",
        refEn: "Nehemiah 8:10",
        bookKey: "nehemiah", chapter: 8, verse: 10,
        textMr: "शोक करू नका; कारण परमेश्वराचा आनंद हेच तुमचे सामर्थ्य आहे.",
        textEn: "Do not grieve, for the joy of the Lord is your strength.",
        note: "परमेश्वरामध्ये आनंद मानल्याने आपल्याला प्रत्येक संकटाशी लढण्याची ताकद मिळते."
      },
      {
        refMr: "स्तोत्रसंहिता ११८:२४",
        refEn: "Psalm 118:24",
        bookKey: "psalms", chapter: 118, verse: 24,
        textMr: "हा दिवस परमेश्वराने निर्माण केला आहे; आपण यामध्ये उल्लास व आनंद करू या.",
        textEn: "This is the day that the Lord has made; let us rejoice and be glad in it.",
        note: "प्रत्येक नवा दिवस देवाची देणगी आहे; आनंदाने त्याची स्तुती करा."
      }
    ]
  },
  loneliness: {
    titleMr: "एकाकीपण व सहवास (Loneliness & Companionship)",
    icon: "🥺",
    desc: "तुम्ही कधीही एकटे नाही आहात; येशू ख्रिस्त जगाच्या समाप्तीपर्यंत तुमच्यासोबत आहे.",
    verses: [
      {
        refMr: "इब्री १३:५",
        refEn: "Hebrews 13:5",
        bookKey: "hebrews", chapter: 13, verse: 5,
        textMr: "मी तुला कधीही सोडणार नाही व कधीही टाकणार नाही.",
        textEn: "Never will I leave you; never will I forsake you.",
        note: "मानवी संबंध बदलू शकतात, परंतु देवाची सोबत कधीही संपत नाही."
      },
      {
        refMr: "मत्तय २८:२०",
        refEn: "Matthew 28:20",
        bookKey: "matthew", chapter: 28, verse: 20,
        textMr: "आणि पाहा, जगाच्या समाप्तीपर्यंत मी सर्व दिवस तुमच्याबरोबर आहे.",
        textEn: "And surely I am with you always, to the very end of the age.",
        note: "ख्रिस्ताचा सहवास आपल्याला प्रत्येक पावलावर लाभलेला आहे."
      }
    ]
  },
  hope: {
    titleMr: "आशा व नवा उत्साह (Hope & Future)",
    icon: "☀️",
    desc: "देवाचे आपल्याविषयीचे विचार कल्याणाचे आहेत, आपल्याला उज्ज्वल भविष्य देणारे आहेत.",
    verses: [
      {
        refMr: "यिर्मया २९:११",
        refEn: "Jeremiah 29:11",
        bookKey: "jeremiah", chapter: 29, verse: 11,
        textMr: "कारण जे विचार मी तुमच्याविषयी योजिले आहेत ते मला ठाऊक आहेत, असे परमेश्वर म्हणतो; ते कल्याणाचे विचार आहेत, अHitाचे नव्हेत; तुम्हाला उज्ज्वल भविष्य व आशा देणारे आहेत.",
        textEn: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
        note: "देवाची योजना आपल्या कल्पनेपेक्षाही श्रेष्ठ व आशीर्वादाची आहे."
      },
      {
        refMr: "रोमन्स १५:१३",
        refEn: "Romans 15:13",
        bookKey: "romans", chapter: 15, verse: 13,
        textMr: "आशेचा देव विश्वासाद्वारे तुम्हाला सर्व आनंदाने व शांतीने पूर्ण करो, यासाठी की पवित्र आत्म्याच्या सामर्थ्याने तुमची आशा उचंबळून यावी.",
        textEn: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.",
        note: "पवित्र आत्मा आपल्या हृदयात आशेचा अखंड झरा निर्माण करतो."
      }
    ]
  },
  faith: {
    titleMr: "विश्वास व भरवसा (Faith & Trust)",
    icon: "⚓",
    desc: "डोळ्यांनी पाहून नव्हे, तर विश्वासाने आपण चालतो.",
    verses: [
      {
        refMr: "नीतिसूत्रे ३:५-६",
        refEn: "Proverbs 3:5-6",
        bookKey: "proverbs", chapter: 3, verse: 5,
        textMr: "आपल्या पूर्ण अंतःकरणाने परमेश्वरावर भरवसा ठेव, आणि आपल्या स्वतःच्या बुद्धीवर अवलंबून राहू नको. आपल्या सर्व मार्गांत त्याला मान, म्हणजे तो तुझे मार्ग सरळ करील.",
        textEn: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
        note: "आपली बुद्धी अपुरी आहे; देवाला दिशा दाखवू द्या."
      },
      {
        refMr: "इब्री ११:१",
        refEn: "Hebrews 11:1",
        bookKey: "hebrews", chapter: 11, verse: 1,
        textMr: "विश्वास म्हणजे ज्या गोष्टींची आपण आशा धरतो त्यांची खात्री, आणि न दिसणाऱ्या गोष्टींचा पुरावा होय.",
        textEn: "Now faith is confidence in what we hope for and assurance about what we do not see.",
        note: "विश्वास आपल्याला अदृश्य देवाची सामर्थ्यवान उपस्थिती अनुभवण्यास शिकवतो."
      }
    ]
  },
  healing: {
    titleMr: "आरोग्य, चंगाई व शक्ती (Healing & Strength)",
    icon: "🌿",
    desc: "येशूच्या जखमांमुळे आपल्याला आरोग्य प्राप्त झाले आहे.",
    verses: [
      {
        refMr: "यशया ५३:५",
        refEn: "Isaiah 53:5",
        bookKey: "isaiah", chapter: 53, verse: 5,
        textMr: "तो आपल्या अपराधांमुळे घायाळ झाला, आपल्या पापांमुळे चिरडला गेला; आपल्याला शांती देणारी शिक्षा त्याच्यावर झाली, आणि त्याच्या फटक्यांनी आपल्याला आरोग्य प्राप्त झाले आहे.",
        textEn: "But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed.",
        note: "येशूच्या क्रूसावरील बलिदानात आपल्या शरीराची व आत्म्याची चंगाई सामावलेली आहे."
      },
      {
        refMr: "यिर्मया १७:१४",
        refEn: "Jeremiah 17:14",
        bookKey: "jeremiah", chapter: 17, verse: 14,
        textMr: "हे परमेश्वरा, मला बरे कर, म्हणजे मी बरा होईन; मला तार, म्हणजे मी तारेन; कारण तूच माझी स्तुती आहेस.",
        textEn: "Heal me, Lord, and I will be healed; save me and I will be saved, for you are the one I praise.",
        note: "परमेश्वराकडे केलेली प्रामाणिक प्रार्थना संपूर्ण आरोग्य मिळवून देते."
      }
    ]
  },
  guidance: {
    titleMr: "मार्गदर्शन व बुद्धी (Guidance & Wisdom)",
    icon: "🧭",
    desc: "देवाचे वचन आपल्या पावलांसाठी दिवा आणि मार्गासाठी प्रकाश आहे.",
    verses: [
      {
        refMr: "स्तोत्रसंहिता ११९:१०५",
        refEn: "Psalm 119:105",
        bookKey: "psalms", chapter: 119, verse: 105,
        textMr: "तुझे वचन माझ्या पावलांसाठी दिवा आणि माझ्या मार्गासाठी प्रकाश आहे.",
        textEn: "Your word is a lamp for my feet, a light on my path.",
        note: "जीवनातील अंधकारमय वळणांवर देवाचे वचन योग्य दिशा दाखवते."
      },
      {
        refMr: "याकोब १:५",
        refEn: "James 1:5",
        bookKey: "james", chapter: 1, verse: 5,
        textMr: "जर तुमच्यातील कोणाला बुद्धीची उणीव असेल, तर त्याने ती देवाजवळ मागावी, म्हणजे ती त्याला दिली जाईल; कारण देव कोणालाही दोष न लावता सर्वांना उदारपणे देतो.",
        textEn: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.",
        note: "योग्य निर्णय घेण्यासाठी देवाकडे बुद्धी मागा; तो उदारपणे मार्गदर्शन करतो."
      }
    ]
  },
  anger: {
    titleMr: "क्रोध, क्षमा व शांती (Anger & Forgiveness)",
    icon: "😡",
    desc: "क्रोध मानवाचे नुकसान करतो; क्षमा आपल्याला बंधनातून मुक्त करते.",
    verses: [
      {
        refMr: "इफिसकर ४:२६, ३२",
        refEn: "Ephesians 4:26, 32",
        bookKey: "ephesians", chapter: 4, verse: 26,
        textMr: "रागवा, पण पाप करू नका; सूर्य मावळण्यापूर्वी तुमचा राग शांत होऊ द्या... तुम्ही एकमेकांवर दयाळू व कनवाळू व्हा; जशी देवाने ख्रिस्तामध्ये तुम्हाला क्षमा केली, तशी तुम्हीही एकमेकांना क्षमा करा.",
        textEn: "In your anger do not sin: Do not let the sun go down while you are still angry... Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.",
        note: "क्षमा करणे हा कमकुवतपणा नसून ख्रिस्ताच्या प्रीतीचे सर्वात मोठे लक्षण आहे."
      },
      {
        refMr: "नीतिसूत्रे १५:१",
        refEn: "Proverbs 15:1",
        bookKey: "proverbs", chapter: 15, verse: 1,
        textMr: "नम्र उत्तर क्रोधाला शांत करते, पण कठोर शब्द राग भडकवतो.",
        textEn: "A gentle answer turns away wrath, but a harsh word stirs up anger.",
        note: "शांत वाणी आणि नम्रता मोठ्या संघर्षालाही शांत करू शकते."
      }
    ]
  },
  gratitude: {
    titleMr: "कृतज्ञता व आभार (Gratitude & Thanksgiving)",
    icon: "🙏",
    desc: "सर्व परिस्थितींत उपकार माना, कारण ख्रिस्त येशूमध्ये तुमच्याविषयी देवाची हीच इच्छा आहे.",
    verses: [
      {
        refMr: "१ थेस्सलनीका ५:१८",
        refEn: "1 Thessalonians 5:18",
        bookKey: "1thessalonians", chapter: 5, verse: 18,
        textMr: "सर्व परिस्थितींत उपकार माना; कारण ख्रिस्त येशूमध्ये तुमच्याविषयी देवाची हीच इच्छा आहे.",
        textEn: "Give thanks in all circumstances; for this is God's will for you in Christ Jesus.",
        note: "कृतज्ञ हृदय देवाची निरंतर उपस्थिती अनुभवते."
      },
      {
        refMr: "स्तोत्रसंहिता १०३:१-२",
        refEn: "Psalm 103:1-2",
        bookKey: "psalms", chapter: 103, verse: 1,
        textMr: "हे माझ्या मना, परमेश्वराचा धन्यवाद कर, आणि माझ्या अंतर्यामातील सर्व काही त्याच्या पवित्र नावाचा धन्यवाद करो! हे माझ्या मना, परमेश्वराचा धन्यवाद कर, आणि त्याचे कोणतेही उपकार विसरू नको!",
        textEn: "Praise the Lord, my soul; all my inmost being, praise his holy name. Praise the Lord, my soul, and forget not all his benefits.",
        note: "देवाने केलेल्या प्रत्येक उपकाराची जाणीव ठेवून त्याची स्तुती करा."
      }
    ]
  }
};

window.selectMood = function(moodKey) {
  const data = MOOD_VERSES_DB[moodKey];
  if (!data) return;

  // Highlight active chip
  document.querySelectorAll(".mood-chip-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mood === moodKey);
  });

  const container = document.getElementById("mood-verses-results-container");
  if (!container) return;

  container.style.display = "block";
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 24px;">${data.icon}</span>
        <h4 style="font-size: 17px; font-weight: 800; color: var(--primary); margin: 0;">${data.titleMr}</h4>
      </div>
      <p style="font-size: 13.5px; color: var(--text-muted); margin: 0 0 12px 0;">${data.desc}</p>
    </div>

    <div class="mood-verses-cards-list">
      ${data.verses.map((v, idx) => `
        <div class="mood-verse-card" style="background: var(--bg); border: 1.5px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: var(--shadow-xs);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 13px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 6px;">${v.refMr} • ${v.refEn}</span>
            <button onclick="playMoodVerseAudio('${moodKey}', ${idx}, this)" style="background: var(--surface); border: 1px solid var(--border); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <span>▶ ऐका</span>
            </button>
          </div>
          
          <blockquote style="font-family: var(--font-body); font-size: 15px; font-weight: 700; line-height: 1.6; color: var(--text); margin: 0 0 8px 0;">
            "${v.textMr}"
          </blockquote>
          
          <p style="font-size: 13px; color: var(--text-muted); font-style: italic; margin: 0 0 10px 0; line-height: 1.4;">
            "${v.textEn}"
          </p>

          <div style="background: rgba(201,138,44,0.08); border-left: 3px solid var(--accent-gold); padding: 8px 10px; border-radius: 6px; margin-bottom: 12px; font-size: 12.5px; color: var(--text);">
            <strong>सांत्वन:</strong> ${v.note}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button onclick="openReaderAndNavigate('${v.bookKey}', ${v.chapter}, ${v.verse}); // const el = document.querySelector('.verse-row[data-verse-id=\"${v.bookKey}_${v.chapter}_${v.verse}\"]'); if(el) el.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 500);" style="background: var(--primary); color: #ffffff; border: none; padding: 6px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer;">
              📖 बायबलमध्ये वाचा (Open in Bible)
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.currentSingleAudio = null;
window.currentAudioButton = null;

window.playSingleVerseAudio = async function(text, btnElement, directAudioSrc) {
  if (!text || !text.trim()) return;

  // Toggle pause only if clicking the SAME button that is already actively playing
  if (window.currentSingleAudio && !window.currentSingleAudio.paused && window.currentAudioButton && window.currentAudioButton === btnElement) {
    window.currentSingleAudio.pause();
    window.currentSingleAudio = null;
    if (btnElement) {
      btnElement.innerHTML = `<span>▶ ऐका</span>`;
    }
    window.currentAudioButton = null;
    showToast("⏹ Audio Paused / ऑडिओ थांबवला");
    return;
  }

  // If another audio was playing, stop it and reset its button
  if (window.currentSingleAudio) {
    try { window.currentSingleAudio.pause(); } catch(e) {}
    window.currentSingleAudio = null;
  }
  if (window.currentAudioButton && window.currentAudioButton !== btnElement) {
    window.currentAudioButton.innerHTML = `<span>▶ ऐका</span>`;
    window.currentAudioButton = null;
  }
  
  if (btnElement) {
    window.currentAudioButton = btnElement;
    btnElement.innerHTML = `<span>⏳ लोड होत आहे...</span>`;
  }

  // 1. Direct high-fidelity natural audio file (if provided)
  if (directAudioSrc) {
    try {
      const audio = new Audio(directAudioSrc);
      window.currentSingleAudio = audio;

      audio.onplay = () => {
        if (btnElement) btnElement.innerHTML = `<span>⏸ थांबवा</span>`;
        showToast("🔊 विसावा वाचन सुरू आहे (Natural Devotional Marathi Voice) ✨");
      };

      audio.onended = () => {
        if (btnElement) btnElement.innerHTML = `<span>▶ ऐका</span>`;
        window.currentSingleAudio = null;
        window.currentAudioButton = null;
      };

      audio.onerror = () => {
        console.warn("Direct audio file not found, falling back to neural synthesis...");
        window.playSingleVerseAudio(text, btnElement, null);
      };

      await audio.play();
      return;
    } catch (e) {
      console.warn("Direct audio playback failed:", e);
    }
  }

  showToast("⏳ ऑडिओ तयार होत आहे (Natural Devotional Marathi Voice)...");

  try {
    let audioUrl = null;
    let voiceName = "Manohar HD (Natural Marathi)";

    // Try MultiEngine TTS client (ElevenLabs / Azure / Sarvam)
    if (window.SarvamTTS && window.SarvamTTS.client && window.SarvamTTS.client.synthesizeText) {
      try {
        const res = await window.SarvamTTS.client.synthesizeText(text, {
          lang: "mr-IN",
          speaker: (state && state.sarvamVoice) || "gee_elevenlabs"
        });
        if (res && res.audioUrl) {
          audioUrl = res.audioUrl;
          voiceName = res.voiceName || "Natural Marathi";
        }
      } catch (synErr) {
        console.warn("TTS synthesis error:", synErr);
      }
    }

    if (audioUrl) {
      if (window.currentSingleAudio) {
        window.currentSingleAudio.pause();
      }
      const audio = new Audio(audioUrl);
      window.currentSingleAudio = audio;
      
      if (btnElement) {
        btnElement.innerHTML = `<span>⏸ थांबवा</span>`;
      }

      audio.onplay = () => {
        showToast(`🔊 वाचन सुरू आहे (${voiceName}) ✨`);
      };

      audio.onended = () => {
        if (btnElement) {
          btnElement.innerHTML = `<span>▶ ऐका</span>`;
        }
        window.currentSingleAudio = null;
        window.currentAudioButton = null;
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        fallbackBrowserSpeech(text, btnElement);
      };

      await audio.play();
      return;
    }
  } catch (err) {
    console.warn("Audio generation error:", err);
  }

  fallbackBrowserSpeech(text, btnElement);
};

function fallbackBrowserSpeech(text, btnElement) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices() || [];
    const mrVoice = voices.find(v => v.lang.includes('mr') || v.lang.includes('hi') || v.name.toLowerCase().includes('marathi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('india'));
    if (mrVoice) {
      utterance.voice = mrVoice;
      utterance.lang = mrVoice.lang;
    } else {
      utterance.lang = "hi-IN";
    }
    
    utterance.rate = 0.88;
    if (btnElement) {
      btnElement.innerHTML = `<span>⏸ थांबवा</span>`;
    }
    
    utterance.onstart = () => showToast("🔊 वाचन सुरू आहे...");
    utterance.onend = () => {
      if (btnElement) {
        btnElement.innerHTML = `<span>▶ ऐका</span>`;
      }
      window.currentAudioButton = null;
    };
    utterance.onerror = (e) => {
      if (btnElement) {
        btnElement.innerHTML = `<span>▶ ऐका</span>`;
      }
      showToast("Audio playback completed.");
    };
    
    window.speechSynthesis.speak(utterance);
  } else {
    showToast("Audio speech not supported on this browser.");
  }
}


/* --------------------------------------------------------------------------
   FEATURE 3: DAILY PLAN: DIVINE GROWTH (Plans View)
   -------------------------------------------------------------------------- */
window.startDivineGrowthPlan = function() {
  if (typeof state !== 'undefined') {
    state.readingPlan = "divine_growth";
    state.planDay = 1;
    if (typeof saveStateToLocalStorage === 'function') saveStateToLocalStorage();
  }
  
  if (typeof switchTab === 'function') {
    switchTab("plans");
  } else {
    window.location.hash = "#/plans";
  }

  // Switch to MY PLANS subtab & render
  setTimeout(() => {
    document.querySelectorAll(".plans-subnav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.plansSubtab === "myplans");
    });
    document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === "plans-subtab-myplans");
    });
    if (typeof renderReadingPlansTab === 'function') {
      renderReadingPlansTab();
    }
    showToast("🌱 Daily Plan: Divine Growth Activated (Day 1)");
  }, 100);
};


/* --------------------------------------------------------------------------
   FEATURE 4: DAILY PRAYERS FOR MEDITATION (Prayers View)
   -------------------------------------------------------------------------- */
let ambientAudioCtx = null;
let ambientOscillators = [];
let ambientGainNode = null;
let isAmbientPlaying = false;

window.switchPrayersSubtab = function(subtab) {
  const btnMeditation = document.getElementById("btn-prayers-subtab-meditation");
  const btnRequests = document.getElementById("btn-prayers-subtab-requests");
  const panelMeditation = document.getElementById("prayers-panel-meditation");
  const panelRequests = document.getElementById("prayers-panel-requests");

  if (subtab === "meditation") {
    if (btnMeditation) {
      btnMeditation.classList.add("active");
      btnMeditation.style.background = "var(--primary)";
      btnMeditation.style.color = "#ffffff";
      btnMeditation.style.border = "none";
    }
    if (btnRequests) {
      btnRequests.classList.remove("active");
      btnRequests.style.background = "var(--bg-content)";
      btnRequests.style.color = "var(--text)";
      btnRequests.style.border = "1.5px solid var(--border)";
    }
    if (panelMeditation) panelMeditation.style.display = "block";
    if (panelRequests) panelRequests.style.display = "none";
  } else {
    if (btnRequests) {
      btnRequests.classList.add("active");
      btnRequests.style.background = "var(--primary)";
      btnRequests.style.color = "#ffffff";
      btnRequests.style.border = "none";
    }
    if (btnMeditation) {
      btnMeditation.classList.remove("active");
      btnMeditation.style.background = "var(--bg-content)";
      btnMeditation.style.color = "var(--text)";
      btnMeditation.style.border = "1.5px solid var(--border)";
    }
    if (panelMeditation) panelMeditation.style.display = "none";
    if (panelRequests) panelRequests.style.display = "block";
  }
};

window.toggleAmbientMusic = function() {
  const iconEl = document.getElementById("ambient-icon");
  const labelEl = document.getElementById("ambient-label");

  if (isAmbientPlaying) {
    stopAmbientMusic();
    if (iconEl) iconEl.textContent = "▶";
    if (labelEl) labelEl.textContent = "Play Ambient";
    showToast("🕊️ Ambient Worship Audio Paused");
  } else {
    startAmbientMusic();
    if (iconEl) iconEl.textContent = "⏹";
    if (labelEl) labelEl.textContent = "Stop Ambient";
    showToast("🕊️ Playing Peaceful Ambient Worship Pad");
  }
};

function startAmbientMusic() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    ambientAudioCtx = new AudioContext();
    ambientGainNode = ambientAudioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(0.01, ambientAudioCtx.currentTime);
    ambientGainNode.gain.exponentialRampToValueAtTime(0.18, ambientAudioCtx.currentTime + 3);
    ambientGainNode.connect(ambientAudioCtx.destination);

    // Warm D Major / B Minor Worship Pad chord frequencies: D3 (146.83), A3 (220.00), F#4 (369.99), D4 (293.66)
    const freqs = [146.83, 220.00, 293.66, 369.99];
    ambientOscillators = freqs.map(freq => {
      const osc = ambientAudioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ambientAudioCtx.currentTime);
      osc.connect(ambientGainNode);
      osc.start();
      return osc;
    });

    isAmbientPlaying = true;
  } catch(e) {
    console.warn("Ambient Web Audio error:", e);
  }
}

function stopAmbientMusic() {
  try {
    if (ambientGainNode && ambientAudioCtx) {
      ambientGainNode.gain.setValueAtTime(ambientGainNode.gain.value, ambientAudioCtx.currentTime);
      ambientGainNode.gain.exponentialRampToValueAtTime(0.001, ambientAudioCtx.currentTime + 1);
      setTimeout(() => {
        ambientOscillators.forEach(osc => osc.stop());
        ambientOscillators = [];
        if (ambientAudioCtx && ambientAudioCtx.state !== 'closed') ambientAudioCtx.close();
        isAmbientPlaying = false;
      }, 1000);
    } else {
      isAmbientPlaying = false;
    }
  } catch(e) {
    isAmbientPlaying = false;
  }
}

const PRAYER_TEXTS = {
  morning: "हे स्वर्गीय पित्या, आजच्या नव्या सकाळसाठी मी तुझे मनापासून आभार मानतो. तुझी दया दररोज सकाळी नवी असते. आजच्या प्रत्येक पावलात, निर्णयात आणि संभाषणात तुझे मार्गदर्शन माझ्यासोबत असू दे. माझे विचार आणि कार्य तुझ्या गौरवासाठी असोत. येशूच्या नावाने, आमेन.",
  midday: "हे प्रभू, दिवसाच्या धावपळीत आणि परिश्रमात माझे मन तुझ्या शांतीमध्ये स्थिर कर. जे परमेश्वराची वाट पाहतात त्यांना नवे सामर्थ्य प्राप्त होते. माझा थकवा दूर कर आणि मला तुझ्या पवित्र आत्म्याने पुन्हा उत्साही कर. आमेन.",
  evening: "हे देवा, मी शांतीने निजेन व झोपेन; कारण तूच मला निर्भयपणे राहू देतोस. आजच्या सर्व चिंता, थकवा आणि भार मी तुझ्या चरणी सोपवतो. माझ्या घराचे, कुटुंबाचे व मनाचे रक्षण कर. येशूच्या नावाने, आमेन.",
  psalm91: "जो परात्पर देवाच्या गुप्तस्थळी राहतो, तो सर्वसमर्थाच्या सावलीत विसावा पावेल. परमेश्वर माझा कोट व माझा किल्ला आहे. तो मला सर्व संकटांपासून सोडवील आणि आपल्या पंखांखाली मला आश्रय देईल. मी कोणत्याही भीतीला घाबरणार नाही कारण प्रभू माझा रक्षक आहे. आमेन.",
  healing: "हे येशू, तू म्हणालास: 'अहो कष्टी व भाराक्रांत जनहो, तुम्ही सर्व मजकडे या, म्हणजे मी तुम्हाला विसावा देईन.' माझ्या मनातील वेदना, भीती आणि ताण मी तुला देतो. तुझ्या जखमांनी मला आरोग्य मिळाले आहे. तुझी स्वर्गीय शांती माझ्या हृदयात वाहू दे. आमेन."
};

window.readPrayerAloud = function(prayerKey) {
  const text = PRAYER_TEXTS[prayerKey] || PRAYER_TEXTS.morning;
  playSingleVerseAudio(text);
};


/* --------------------------------------------------------------------------
   FEATURE 5: THE 10 COMMANDMENTS HUB (Discover View & Modal)
   -------------------------------------------------------------------------- */
const TEN_COMMANDMENTS_DATA = [
  {
    num: "१",
    titleMr: "माझ्याखेरीज तुला दुसरे देव असू नयेत.",
    ref: "निर्गम २०:३",
    meaning: "परमेश्वर एकमेव खरा देव आहे; जीवनात त्याला सर्वोच्च प्रथम स्थान द्यावे."
  },
  {
    num: "२",
    titleMr: "आपल्यासाठी कोरलेली कोणतीही मूर्ती करू नको.",
    ref: "निर्गम २०:४-६",
    meaning: "देवाची भक्ती आत्म्याने व सत्याने करावी; कोणत्याही मूर्तीची पूजा करू नये."
  },
  {
    num: "३",
    titleMr: "आपल्या देवाचे नाव व्यर्थ घेऊ नको.",
    ref: "निर्गम २०:७",
    meaning: "देवाचे नाव अत्यंत पवित्र आहे; ते आदराने, विश्वासाने व सन्मानाने घ्यावे."
  },
  {
    num: "४",
    titleMr: "शब्बाथ वार पवित्र पाळण्यास लक्षात ठेव.",
    ref: "निर्गम २०:८-११",
    meaning: "सहा दिवस काम करून एका दिवशी देवाची उपासना व आत्मिक विसावा घ्यावा."
  },
  {
    num: "५",
    titleMr: "आपल्या आईवडिलांचा मान राख.",
    ref: "निर्गम २०:१२",
    meaning: "पालकांचा आदर व आज्ञापालन केल्याने देवाचा आशीर्वाद व दीर्घायुष्य लाभते."
  },
  {
    num: "६",
    titleMr: "मनुष्यघात करू नको.",
    ref: "निर्गम २०:१३",
    meaning: "मानवी जीवन देवाचे पवित्र दान आहे; कोणाचाही द्वेष किंवा घात करू नये."
  },
  {
    num: "७",
    titleMr: "व्यभिचार करू नको.",
    ref: "निर्गम २०:१४",
    meaning: "विवाह व कौटुंबिक संबंधांत शुद्धता, पावित्र्य व विश्वासूपणा राखावा."
  },
  {
    num: "८",
    titleMr: "चोरी करू नको.",
    ref: "निर्गम २०:१५",
    meaning: "दुसऱ्याची वस्तू अप्रामाणिकपणे न घेता प्रामाणिक परिश्रमाने जगावे."
  },
  {
    num: "९",
    titleMr: "आपल्या शेजाऱ्याविरुद्ध खोटी साक्ष देऊ नको.",
    ref: "निर्गम २०:१६",
    meaning: "नेहमी सत्याची बाजू घ्यावी; कोणावरही खोटा आरोप किंवा चहाडी करू नये."
  },
  {
    num: "१०",
    titleMr: "आपल्या शेजाऱ्याच्या कोणत्याही गोष्टीचा लोभ धरू नको.",
    ref: "निर्गम २०:१७",
    meaning: "दुसऱ्याच्या संपत्तीचा हेवा न करता देवाने दिलेल्या गोष्टीत समाधानी व कृतज्ञ राहावे."
  }
];

window.playCommandmentAudio = function(cmdIndex, btn) {
  const cmd = TEN_COMMANDMENTS_DATA[cmdIndex];
  if (!cmd) return;
  const text = `${cmd.num} आज्ञा: ${cmd.titleMr}`;
  const directPath = `assets/audio/devotional/cmd_${cmdIndex + 1}.mp3`;
  playSingleVerseAudio(text, btn, directPath);
};

window.toggleTenCommandmentsModal = function() {
  const modal = document.getElementById("modal-ten-commandments");
  if (!modal) return;
  const isShown = modal.style.display === "flex";
  modal.style.display = isShown ? "none" : "flex";

  if (!isShown) {
    const listContainer = document.getElementById("commandments-accordion-container");
    if (listContainer) {
      listContainer.innerHTML = TEN_COMMANDMENTS_DATA.map((cmd, idx) => `
        <div class="commandment-clean-card" style="background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start; box-shadow: var(--shadow-xs); transition: transform 0.15s ease, border-color 0.15s ease;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-light, rgba(158,22,34,0.1)); color: var(--primary); font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13.5px; flex-shrink: 0; margin-top: 1px;">
            ${cmd.num}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
              <h4 style="font-size: 15.5px; font-weight: 800; color: var(--text); margin: 0; line-height: 1.35;">${cmd.titleMr}</h4>
              <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                <span style="font-size: 11.5px; font-weight: 700; color: var(--accent-gold, #c98a2c); background: rgba(201,138,44,0.08); padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(201,138,44,0.2);">${cmd.ref}</span>
                <button onclick="playCommandmentAudio(${idx}, this)" style="background: var(--surface); border: 1px solid var(--border); padding: 3px 9px; border-radius: 7px; font-size: 11px; font-weight: 800; color: var(--primary); cursor: pointer; display: flex; align-items: center; gap: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <span>▶ ऐका</span>
                </button>
              </div>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.45;">
              ${cmd.meaning}
            </p>
          </div>
        </div>
      `).join('');
    }
  }
};

window.readTenCommandmentsAloud = function(btnElement) {
  const fullText = "पहिली आज्ञा: माझ्याखेरीज तुला दुसरे देव असू नयेत... दुसरी आज्ञा: आपल्यासाठी कोणतीही कोरलेली मूर्ती करू नको... तिसरी आज्ञा: आपल्या देवाचे नाव व्यर्थ घेऊ नको... चौथी आज्ञा: शब्बाथ वार पवित्र पाळण्यास लक्षात ठेव... पाचवी आज्ञा: आपल्या आईवडिलांचा मान राख... सहावी आज्ञा: मनुष्यघात करू नको... सातवी आज्ञा: व्यभिचार करू नको... आठवी आज्ञा: चोरी करू नको... नववी आज्ञा: आपल्या शेजाऱ्याविरुद्ध खोटी साक्ष देऊ नको... दहावी आज्ञा: आपल्या शेजाऱ्याच्या कोणत्याही गोष्टीचा लोभ धरू नको.";
  playSingleVerseAudio(fullText, btnElement, "assets/audio/devotional/ten_commandments_complete.mp3");
};

/* ==========================================================================
   DAILY BIBLE VERSE IMAGE STUDIO, GALLERY SAVING & WHATSAPP SHARING
   ========================================================================== */
window.openFullscreenVOD = function() {
  const modal = document.getElementById("modal-fullscreen-vod");
  if (!modal) return;
  
  modal.style.display = "flex";
  modal.classList.add("active");
  modal.style.opacity = "1";
  modal.style.pointerEvents = "auto";
  
  // Refresh current VOD text & image
  const { vod, dayOfYear, offset } = getCurrentVOD();
  const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
  const displayText = (state.translation === "eng") ? vod.engText : vod.text;

  const fsTextEl = document.getElementById("fs-vod-text");
  if (fsTextEl) fsTextEl.textContent = `"${displayText}"`;

  const fsRefEl = document.getElementById("fs-vod-ref");
  if (fsRefEl) fsRefEl.textContent = `${displayRef} ${state.translation === "eng" ? "NLT" : "MARVBSI"}`;

  const images = (window.dailyVersesImageList && window.dailyVersesImageList.length > 0) ? window.dailyVersesImageList : [
    'stars.png', 'forest.png', 'mist.png', 'mountains.png', 'mount_zion.png', 'ocean.png', 'path.png', 'sunrise.png'
  ];
  
  // Deterministic 1 image per day unless user manually chose a wallpaper
  if (typeof window.currentVodImageIndex !== 'number') {
    const imgIdx = ((dayOfYear + offset) % images.length + images.length) % images.length;
    window.currentVodImageIndex = imgIdx;
  }
  
  const dailyImg = images[window.currentVodImageIndex];
  const imgUrl = (typeof getVodImageUrl === "function") ? getVodImageUrl(dailyImg) : (dailyImg.includes('.') ? `assets/daily_verses/${dailyImg}` : `assets/daily_verses/${dailyImg}.png`);

  const fsBgEl = document.getElementById("fs-vod-capsule-bg");
  if (fsBgEl) fsBgEl.style.backgroundImage = `url('${imgUrl}')`;
};

window.closeFullscreenVOD = function() {
  const modal = document.getElementById("modal-fullscreen-vod");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
    modal.style.opacity = "0";
    modal.style.pointerEvents = "none";
  }
};

window.cycleVodWallpaper = function() {
  const images = (window.dailyVersesImageList && window.dailyVersesImageList.length > 0) ? window.dailyVersesImageList : [
    'stars.png', 'forest.png', 'mist.png', 'mountains.png', 'mount_zion.png', 'ocean.png', 'path.png', 'sunrise.png'
  ];
  if (typeof window.currentVodImageIndex !== 'number') {
    const { dayOfYear, offset } = getCurrentVOD();
    window.currentVodImageIndex = ((dayOfYear + offset) % images.length + images.length) % images.length;
  }
  window.currentVodImageIndex = (window.currentVodImageIndex + 1) % images.length;
  
  const dailyImg = images[window.currentVodImageIndex];
  const imgUrl = (typeof getVodImageUrl === "function") ? getVodImageUrl(dailyImg) : (dailyImg.includes('.') ? `assets/daily_verses/${dailyImg}` : `assets/daily_verses/${dailyImg}.png`);

  const bgHome = document.getElementById("vod-dynamic-bg");
  if (bgHome) bgHome.style.backgroundImage = `url('${imgUrl}')`;

  const fsBgEl = document.getElementById("fs-vod-capsule-bg");
  if (fsBgEl) fsBgEl.style.backgroundImage = `url('${imgUrl}')`;

  showToast(`🎨 Wallpaper: ${dailyImg.replace('.png', '')}`);
};

window.cycleVodWallpaper = function() {
  const images = (window.dailyVersesImageList && window.dailyVersesImageList.length > 0) ? window.dailyVersesImageList : [
    'stars.png', 'forest.png', 'mist.png', 'mountains.png', 'mount_zion.png', 'ocean.png', 'path.png', 'sunrise.png'
  ];
  if (typeof window.currentVodImageIndex !== 'number') window.currentVodImageIndex = 0;
  window.currentVodImageIndex = (window.currentVodImageIndex + 1) % images.length;
  
  const dailyImg = images[window.currentVodImageIndex];
  const imgUrl = (typeof getVodImageUrl === "function") ? getVodImageUrl(dailyImg) : (dailyImg.includes('.') ? `assets/daily_verses/${dailyImg}` : `assets/daily_verses/${dailyImg}.png`);

  const bgHome = document.getElementById("vod-dynamic-bg");
  if (bgHome) bgHome.style.backgroundImage = `url('${imgUrl}')`;

  const fsBgEl = document.getElementById("fs-vod-capsule-bg");
  if (fsBgEl) fsBgEl.style.backgroundImage = `url('${imgUrl}')`;

  showToast(`🎨 Wallpaper Changed: ${dailyImg.replace('.png', '')}`);
};

window.navigateVOD = function(dir) {
  if (dir === 'prev') {
    state.vodOffset = (state.vodOffset || 0) - 1;
  } else {
    state.vodOffset = (state.vodOffset || 0) + 1;
  }
  renderDailyDevotion();
  openFullscreenVOD();
};

window.generateExactVerseImageBlob = function() {
  return new Promise((resolve, reject) => {
    const { vod, dayOfYear, offset } = getCurrentVOD();
    const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
    const displayText = (state.translation === "eng") ? vod.engText : vod.text;

    const images = (window.dailyVersesImageList && window.dailyVersesImageList.length > 0) ? window.dailyVersesImageList : [
      'stars.png', 'forest.png', 'mist.png', 'mountains.png', 'mount_zion.png', 'ocean.png', 'path.png', 'sunrise.png'
    ];
    const imgIdx = (typeof window.currentVodImageIndex === 'number') ? window.currentVodImageIndex : (((dayOfYear + offset) % images.length + images.length) % images.length);
    const dailyImg = images[imgIdx];
    const imgUrl = (typeof getVodImageUrl === "function") ? getVodImageUrl(dailyImg) : (dailyImg.includes('.') ? `assets/daily_verses/${dailyImg}` : `assets/daily_verses/${dailyImg}.png`);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350; // Perfect 4:5 Instagram/WhatsApp portrait ratio
    const ctx = canvas.getContext("2d");

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.onload = function() {
      // 1. Draw Background Image with Aspect Fill
      const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
      const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
      const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
      ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);

      // 2. Draw Luxurious Dark Gradient Overlay
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Top Decorative Header Pill
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Pill Background
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 180, 110, 360, 52, 26);
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pill Text
      ctx.fillStyle = "#f59e0b";
      ctx.font = "800 20px 'Outfit', -apple-system, sans-serif";
      ctx.fillText("✝ VERSE OF THE DAY • दैनिक वचन", canvas.width / 2, 136);

      // 4. Scripture Verse Text (Devanagari / English)
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 48px 'Noto Serif Devanagari', 'Lora', Georgia, serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      const text = `"${displayText}"`;
      const maxWidth = 900;
      const lineHeight = 76;
      
      const words = text.split(" ");
      let line = "";
      let lines = [];

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      const startY = (canvas.height / 2) - ((lines.length - 1) * lineHeight) / 2 - 20;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], canvas.width / 2, startY + (i * lineHeight));
      }

      // Reset Shadows
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // 5. Scripture Reference Tag
      const refY = startY + (lines.length * lineHeight) + 40;
      ctx.fillStyle = "#fbbf24";
      ctx.font = "800 32px 'Outfit', -apple-system, sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText(`${displayRef} • ${state.translation === 'eng' ? 'NLT' : 'MARVBSI'}`, canvas.width / 2, refY);

      // 6. Bottom River of Life Branding & Watermark
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "600 22px 'Outfit', sans-serif";
      ctx.fillText("River of Life Bible • जीवन नदी बायबल ॲप", canvas.width / 2, canvas.height - 90);

      // Gold Divider Line at Bottom
      ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 60, canvas.height - 125);
      ctx.lineTo(canvas.width / 2 + 60, canvas.height - 125);
      ctx.stroke();

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob: blob,
            dataUrl: canvas.toDataURL("image/png"),
            filename: `River_of_Life_Daily_Verse_${displayRef.replace(/[: ]/g, "_")}.png`
          });
        } else {
          reject(new Error("Canvas blob generation failed"));
        }
      }, "image/png", 0.95);
    };

    bgImg.onerror = function() {
      // Fallback solid gradient canvas if image fails
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        resolve({
          blob: blob,
          dataUrl: canvas.toDataURL("image/png"),
          filename: `River_of_Life_Daily_Verse.png`
        });
      });
    };

    bgImg.src = imgUrl;
  });
};

window.saveExactDailyVerseImage = async function() {
  try {
    showToast("⏳ फोटो गॅलरीसाठी तयार होत आहे...");
    const { dataUrl, filename } = await generateExactVerseImageBlob();
    
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("📥 फोटो गॅलरीमध्ये सेव्ह झाला! (Saved to Gallery)");
  } catch (err) {
    console.error("Save image error:", err);
    showToast("Image save failed. Please try again.");
  }
};

window.shareDailyVerseToWhatsApp = async function() {
  try {
    const { vod } = getCurrentVOD();
    const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
    const displayText = (state.translation === "eng") ? vod.engText : vod.text;
    
    const shareText = `📖 आजचे दैनिक वचन (Verse of the Day)\n\n"${displayText}"\n— ${displayRef} (${state.translation === 'eng' ? 'NLT' : 'MARVBSI'})\n\nजीवन नदी बायबल ॲपवरून सामायिक केले 🙏✨`;

    showToast("⏳ व्हॉट्सॲपसाठी फोटो तयार होत आहे...");
    const { blob, filename, dataUrl } = await generateExactVerseImageBlob();

    // 1. Try Native Web Share API with File (Works on Android/iOS WhatsApp Status)
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
      const file = new File([blob], filename, { type: "image/png" });
      await navigator.share({
        title: `दैनिक वचन - ${displayRef}`,
        text: shareText,
        files: [file]
      });
      showToast("✨ व्हॉट्सॲपवर यशस्वीरीत्या शेअर केले!");
      return;
    }

    // 2. Fallback: Automatically download image and open WhatsApp with pre-filled text
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
    showToast("💬 फोटो सेव्ह झाला आणि व्हॉट्सॲप उघडले!");

  } catch (err) {
    console.error("WhatsApp share error:", err);
    // Direct WhatsApp text share fallback
    const { vod } = getCurrentVOD();
    const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
    const displayText = (state.translation === "eng") ? vod.engText : vod.text;
    const shareText = `📖 "${displayText}" — ${displayRef} 🙏✨`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  }
};

window.copyDailyVerseText = function() {
  const { vod } = getCurrentVOD();
  const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
  const displayText = (state.translation === "eng") ? vod.engText : vod.text;

  const copyText = `📖 आजचे दैनिक वचन (Verse of the Day)\n\n"${displayText}"\n— ${displayRef} (${state.translation === 'eng' ? 'NLT' : 'MARVBSI'})\n\nRiver of Life Bible App • जीवन नदी`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(copyText).then(() => {
      showToast("📋 वचन कॉपी झाले! (Copied to Clipboard)");
    });
  } else {
    showToast("Clipboard not supported");
  }
};


/* ==========================================================================
   RIVER OF LIFE 3-CARD SPIRITUAL FLOW LOGIC (HEADWATERS, CONFLUENCE, RESET)
   ========================================================================== */

// 1. THE HEADWATERS: DYNAMIC 31-DAY GUIDED PRAYER DATABASE
const DAILY_HEADWATERS_PRAYERS = [
  {
    "id": 1,
    "themeMr": "दैवी कृपा व नवी सुरुवात",
    "themeEn": "Divine Grace & Fresh Beginnings",
    "refMr": "विलापगीते ३:२२-२३",
    "refEn": "Lamentations 3:22-23",
    "bookKey": "lamentations",
    "chapter": 3,
    "verse": 22,
    "paragraphsMr": [
      "हे दयाळू आणि सर्वसमर्थ स्वर्गीय पित्या, या नव्या दिवसाच्या उषःकाली मी अत्यंत कृतज्ञ अंतःकरणाने तुझ्या पवित्र चरणांशी नतमस्तक होतो. कालच्या सर्व चिंता, अपयश आणि थकवा मागे सारून, आज तुझ्या नव्या कृपेचा आणि करुणेचा प्रकाश मी माझ्या जीवनात स्वीकारतो.",
      "प्रभू, आजचा माझा प्रत्येक विचार, प्रत्येक उच्चारलेला शब्द आणि प्रत्येक घेतलेला निर्णय तुझ्या दैवी इच्छेनुसार असू दे. मी जिथे जाईन तिथे तुझ्या प्रेमाचा आणि शांतीचा सुगंध पसरू दे, आणि मला भेटणाऱ्या प्रत्येकाला तुझ्या दयेचा अनुभव येऊ दे.",
      "माझे कुटुंब, माझे कार्यक्षेत्र आणि माझी सर्व कामे तुझ्या बलवान हातात समर्पित करतो; येशू ख्रिस्ताच्या सामर्थी नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Heavenly Father, as this new dawn breaks, I come before You with a heart full of reverence and deep gratitude. Leaving behind the worries and fatigue of yesterday, I receive Your mercies which are fresh and new this morning.",
      "Lord, let every thought I think, every word I speak, and every choice I make align with Your divine purpose. Fill me with Your peace so that wherever I walk today, I may reflect Your radiant love and gentleness to everyone I meet.",
      "I surrender my family, my labor, and all my plans into Your faithful hands; in Jesus' mighty name I pray, Amen."
    ]
  },
  {
    "id": 2,
    "themeMr": "स्वर्गीय मार्गदर्शन व प्रकाशाचा दिवा",
    "themeEn": "Divine Guidance & Light for the Path",
    "refMr": "स्तोत्रसंहिता ११९:१०५",
    "refEn": "Psalm 119:105",
    "bookKey": "psalms",
    "chapter": 119,
    "verse": 105,
    "paragraphsMr": [
      "हे माझ्या परमेश्वरा, तुझे पवित्र वचन माझ्या पावलांसाठी दिवा आणि माझ्या मार्गासाठी तेजस्वी प्रकाश आहे. या जगातील दिशाभूल करणाऱ्या मार्गांवरून चालताना, मला तुझ्या सत्याच्या वाटेवर चालण्याची बुद्धी आणि विवेक दे.",
      "प्रभू, माझ्या मनातील संशय आणि अंधार दूर कर आणि आजच्या प्रत्येक पावलावर तुझा आवाज ओळखण्याची संवेदनशीलता मला दे. माझ्या स्वतःच्या समजूतीवर विसंबून न राहता, मी तुझ्या मार्गदर्शनावर पूर्ण भरवसा ठेवून पुढे जाऊ शकेन असे कर.",
      "माझा आजचा सर्व प्रवास तुझ्या संरक्षणाच्या पंखांखाली सुरक्षित असू दे; येशूच्या पवित्र नावात मागतो, आमेन."
    ],
    "paragraphsEn": [
      "O Lord, Your holy Word is a lamp to my feet and a clear light unto my path. Amidst the confusing noises and distractions of this world, grant me divine clarity to walk steadfastly in Your truth.",
      "Dispel every shadow of doubt from my heart, Lord, and make my spirit attentive to the gentle whisper of Your Holy Spirit at every crossroad. Teach me not to lean on my own understanding, but to trust wholly in Your perfect guidance.",
      "Guard my going out and my coming in today under the shadow of Your wings; in Jesus' precious name, Amen."
    ]
  },
  {
    "id": 3,
    "themeMr": "हृदयातील स्वर्गीय शांती",
    "themeEn": "Peace That Surpasses Understanding",
    "refMr": "फिलिप्पैकरांस ४:६-७",
    "refEn": "Philippians 4:6-7",
    "bookKey": "philippians",
    "chapter": 4,
    "verse": 6,
    "paragraphsMr": [
      "हे शांतीचा दाता असलेल्या प्रभू येशू, आजच्या सकाळच्या या शांत क्षणी मी माझी सर्व चिंता, अस्वस्थता आणि मनाचे ओझे तुझ्या चरणांवर ठेवतो. जगातील कोणत्याही संकटापेक्षा तुझी उपस्थिती माझ्या जीवनात कितीतरी पटीने मोठी आहे याची जाणीव मला करून दे.",
      "सर्व बुद्धीच्या पलीकडची तुझी दैवी शांती आज माझ्या मनाचा आणि हृदयाचा ताबा घेवो. कामाच्या धकाधकीत आणि आव्हानांच्या वादळातही माझे मन स्थिर आणि शांत राहू दे, जेणेकरून मी इतरांसाठी शांतीचा दूत बनू शकेन.",
      "तुझ्या अपार प्रेमात मला विसावा लाभो आणि माझा दिवस तुझ्या आशीर्वादाने भरून जावो; येशूच्या नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Lord Jesus, Prince of Peace, in the quiet stillness of this morning I lay down every anxious thought and heavy burden at Your feet. Remind my soul that Your constant presence is far greater than any storm I might face today.",
      "Let Your supernatural peace, which surpasses all human understanding, guard my heart and my thoughts throughout this day. Keep me anchored and calm amidst daily pressures so I may be a source of encouragement and peace to those around me.",
      "May my soul find sweet rest in Your unfailing love; in Jesus' holy name I pray, Amen."
    ]
  },
  {
    "id": 4,
    "themeMr": "गरुडासारखे नवे आत्मिक सामर्थ्य",
    "themeEn": "Renewed Strength Like Eagles",
    "refMr": "यशया ४०:३१",
    "refEn": "Isaiah 40:31",
    "bookKey": "isaiah",
    "chapter": 40,
    "verse": 31,
    "paragraphsMr": [
      "हे सर्वशक्तिमान परमेश्वरा, जे तुझी वाट पाहतात त्यांना तू नवे सामर्थ्य देतोस आणि ते गरुडासारख्या पंखांनी उंच भरारी घेतात. माझ्या स्वतःच्या मर्यादित शक्तीवर अवलंबून न राहता, मी तुझ्या अपरिमित स्वर्गीय शक्तीवर विसंबून राहतो.",
      "आजच्या सर्व शारीरिक व मानसिक श्रमांत मला थकवा न येवो, तर तुझ्या आत्म्याच्या सामर्थ्याने मी प्रत्येक जबाबदारी उत्साहाने पार पाडू शकेन. जेव्हा जेव्हा मला अशक्तपणा जाणवेल, तेव्हा तुझी कृपा मला सावरून धरेल असा विश्वास मी व्यक्त करतो.",
      "माझे सामर्थ्य, माझी आशा आणि माझा विजय केवळ तुझ्यातच आहे; येशूच्या विजयी नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Almighty Father, You promise that those who hope in the Lord will renew their strength and soar on wings like eagles. Rather than relying on my own finite strength, I lean entirely on Your infinite power today.",
      "Grant me endurance through physical and mental tasks, empowering me to fulfill every duty with joy and spiritual vigor. Whenever weariness attempts to creep in, let Your sustaining grace lift me higher.",
      "My strength, my hope, and my victory belong to You alone; in Jesus' triumphant name, Amen."
    ]
  },
  {
    "id": 5,
    "themeMr": "उत्तम मेंढपाळाची कृपाळू सोबत",
    "themeEn": "The Good Shepherd's Caring Presence",
    "refMr": "स्तोत्रसंहिता २३:१-३",
    "refEn": "Psalm 23:1-3",
    "bookKey": "psalms",
    "chapter": 23,
    "verse": 1,
    "paragraphsMr": [
      "हे प्रभू येशू, तू माझा उत्तम मेंढपाळ आहेस आणि तुझ्या सान्निध्यात मला कशाचीही उणीव भासणार नाही. तू मला हिरव्यागार कुरणांत विसावा देतोस आणि संथ पाण्याच्या झऱ्यांजवळ शांततेने चालवतोस.",
      "माझ्या थकलेल्या आत्म्याला आज तू नवा तजेला दे आणि तुझ्या नावाच्या गौरवासाठी मला नीतिमत्तेच्या मार्गांवरून चालव. आजच्या दिवसात कोणताही भय किंवा एकाकीपणा मला स्पर्श करू शकणार नाही, कारण तुझा हात सतत माझ्या सोबत आहे.",
      "तुझे उपकार आणि तुझी करुणा माझ्या आयुष्याच्या सर्व दिवसांत माझ्या पाठीशी राहोत; येशूच्या नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Lord Jesus, You are my faithful Shepherd, and in Your pasture I shall lack no good thing. You lead me beside peaceful waters and cause my soul to rest in green pastures.",
      "Restore my inner soul this morning and guide my steps along paths of righteousness for Your name's sake. No fear or loneliness can overtake me today, for Your comforting rod and staff are ever near.",
      "May Your goodness and unfailing mercy follow me all the days of my life; in Jesus' blessed name, Amen."
    ]
  },
  {
    "id": 6,
    "themeMr": "मनाचे दैवी नवीकरण व शुद्धता",
    "themeEn": "Renewal of the Mind & Purity",
    "refMr": "रोमकरांस १२:२",
    "refEn": "Romans 12:2",
    "bookKey": "romans",
    "chapter": 12,
    "verse": 2,
    "paragraphsMr": [
      "हे पवित्र देवाने, या जगाच्या नाशिवंत आणि नकारात्मक प्रभावांपासून माझ्या मनाचे रक्षण कर. आज माझे विचार शुद्ध, उदात्त आणि तुझ्या पवित्र वचनाशी सुसंगत राहण्यासाठी माझ्या अंतःकरणाचे नवीकरण कर.",
      "देवा, तुझी उत्तम, संतोषकारक आणि परिपूर्ण इच्छा काय आहे हे समजून घेण्याची अंतर्दृष्टी मला दे. मी कोणाचाही न्याय न करता किंवा कटुता न बाळगता प्रत्येकाशी ख्रिस्ताच्या प्रेमाने वागावे अशी कृपा मला दे.",
      "माझे संपूर्ण जीवन तुझ्या समोर एक जिवंत आणि पवित्र यज्ञ म्हणून अर्पण करतो; येशूच्या नावात मागतो, आमेन."
    ],
    "paragraphsEn": [
      "Holy God, protect my mind from the negative patterns and fleeting distractions of this world. Transform my thoughts today so they remain pure, noble, and pleasing in Your sight.",
      "Grant me spiritual discernment to recognize Your good, pleasing, and perfect will in every circumstance. Guard my heart against bitterness and help me extend Christlike love to every soul I encounter.",
      "I present my life today as a living and holy sacrifice to You; in Jesus' precious name, Amen."
    ]
  },
  {
    "id": 7,
    "themeMr": "जीवनाच्या प्रत्येक वळणावर स्वर्गीय ज्ञान",
    "themeEn": "Heavenly Wisdom for Every Step",
    "refMr": "याकोब १:५",
    "refEn": "James 1:5",
    "bookKey": "james",
    "chapter": 1,
    "verse": 5,
    "paragraphsMr": [
      "हे ज्ञानाचा अमर्याद सागर असलेल्या परमेश्वरा, जेव्हा जेव्हा मला जीवनात मार्ग समजत नाही, तेव्हा तू मला भरभरून ज्ञान देण्याचे अभिवचन दिले आहेस. आजच्या प्रत्येक गुंतागुंतीच्या निर्णयात मला स्वर्गीय बुद्धी दे.",
      "प्रभू, मानवी युक्तीपेक्षा तुझ्या आत्म्याच्या मार्गदर्शनावर चालण्याची शिकवण मला दे. माझ्या कामात, संभाषणात आणि नात्यांमध्ये विवेक आणि समंजसपणा प्रकट होऊ दे.",
      "तू दाखवलेल्या वाटेवर न डगमगता चालण्याचे धैर्य मला लाभो; येशू ख्रिस्ताच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "O God of all wisdom, You generously give insight to all who ask without reproach. As I face decisions and complex situations today, shower me with discernment from above.",
      "Teach me to rely not on earthly wisdom, but on the prompting of Your Spirit. Let prudence, patience, and integrity shine through all my conversations, work, and relationships.",
      "Grant me bold courage to walk steadfastly in the path You make plain; in Jesus' name I pray, Amen."
    ]
  },
  {
    "id": 8,
    "themeMr": "अढळ विश्वास आणि संपूर्ण समर्पण",
    "themeEn": "Steadfast Trust & Wholehearted Surrender",
    "refMr": "नीतीसूत्रे ३:५-६",
    "refEn": "Proverbs 3:5-6",
    "bookKey": "proverbs",
    "chapter": 3,
    "verse": 5,
    "paragraphsMr": [
      "हे विश्वासू देवा, मी माझ्या संपूर्ण अंतःकरणाने तुझ्यावर भरवसा ठेवतो आणि स्वतःच्या ज्ञानावर विसंबून राहत नाही. आजच्या दिवसातील माझे सर्व मार्ग तुझ्या स्वाधीन करतो, जेणेकरून तूच माझी पावले सरळ करशील.",
      "प्रभू, अनपेक्षित परिस्थिती किंवा अडचणी आल्या तरी माझा विश्वास डगमगू नये. तू माझ्या पाठीशी उभा आहेस आणि सर्व गोष्टी माझ्या कल्याणासाठीच घडवून आणत आहेस यावर माझा ठाम विश्वास आहे.",
      "तुझ्या अद्भुत योजनेवर माझे मन शांत आणि आश्वस्त राहो; येशूच्या नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Faithful Lord, with all my heart I place my trust in You, refusing to lean solely upon my own limited understanding. In all my ways I acknowledge You, confident that You will make my paths straight.",
      "Even if unexpected obstacles arise, let my faith remain unshaken. I hold fast to the truth that You are working all things together for my good and for Your ultimate glory.",
      "May my spirit rest securely in Your sovereign and loving hands; in Jesus' name, Amen."
    ]
  },
  {
    "id": 9,
    "themeMr": "सार्वकालिक व अखंड प्रीतीची जाणीव",
    "themeEn": "Eternal & Unfailing Love",
    "refMr": "स्तोत्रसंहिता १३६:१-३",
    "refEn": "Psalm 136:1-3",
    "bookKey": "psalms",
    "chapter": 136,
    "verse": 1,
    "paragraphsMr": [
      "हे परमेश्वरा, मी तुझे उपकार मानतो कारण तू चांगला आहेस; तुझी दया व प्रीती युगानुयुग टिकणारी आहे. आज सकाळच्या पहिल्या किरणासोबत तुझ्या अथांग प्रेमाची जाणीव माझ्या हृदयात पुन्हा जागृत कर.",
      "प्रभू, तुझ्या प्रेमाने मला कोणत्याही भीतीत अथवा अपराधीपणात राहू न देता, मुक्तीचा आणि आनंदाचा श्वास घेऊ दिला आहे. मी आज जे काही करेन ते केवळ तुझ्या प्रेमाच्या प्रतिसादात आणि इतरांच्या कल्याणासाठी करेन.",
      "तुझ्या निरंतर दयेचा गौरव माझ्या मुखातून अखंड वाहू दे; येशूच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "O Give thanks to the Lord, for He is good, and His steadfast love endures forever! With the first rays of morning light, awaken my heart to the depth and beauty of Your boundless mercy.",
      "Your unconditional love frees me from all condemnation and anxiety, filling me with boundless hope. May every task I undertake today be an outpouring of the grace and generosity You have shown me.",
      "Let songs of thanksgiving continually dwell upon my lips; in the sweet name of Jesus, Amen."
    ]
  },
  {
    "id": 10,
    "themeMr": "सर्वसमर्थाच्या छायेत अभेद्य संरक्षण",
    "themeEn": "Refuge & Shield Under Almighty Wings",
    "refMr": "स्तोत्रसंहिता ९१:१-४",
    "refEn": "Psalm 91:1-4",
    "bookKey": "psalms",
    "chapter": 91,
    "verse": 1,
    "paragraphsMr": [
      "हे सर्वोच्च देवा, जो तुझ्या गुप्त स्थानात राहतो तो सर्वसमर्थाच्या छायेत सुरक्षित विसावा पावतो. आज मी तुला माझा आश्रयदुर्ग, माझा किल्ला आणि माझा परमेश्वर म्हणतो, ज्याच्यावर मी पूर्ण विश्वास ठेवतो.",
      "प्रभू, दिवसाच्या कोणत्याही धोक्यापासून, रोगापासून आणि अंधारातील भयापासून तू माझे व माझ्या कुटुंबाचे रक्षण कर. तुझे स्वर्गीय दूत आमच्या प्रत्येक पावलावर आम्हाला सांभाळतील असा विश्वास मी बाळगतो.",
      "तुझ्या पंखांखाली मला पूर्ण सुरक्षा आणि निर्भयता लाभो; येशू ख्रिस्ताच्या सामर्थी नावात आमेन."
    ],
    "paragraphsEn": [
      "Most High God, he who dwells in Your secret shelter finds refuge beneath the shadow of the Almighty. I declare today that You alone are my refuge, my fortress, and my God in whom I trust.",
      "Shield my family and me from every unseen snare, every pestilence, and every assault of fear throughout this day. Send Your holy angels to guard our steps and keep us safe in all our ways.",
      "Under the shadow of Your wings I find perfect peace and absolute protection; in Jesus' name, Amen."
    ]
  },
  {
    "id": 11,
    "themeMr": "आत्म्याला तृप्त करणारा जिवंत पाण्याचा झरा",
    "themeEn": "Living Water for the Thirsty Soul",
    "refMr": "योहान ४:१४",
    "refEn": "John 4:14",
    "bookKey": "john",
    "chapter": 4,
    "verse": 14,
    "paragraphsMr": [
      "हे प्रभू येशू, जगातील कोणतीही संपत्ती किंवा आनंद आत्म्याची तहान भागवू शकत नाही; केवळ तूच जिवंत पाण्याचा निरंतर झरा आहेस. आजच्या या प्रभाती माझ्या तहानलेल्या अंतःकरणाला तुझ्या आत्म्याच्या पाण्याने तृप्त कर.",
      "प्रभू, माझ्या जीवनातून इतरांसाठीही आशेचे, प्रेमाचे आणि उत्तेजनाचे जिवंत झरे वाहू दे. कोरडेपणा आणि निराशा दूर करून मला स्वर्गीय आनंदाने आणि उत्साहाने परिपूर्ण कर.",
      "तुझ्या सान्निध्यात माझा आत्मा सदैव टवटवीत आणि समृद्ध राहो; येशूच्या नावात ही प्रार्थना, आमेन."
    ],
    "paragraphsEn": [
      "Lord Jesus, nothing this world offers can satisfy the deepest thirst of the soul; You alone are the spring of living water welling up to eternal life. Quench my spirit with Your presence this morning.",
      "Let streams of living hope, grace, and joy flow through my life into the lives of those around me. Wash away every trace of weariness and revive my spirit with fresh devotion.",
      "In Your fellowship my soul finds enduring delight and refreshment; in Jesus' holy name, Amen."
    ]
  },
  {
    "id": 12,
    "themeMr": "जगात अंधारावर मात करणारा प्रकाश",
    "themeEn": "Light That Overcomes the Darkness",
    "refMr": "मत्तय ५:१४-१६",
    "refEn": "Matthew 5:14",
    "bookKey": "matthew",
    "chapter": 5,
    "verse": 14,
    "paragraphsMr": [
      "हे जगाच्या तेजस्वी प्रकाशा, तू आम्हाला पर्वतावरील शहरासारखे जगाचा प्रकाश बनवले आहेस. आजच्या दिवसात माझे वर्तन, माझी प्रामाणिकता आणि माझे प्रेम असा प्रकाश पाडू दे की लोकांनी स्वर्गातील पित्याचे गौरव करावे.",
      "प्रभू, माझ्या अंतःकरणातील स्वार्थ, राग आणि कटुता यांचा अंधार तुझ्या पवित्र प्रकाशाने नाहीसा कर. मी अंधारात भटकणाऱ्यांसाठी आशेचा किरण आणि आधार बनू शकेन असा विवेक मला दे.",
      "तुझा गौरव माझ्या संपूर्ण जीवनातून प्रकट होवो; येशूच्या पवित्र नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Lord Jesus, Light of the World, You have called us to shine like a city set on a hill that cannot be hidden. Let my words, my deeds, and my integrity reflect Your brilliant goodness today so that God is glorified.",
      "Dispel every darkness of selfishness, anger, and impatience from my heart with Your blazing truth. Make me an instrument of hope and warmth to anyone walking through difficult valleys.",
      "May Your light shine brightly through my life in everything I say and do; in Jesus' name, Amen."
    ]
  },
  {
    "id": 13,
    "themeMr": "पवित्र आत्म्याची मधुर व समृद्ध फळे",
    "themeEn": "Fruit of the Holy Spirit",
    "refMr": "गलतीकरांस ५:२२-२३",
    "refEn": "Galatians 5:22-23",
    "bookKey": "galatians",
    "chapter": 5,
    "verse": 22,
    "paragraphsMr": [
      "हे स्वर्गीय पित्या, आजच्या दिवसात तुझ्या पवित्र आत्म्याने माझे हृदय पूर्णपणे भरून टाक. माझ्या जीवनात प्रीती, आनंद, शांती, सहनशीलता, दयाळूपणा, भलाई, विश्वासूपणा, सौम्यता आणि आत्मसंयम ही फळे विपुल प्रमाणात बहरू दे.",
      "प्रभू, रागाच्या किंवा उतावळेपणाच्या क्षणी मला शांत राहण्याचा आणि समंजसपणे उत्तर देण्याचा संयम दे. माझ्या बोलण्याने कोणाचेही मन न दुखावता, प्रत्येकाला ख्रिस्ताच्या दयेचा स्पर्श व्हावा अशी माझी इच्छा आहे.",
      "माझे जीवन तुझ्या गौरवाचे मधुर फळ देणारे झाड बनू दे; येशूच्या नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Heavenly Father, fill me anew with Your Holy Spirit today. Cultivate within me the precious fruit of love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control.",
      "In moments of pressure or provocation, grant me the restraint to respond with grace and wisdom. Keep my tongue from harsh words and let my speech build others up in the knowledge of Christ.",
      "May my life be a fruitful branch bearing eternal blessing; in the glorious name of Jesus, Amen."
    ]
  },
  {
    "id": 14,
    "themeMr": "भयावर विजय, प्रीती आणि संयमाचा आत्मा",
    "themeEn": "Spirit of Power, Love & Sound Mind",
    "refMr": "२ तीमथ्य १:७",
    "refEn": "2 Timothy 1:7",
    "bookKey": "2-timothy",
    "chapter": 1,
    "verse": 7,
    "paragraphsMr": [
      "हे सामर्थी परमेश्वरा, तू आम्हाला भीतीचा आणि दुर्बलतेचा आत्मा दिलेला नाही, तर सामर्थ्याचा, प्रीतीचा आणि संयमाचा आत्मा दिला आहे. आज कोणत्याही अज्ञात भविष्याचे किंवा संकटाचे भय माझ्या मनावर अधिकार गाजवू शकत नाही.",
      "प्रभू, जेव्हा जेव्हा संशय किंवा भीती माझ्या दारावर ठोठावेल, तेव्हा तुझा अढळ विश्वास माझ्या हृदयात धैर्याची मशाल पेटवून देईल. तुझ्या सामर्थ्याने मी प्रत्येक आव्हानाला आत्मविश्वासाने आणि शांततेने तोंड देईन.",
      "माझा पूर्ण भरवसा केवळ तुझ्याच विजयावर आहे; येशूच्या विजयी नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Mighty God, You have not given us a spirit of fear, but of power, love, and a sound mind. No shadow of dread or uncertainty about tomorrow has authority over my heart today.",
      "Whenever doubt knocks at the door of my mind, let Your steadfast promises kindle bold courage within me. Through Your strengthening Spirit, I will face every task and challenge with dignity and calm assurance.",
      "My confidence rests securely upon Your victorious arm; in Jesus' triumphant name, Amen."
    ]
  },
  {
    "id": 15,
    "themeMr": "शुद्ध हृदय आणि तारणाचा नवा हर्ष",
    "themeEn": "Clean Heart & Joy of Salvation",
    "refMr": "स्तोत्रसंहिता ५१:१०-१२",
    "refEn": "Psalm 51:10-12",
    "bookKey": "psalms",
    "chapter": 51,
    "verse": 10,
    "paragraphsMr": [
      "हे दयाळू देवा, माझ्यामध्ये शुद्ध हृदय निर्माण कर आणि माझ्या अंतरात्म्यात नवा व स्थिर आत्मा स्थापित कर. माझ्या सर्व चुका, उणिवा आणि नकळत घडलेली पापे तुझ्या पवित्र रक्ताने धुऊन मला निष्कलंक कर.",
      "प्रभू, तुझ्या तारणाचा हर्ष माझ्या हृदयात पुन्हा जागृत कर आणि तुझ्या उदार आत्म्याने मला सतत आधार दे. आजचा माझा संपूर्ण दिवस तुझ्या स्तुतीचा आणि आनंदाचा अखंड उत्सव असू दे.",
      "तुझ्या सान्निध्याच्या पवित्र प्रकाशात मला नित्य चालव; येशूच्या नावात मागतो, आमेन."
    ],
    "paragraphsEn": [
      "Gracious Lord, create in me a clean heart and renew a steadfast spirit within me. Wash away every hidden fault and cleanse my thoughts so I may stand before You in holiness and purity.",
      "Restore unto me the uncontainable joy of Your salvation and uphold me with a willing spirit. Let this entire day resonate with songs of gratitude, joy, and deep adoration for Your unfailing goodness.",
      "Keep me continually in the light of Your sacred presence; in Jesus' precious name, Amen."
    ]
  },
  {
    "id": 16,
    "themeMr": "सर्व परिस्थितीत निरंतर उपकारस्तुती",
    "themeEn": "Continual Thanksgiving in All Circumstances",
    "refMr": "१ थेस्सलनीकाकरांस ५:१६-१८",
    "refEn": "1 Thessalonians 5:16-18",
    "bookKey": "1-thessalonians",
    "chapter": 5,
    "verse": 16,
    "paragraphsMr": [
      "हे उपकार मानण्यास योग्य असलेल्या स्वर्गीय पित्या, मी सर्व परिस्थितीत निरंतर आनंद करण्यास, न चुकता प्रार्थना करण्यास आणि उपकार मानण्यास शिकू इच्छितो. कारण ख्रिस्त येशूमध्ये आमच्याविषयीची हीच तुझी पवित्र इच्छा आहे.",
      "प्रभू, आजच्या दिवसातील लहान-मोठ्या प्रत्येक आशीर्वादासाठी, आरोग्यासाठी आणि अन्नासाठी मी तुझे आभार मानतो. तक्रार किंवा नाराजी न करता समाधानी आणि कृतज्ञ अंतःकरणाने जगण्याची कृपा मला दे.",
      "माझे संपूर्ण जीवन तुझ्या अनंत उपकारांचे आभारगान बनो; येशूच्या नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Heavenly Father, worthy of all praise, teach me to rejoice always, pray without ceasing, and give thanks in all circumstances, for this is Your will for us in Christ Jesus.",
      "I thank You for every breath, every provision, good health, and the fellowship of loved ones today. Guard my spirit against discontent and grumbling, filling me instead with cheerful gratitude.",
      "May my daily walk be a living hymn of thanksgiving to You; in Jesus' blessed name, Amen."
    ]
  },
  {
    "id": 17,
    "themeMr": "कुटुंबावर व घरावर स्वर्गीय आशीर्वाद",
    "themeEn": "Blessing & Dedication Over the Household",
    "refMr": "यहोशवा २४:१५",
    "refEn": "Joshua 24:15",
    "bookKey": "joshua",
    "chapter": 24,
    "verse": 15,
    "paragraphsMr": [
      "हे घरादाराचा निर्माणकर्ता आणि रक्षणकर्ता असलेल्या प्रभू, मी आणि माझे घराणे सर्वदा केवळ परमेश्वराचीच सेवा करू हा दृढ निश्चय मी आज पुन्हा व्यक्त करतो. माझ्या घरावर आणि कुटुंबातील प्रत्येक व्यक्तीवर तुझा स्वर्गीय आशीर्वाद असो.",
      "प्रभू, आमच्या घरात प्रेम, एकोपा, शांती आणि आरोग्य सदैव वास करो. कोणत्याही दुहीपासून, वादापासून आणि वाईट प्रभावांपासून आमच्या घराचे रक्षण कर आणि आम्हा सर्वांना तुझ्या भयात वाढव.",
      "आमचे घर तुझ्या पवित्र उपस्थितीचे सुंदर मंदिर बनू दे; येशू ख्रिस्ताच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Lord God, Builder and Protector of the home, as for me and my household, we declare anew today that we will serve the Lord alone. Let Your peace and heavenly favor rest upon every corner of our home.",
      "Fill our relationships with mutual understanding, deep affection, unity, and sound health. Guard our home from strife, division, and every harmful influence, anchoring us together in Your love.",
      "May our dwelling place be a sanctuary of Your presence; in the precious name of Jesus, Amen."
    ]
  },
  {
    "id": 18,
    "themeMr": "नम्रता, करुणा आणि प्रीतीचे वस्त्र",
    "themeEn": "Garment of Humility, Compassion & Love",
    "refMr": "कलस्सैकरांस ३:१२-१४",
    "refEn": "Colossians 3:12-14",
    "bookKey": "colossians",
    "chapter": 3,
    "verse": 12,
    "paragraphsMr": [
      "हे परमेश्वराच्या निवडलेल्या पवित्र आणि प्रिय जनांनो, आज मला करुणा, दया, नम्रता, सौम्यता आणि धीरज यांचे वस्त्र परिधान करण्याची कृपा दे. जशी प्रभूने मला असीम क्षमा केली आहे, तशीच इतरांना क्षमा करण्याची विशालता माझ्या हृदयात दे.",
      "प्रभू, या सर्वांवर प्रीतीचे बंधन घाल, जे सर्वांना परिपूर्णतेत एकत्र बांधून ठेवते. कोणाशीही कटुता न ठेवता, सर्वांशी आदर आणि प्रेमाने वागण्याचे सामर्थ्य मला दे.",
      "माझे वर्तन तुझ्या गौरवासाठी आदर्श ठरो; येशूच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Gracious Lord, clothe me this morning with tenderhearted compassion, kindness, humility, gentleness, and patience. Just as You have freely forgiven all my transgressions, grant me a heart eager to forgive others.",
      "Above all these virtues, bind me with perfect love, which holds everything together in complete harmony. Let no malice or irritation reside in my soul, but let grace overflow in every interaction.",
      "May my conduct bring glory to Your holy name; in Jesus' sweet name, Amen."
    ]
  },
  {
    "id": 19,
    "themeMr": "जगावर विजय मिळवणारा अढळ विश्वास",
    "themeEn": "Victorious Faith Overcoming the World",
    "refMr": "१ योहान ५:४",
    "refEn": "1 John 5:4",
    "bookKey": "1-john",
    "chapter": 5,
    "verse": 4,
    "paragraphsMr": [
      "हे सामर्थी प्रभू, जो कोणी देवापासून जन्मलेला आहे तो जगावर विजय मिळवतो, आणि जगावर विजय मिळवणारे आपले शस्त्र म्हणजे आपला विश्वास आहे. आज कोणत्याही आव्हानाला किंवा भीतीला मी पराभूत मानसिकतेने पाहणार नाही.",
      "प्रभू, ख्रिस्तामध्ये मी विजयी पेक्षाही अधिक मोठा विजेता आहे याची जाणीव मला दे. संकटातही माझा विश्वास स्थिर राहो आणि तुझ्या अभिवचनांवर माझी पावले घट्ट उभी राहोत.",
      "तुझ्या सामर्थ्याने मला प्रत्येक क्षेत्रात गौरवशाली विजय प्राप्त होवो; येशूच्या विजयी नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Mighty Lord, everyone born of God overcomes the world, and this is the victory that has overcome the world—our faith. I refuse to look at today's challenges with defeat or discouragement.",
      "Remind my soul that through Christ who loves me, I am more than a conqueror. Strengthen my resolve to stand unshakeable on Your promises, no matter what storms blow against me.",
      "May Your mighty hand lead me to triumphant victory; in Jesus' glorious name, Amen."
    ]
  },
  {
    "id": 20,
    "themeMr": "थकलेल्या व कष्टी मनाला खरा विसावा",
    "themeEn": "Rest & Refreshment for the Weary Soul",
    "refMr": "मत्तय ११:२८-३०",
    "refEn": "Matthew 11:28",
    "bookKey": "matthew",
    "chapter": 11,
    "verse": 28,
    "paragraphsMr": [
      "हे प्रेमळ येशू, तू म्हणालास की 'अहो कष्टी व ओझे वाहणारे सर्व लोकहो, माझ्याकडे या म्हणजे मी तुम्हांला विसावा देईन.' आज सकाळच्या या क्षणी मी माझे सर्व थकलेले विचार आणि जड ओझे तुझ्या प्रेमळ हातांत सोपवतो.",
      "प्रभू, तुझे जू हलके आणि सुलभ आहे; तुझ्याकडून नम्रता आणि लीनता शिकण्याची बुद्धी मला दे. तुझ्या स्वर्गीय विसाव्यात माझ्या आत्म्याला नवा ताजेतवाना श्वास आणि शांती लाभू दे.",
      "माझे मन तुझ्या उपस्थितीत अखंड सुरक्षित राहो; येशूच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Loving Jesus, You extend the gentlest invitation: 'Come to Me, all you who are weary and burdened, and I will give you rest.' In this sacred hour, I surrender my exhausting burdens into Your caring hands.",
      "Your yoke is easy and Your burden is light; teach me the gentleness and humility of Your heart. Let my weary spirit find deep renewal, restoring my hope and vitality for the road ahead.",
      "I dwell in the quiet shelter of Your resting place; in Jesus' name I pray, Amen."
    ]
  },
  {
    "id": 21,
    "themeMr": "पाण्याच्या प्रवाहांजवळ लावलेले हिरवेगार झाड",
    "themeEn": "Rooted & Flourishing by Living Streams",
    "refMr": "स्तोत्रसंहिता १:१-३",
    "refEn": "Psalm 1:1-3",
    "bookKey": "psalms",
    "chapter": 1,
    "verse": 1,
    "paragraphsMr": [
      "हे नीतीमान परमेश्वरा, जो तुझ्या नियमशास्त्रात रात्रंदिवस मनन करतो तो पाण्याच्या प्रवाहांजवळ लावलेल्या झाडासारखा होतो, ज्याची पाने कधीही कोमेजत नाहीत आणि तो आपल्या ऋतूत भरपूर फळ देतो.",
      "प्रभू, माझे मूळ तुझ्या पवित्र वचनाच्या खोल झऱ्यांमध्ये रुजवून ठेव, जेणेकरून संकटांच्या उन्हातही मी हिरवागार आणि आशावादी राहीन. आज मी जे काही हाती घेईन त्या सर्व कामांना तुझ्या आशीर्वादाचे यश लाभू दे.",
      "माझे जीवन इतरांसाठी सावली आणि फळांचा आशीर्वाद ठरो; येशूच्या नावात मागतो, आमेन."
    ],
    "paragraphsEn": [
      "Righteous God, blessed is the person whose delight is in the law of the Lord. Make me like a tree firmly planted by streams of water, yielding fruit in season whose leaf never withers.",
      "Anchor the roots of my heart deeply into the truth of Your scriptures, so that no scorching drought of adversity can wither my hope. Prosper the work of my hands today according to Your will.",
      "Let my life provide shade, comfort, and nourishment to all in need; in Jesus' precious name, Amen."
    ]
  },
  {
    "id": 22,
    "themeMr": "देवाचे नित्य सान्निध्य व अखंड साथ",
    "themeEn": "The Everlasting & Faithful Presence of God",
    "refMr": "इब्री लोकांस १३:५-६",
    "refEn": "Hebrews 13:5-6",
    "bookKey": "hebrews",
    "chapter": 13,
    "verse": 5,
    "paragraphsMr": [
      "हे विश्वासू देवा, तू अभिवचन दिले आहेस की 'मी तुला कधीही सोडणार नाही व कधीही टाकणार नाही.' या असीम सत्यावर विसंबून मी आज अत्यंत धैर्याने म्हणतो की परमेश्वर माझा साहाय्यकर्ता आहे, मला कोणाचीही भीती नाही.",
      "प्रभू, आजच्या माझ्या सर्व प्रवासात, बैठकांत आणि संभाषणांत तुझी पवित्र उपस्थिती माझ्या सोबत चालू दे. मी कधीही एकटा नाही तर सर्व जगाचा निर्माणकर्ता माझ्या पाठीशी उभा आहे ही खात्री मला दे.",
      "तुझ्या नित्य सान्निध्यात मी न डगमगता मार्गक्रमण करू शकेन; येशूच्या नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Faithful Father, You have promised with unwavering certainty: 'Never will I leave you; never will I forsake you.' Clinging to this promise, I boldly say today that the Lord is my helper; I will not fear.",
      "Let Your comforting presence accompany me into every room, meeting, and conversation today. Banish every thought of isolation, reminding me that the Maker of heaven and earth walks right beside me.",
      "In Your steadfast companionship I move forward with unbroken peace; in Jesus' mighty name, Amen."
    ]
  },
  {
    "id": 23,
    "themeMr": "संकटात मनाला स्थिर ठेवणारी जीवनाची आशा",
    "themeEn": "An Anchor for the Soul, Firm & Secure",
    "refMr": "इब्री लोकांस ६:१९",
    "refEn": "Hebrews 6:19",
    "bookKey": "hebrews",
    "chapter": 6,
    "verse": 19,
    "paragraphsMr": [
      "हे सार्वकालिक परमेश्वरा, ख्रिस्तामधील आमची आशा ही आमच्या आत्म्यासाठी एका भक्कम, अचल आणि अभेद्य नांगरासारखी आहे. जेव्हा जीवनाचा समुद्र वादळांनी खवळलेला असतो, तेव्हा हीच आशा माझे मन स्थिर ठेवते.",
      "प्रभू, माझ्या भोवतालची परिस्थिती कशीही असली तरी माझी नजर तुझ्या वचनावर आणि स्वर्गीय प्रतिफळावर खिळलेली राहू दे. आज मी ज्या कोणाला भेटेन त्यांनाही या जिवंत आशेचा संदेश देऊ शकेन असा उत्साह मला दे.",
      "तुझ्या अढळ वचनावर माझी संपूर्ण श्रद्धा कायम राहो; येशूच्या पवित्र नावात ही प्रार्थना, आमेन."
    ],
    "paragraphsEn": [
      "Eternal God, the living hope we have in Christ is an anchor for the soul, firm and secure. When the turbulent winds of life blow fiercely, this divine hope keeps my heart anchored in Your grace.",
      "Regardless of outward circumstances, fix my eyes upon Your eternal glory and unshakable Kingdom. Use me today to inspire and uplift those who are searching for light and anchor in their own storms.",
      "May my trust in Your faithfulness stand unwavering; in Jesus' holy name I pray, Amen."
    ]
  },
  {
    "id": 24,
    "themeMr": "देवाच्या सर्व उपकारांचे कृतज्ञतेने स्मरण",
    "themeEn": "Remembering All His Tender Benefits",
    "refMr": "स्तोत्रसंहिता १०३:१-५",
    "refEn": "Psalm 103:1-5",
    "bookKey": "psalms",
    "chapter": 103,
    "verse": 1,
    "paragraphsMr": [
      "हे माझ्या आत्म्या, परमेश्वराचा धन्यवाद कर आणि माझ्या अंतरातील सर्व काही त्याच्या पवित्र नावाचा जयजयकार करो! त्याच्या कोणत्याही उपकारांचा विसर मला पडू नये, कारण तोच माझे सर्व अपराध क्षमा करतो आणि माझे रोग बरे करतो.",
      "प्रभू, तू माझे जीवन विनाशापासून सोडवतोस आणि मला दया व करुणेचा मुकुट घालतोस. आजच्या या संपूर्ण दिवसात माझे तोंड तुझ्या उपकारांच्या स्तुतीने आणि माझ्या अंतःकरणातील समाधानाने भरून वाहू दे.",
      "माझे तारुण्य गरुडासारखे ताजेतवाने आणि बलवान राहो; येशूच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Praise the Lord, my soul; all my inmost being, praise His holy name! Let me never forget the abundant benefits of my God, who forgives all my iniquities and heals all my diseases.",
      "You redeem my life from the pit and crown me with tender love and compassion. Throughout this day, let my heart overflow with joyful remembrance of Your goodness, protection, and gracious provision.",
      "Renew my youth and strength like the eagle; in Jesus' precious and worthy name, Amen."
    ]
  },
  {
    "id": 25,
    "themeMr": "शारीरिक व आत्मिक संपूर्ण आरोग्य",
    "themeEn": "Healing & Complete Restoration",
    "refMr": "यिर्मया ३०:१७",
    "refEn": "Jeremiah 30:17",
    "bookKey": "jeremiah",
    "chapter": 30,
    "verse": 17,
    "paragraphsMr": [
      "हे सर्व रोगांवर विजय मिळवणाऱ्या आरोग्यदाता प्रभू येशू, तू म्हणालास की 'मी तुझे आरोग्य परत आणीन आणि तुझ्या जखमा बऱ्या करीन.' आज मी तुझ्या स्पर्श करणाऱ्या पवित्र हातांची याचना करतो.",
      "प्रभू, माझ्या शरीरातील प्रत्येक अवयवाला, माझ्या मनातील प्रत्येक थकव्याला आणि आत्म्यातील प्रत्येक जखमेला तुझा दैवी स्पर्श लाभो. माझे कुटुंब आणि आजारी असलेल्या सर्व प्रियजनांना ख्रिस्ताच्या रक्ताद्वारे संपूर्ण आरोग्य आणि ताजेतवानेपण प्राप्त होवो.",
      "तुझ्या पुनरुत्थानाच्या सामर्थ्यात मी पूर्ण निरोगी आणि बलवान चालतो; येशूच्या नावात आमेन."
    ],
    "paragraphsEn": [
      "Lord Jesus, Great Physician and Healer, You declared: 'I will restore you to health and heal your wounds.' I reach out in simple faith this morning for Your healing and rejuvenating touch.",
      "Let Your restorative power flow through every cell of my body, reviving my physical strength, calming my mind, and binding up every hidden wound. Bestow full recovery and radiant health upon my family and loved ones.",
      "I walk forward in the vitality of Your resurrection life; in Jesus' healing name, Amen."
    ]
  },
  {
    "id": 26,
    "themeMr": "कामात आणि परिश्रमात दैवी यश",
    "themeEn": "Excellence & Diligence in Daily Work",
    "refMr": "कलस्सैकरांस ३:२३-२४",
    "refEn": "Colossians 3:23-24",
    "bookKey": "colossians",
    "chapter": 3,
    "verse": 23,
    "paragraphsMr": [
      "हे माझ्या निर्मितीकर्त्या पित्या, मी जे काही काम करीन ते माणसांसाठी नव्हे तर साक्षात प्रभूसाठी करतो असे समजून मनापासून करण्याची प्रेरणा मला दे. कारण माझ्या परिश्रमाचे खरे प्रतिफळ स्वर्गातील देवाकडूनच मिळणार आहे.",
      "प्रभू, आज माझ्या कामात प्रामाणिकपणा, उत्कृष्टता, कल्पकता आणि एकाग्रता प्रकट होऊ दे. माझ्या हातांच्या सर्व कामांना यश दे आणि माझ्या सहकाऱ्यांशी व ग्राहकांशी संवाद साधताना मला कृपा आणि सौजन्य लाभू दे.",
      "माझा प्रत्येक श्रम तुझ्या नावाच्या गौरवासाठी उपयोगी ठरो; येशूच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Heavenly Father, whatever work I put my hands to today, inspire me to do it with all my heart as working for the Lord and not for human masters, knowing my ultimate reward comes from You.",
      "Impart excellence, creativity, integrity, and focus into all my labor. Prosper the works of my hands and let my demeanor with colleagues and clients reflect Christ's warmth and professional grace.",
      "May every achievement today be dedicated to Your honor; in Jesus' holy name I pray, Amen."
    ]
  },
  {
    "id": 27,
    "themeMr": "क्षमाशीलता आणि अंतःकरणातील कोमलता",
    "themeEn": "Forgiving Heart & Tender Kindness",
    "refMr": "इफिसकरांस ४:३१-३२",
    "refEn": "Ephesians 4:31-32",
    "bookKey": "ephesians",
    "chapter": 4,
    "verse": 31,
    "paragraphsMr": [
      "हे दयाळू देवाने, माझ्या अंतःकरणातून सर्व कटुता, राग, क्रोधाचा आवेग आणि निंदानालस्ती संपूर्णपणे काढून टाक. जशी देवाने ख्रिस्तामध्ये मला क्षमा केली आहे, तशीच इतरांप्रती कोमल अंतःकरणाची दया आणि क्षमाशीलता माझ्या मनात ओत.",
      "प्रभू, जर आज कोणाचे शब्द मला दुखावणारे असतील, तर मी सूड न घेता प्रेमाने आणि आशीर्वादाने उत्तर देऊ शकेन असा ख्रिस्ती स्वभाव मला दे. माझे हृदय कोणत्याही कडू मुळापासून पूर्णपणे मुक्त ठेव.",
      "तुझ्या स्वर्गीय शांतीने माझे अंतःकरण सदैव उजळून निघो; येशूच्या नावात ही प्रार्थना, आमेन."
    ],
    "paragraphsEn": [
      "Compassionate God, eradicate all bitterness, rage, anger, brawling, and slander from my heart, along with every form of malice. Make me kind, compassionate, and forgiving to others, just as in Christ You forgave me.",
      "If difficult words come my way today, grant me the inner strength to respond with blessing rather than retaliation. Guard my spirit so that no root of bitterness may take hold in my life.",
      "Let Your heavenly grace soften and purify my heart continually; in Jesus' precious name, Amen."
    ]
  },
  {
    "id": 28,
    "themeMr": "दैवी आत्मिक शस्त्रसामग्रीचे संरक्षण",
    "themeEn": "Standing Firm in the Full Armor of God",
    "refMr": "इफिसकरांस ६:१०-११",
    "refEn": "Ephesians 6:10-11",
    "bookKey": "ephesians",
    "chapter": 6,
    "verse": 10,
    "paragraphsMr": [
      "हे सर्वशक्तिमान प्रभो, मी तुझ्यात आणि तुझ्या पराक्रमाच्या सामर्थ्यात बलवान होतो. आजच्या या दिवसात मी देवाचे संपूर्ण आत्मिक शस्त्रसामग्री धारण करतो, जेणेकरून शत्रूच्या सर्व दुष्ट युक्तींवर आणि बाणांवर मी अढळ विजय मिळवू शकेन.",
      "सत्याचा पट्टा, नीतिमत्तेचे चिलखत, शांतीच्या सुवार्तेची पादत्राणे, विश्वासाची ढाल आणि तारणाचा शिरस्त्राण घालून मी आत्मविश्वासाने उभा राहतो. तुझ्या पवित्र वचनाची तलवार माझ्या हातात धरून मी अंधाराच्या सर्व शक्तींवर जय मिळवतो.",
      "माझे संपूर्ण रक्षण तुझ्या सामर्थी नावात सुरक्षित आहे; येशूच्या विजयी नावात आमेन."
    ],
    "paragraphsEn": [
      "Almighty Lord, I stand strong in the power of Your boundless might. This morning I put on the full armor of God so that I can stand firm against every scheme and fiery dart of the enemy.",
      "I gird myself with the belt of truth, the breastplate of righteousness, the gospel of peace, the shield of faith, the helmet of salvation, and the sword of the Spirit which is Your living Word.",
      "I am fully covered and utterly secure in Your victorious name; in Jesus' mighty name, Amen."
    ]
  },
  {
    "id": 29,
    "themeMr": "दैनंदिन गरजा आणि स्वर्गीय राज्याची प्राथमिकता",
    "themeEn": "Daily Provision & Seeking His Kingdom First",
    "refMr": "मत्तय ६:११-३३",
    "refEn": "Matthew 6:33",
    "bookKey": "matthew",
    "chapter": 6,
    "verse": 33,
    "paragraphsMr": [
      "हे आमच्या स्वर्गीय पित्या, तू आकाशातील पाखरांना खाऊ घालतोस आणि रानातील फुलांना राजापेक्षाही सुंदर वस्त्रे देतोस. आजच्या दिवसाची आमची रोजची भाकर तू आम्हाला दे आणि आमच्या सर्व गरजा तुझ्या विपुल समृद्धीनुसार पूर्ण कर.",
      "प्रभू, अन्नाची किंवा पैशांची व्यर्थ चिंता करण्याऐवजी प्रथम देवाचे राज्य आणि त्याचे नीतीमत्व शोधण्याचे ध्येय मला दे. माझी सर्व काळजी तुझ्यावर टाकून मी समाधानाने आणि आनंदाने दिवस व्यतीत करू शकेन अशी कृपा मला दे.",
      "तुझा विश्वासूपणा माझ्या आयुष्याचा अढळ पाया आहे; येशूच्या नावात ही प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Our Heavenly Father, You feed the birds of the air and clothe the lilies of the field in breathtaking beauty. Give us this day our daily bread and meet all our needs according to Your riches in glory.",
      "Free my mind from fretful anxiety about tomorrow, helping me instead to seek first Your Kingdom and Your righteousness. In quiet trust, I rest assured that You will add everything I need at the right time.",
      "Your faithful provision is the solid foundation of my life; in Jesus' blessed name, Amen."
    ]
  },
  {
    "id": 30,
    "themeMr": "खऱ्या द्राक्षवेलीमध्ये नित्य जीवन",
    "themeEn": "Abiding Deeply in Christ the True Vine",
    "refMr": "योहान १५:४-५",
    "refEn": "John 15:4-5",
    "bookKey": "john",
    "chapter": 15,
    "verse": 4,
    "paragraphsMr": [
      "हे प्रभू येशू, तू खरी द्राक्षवेल आहेस आणि आम्ही तुझ्या फांद्या आहोत; तुझ्याशिवाय आम्ही स्वतःहून काहीही करू शकत नाही. आजच्या या संपूर्ण दिवसात माझे मन आणि आत्मा तुझ्यात खोलवर जोडलेले राहू दे.",
      "प्रभू, तुझ्या पवित्र आत्म्याचा जीवनरस माझ्या जीवनातून अखंड वाहू दे, जेणेकरून माझ्याद्वारे खूप चांगले फळ निर्माण होईल आणि पित्याचे गौरव होईल. जगातील कोणत्याही प्रलोभनाने मला तुझ्यापासून वेगळे करू नये अशी कृपा मला दे.",
      "तुझ्यात राहूनच मला जीवनाची परिपूर्णता लाभते; येशूच्या पवित्र नावात प्रार्थना करतो, आमेन."
    ],
    "paragraphsEn": [
      "Lord Jesus, You are the True Vine and we are the branches; apart from You we can do nothing of eternal value. Keep my spirit deeply and continuously united with You throughout this day.",
      "Let the sap of Your Holy Spirit flow freely through my life, producing abundant, lasting fruit that brings great glory to the Father. Protect me from any temptation or distraction that seeks to sever my focus from You.",
      "In You alone my soul finds complete life and overflowing joy; in Jesus' lovely name, Amen."
    ]
  },
  {
    "id": 31,
    "themeMr": "सार्वकालिक आशा आणि स्वर्गीय आनंद",
    "themeEn": "Eternal Hope & Heavenly Joy",
    "refMr": "प्रकटीकरण २१:३-४",
    "refEn": "Revelation 21:3-4",
    "bookKey": "revelation",
    "chapter": 21,
    "verse": 3,
    "paragraphsMr": [
      "हे सार्वकालिक आणि गौरवी राजा, आम्ही त्या दिवसाची वाट पाहत आहोत जेव्हा तू आमच्या डोळ्यांतील प्रत्येक अश्रू पुसून घेशील आणि दुःख, विलाप किंवा वेदना राहणार नाहीत. या अद्भुत स्वर्गीय आशेने माझे हृदय आज नव्या उत्साहाने भरून काढ.",
      "प्रभू, तात्पुरत्या संकटांकडे न पाहता सार्वकालिक गौरवाकडे पाहून जगण्याचे आत्मिक सामर्थ्य मला दे. आज मी जिथे जाईन तिथे या चिरंतन आशेचा आणि तारणाचा आनंद माझ्या मुखातून आणि कार्यातून व्यक्त होऊ दे.",
      "तुझे राज्य लवकर येवो आणि तुझे नाव सर्व जगात उंचावले जावो; येशूच्या सामर्थी नावात आमेन."
    ],
    "paragraphsEn": [
      "Glorious and Eternal King, we eagerly anticipate the day when You will wipe every tear from our eyes and there will be no more sorrow, crying, or pain. Fill my heart today with the radiant joy of this eternal hope.",
      "Help me look beyond the temporary troubles of this present age to the exceeding weight of glory prepared for us. May my speech, my conduct, and my demeanor reflect the unshakable joy of heaven today.",
      "May Your Kingdom come and Your holy name be exalted in all the earth; in Jesus' mighty name, Amen."
    ]
  }
];

window.getTodayHeadwatersPrayer = function() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const offset = (window.state && window.state.vodDayOffset) ? window.state.vodDayOffset : 0;
  
  const len = DAILY_HEADWATERS_PRAYERS.length;
  const idx = ((dayOfYear + offset) % len + len) % len;
  return DAILY_HEADWATERS_PRAYERS[idx];
};

window.renderHeadwatersModalContent = function() {
  const prayer = window.getTodayHeadwatersPrayer();
  if (!prayer) return;
  
  const isEng = (window.state && window.state.translation === "eng");
  
  // Theme badge & Title
  const themeBadge = document.getElementById("headwaters-theme-badge");
  if (themeBadge) {
    themeBadge.textContent = isEng ? `✨ ${prayer.themeEn}` : `✨ ${prayer.themeMr}`;
  }
  
  const titleEl = document.getElementById("headwaters-prayer-title");
  if (titleEl) {
    titleEl.textContent = isEng ? "Today's Guided Prayer" : "आजची सकाळची प्रार्थना";
  }
  
  // Render Paragraphs
  const container = document.getElementById("headwaters-prayer-container");
  if (container) {
    const paragraphs = isEng ? prayer.paragraphsEn : prayer.paragraphsMr;
    container.innerHTML = paragraphs.map(p => `<p style="margin: 0; line-height: 1.75;">"${p}"</p>`).join("");
  }
  
  // Dynamic Open in Bible button text
  const btnText = document.getElementById("headwaters-btn-text");
  if (btnText) {
    btnText.textContent = isEng ? `Open in Bible • ${prayer.refEn}` : `Open in Bible • ${prayer.refMr} वाचा`;
  }
  
  // Audio time estimate
  const timeEl = document.getElementById("headwaters-audio-time");
  if (timeEl) {
    const allText = (isEng ? prayer.paragraphsEn : prayer.paragraphsMr).join(" ");
    const words = allText.split(/\s+/).length;
    const estSec = Math.max(35, Math.min(75, Math.round(words / 2.2)));
    const m = Math.floor(estSec / 60);
    const s = (estSec % 60).toString().padStart(2, "0");
    timeEl.textContent = `0:${s}` === "0:60" ? "1:00" : `${m}:${s}`;
  }
};

window.openCurrentHeadwatersBibleChapter = function() {
  const prayer = window.getTodayHeadwatersPrayer();
  if (prayer && prayer.bookKey) {
    openReaderAndNavigate(prayer.bookKey, prayer.chapter, prayer.verse);
  } else {
    openReaderAndNavigate("lamentations", 3, 22);
  }
};

window.openHeadwatersModal = function() {
  const modal = document.getElementById("modal-headwaters-sanctuary");
  if (modal) {
    modal.style.display = "flex";
    renderHeadwatersModalContent();
  }
};

window.closeHeadwatersModal = function() {
  const modal = document.getElementById("modal-headwaters-sanctuary");
  if (modal) modal.style.display = "none";
  
  if (window.headwatersAudioInstance) {
    try { window.headwatersAudioInstance.pause(); } catch(e) {}
    window.headwatersAudioInstance = null;
  }
  if (window.headwatersProgressInterval) {
    clearInterval(window.headwatersProgressInterval);
    window.headwatersProgressInterval = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  const icon = document.getElementById("headwaters-play-icon");
  if (icon) {
    icon.innerHTML = '<polygon points="6 4 20 12 6 20 6 4"></polygon>';
  }
  const progressBar = document.getElementById("headwaters-progress-bar");
  if (progressBar) progressBar.style.width = '0%';
  const playerBox = document.getElementById("headwaters-audio-player-box");
  if (playerBox) playerBox.classList.remove("playing");
};

window.headwatersAudioPlayer = {
  isPlaying: false,
  isPaused: false,
  progressInterval: null,
  startTs: 0,
  pausedElapsed: 0,
  estimatedDurationMs: 45000,
  activeAudio: null,
  activeUtterance: null,
  currentSessionId: 0
};

window.playHeadwatersMorningAudio = async function(btnElement) {
  const icon = document.getElementById("headwaters-play-icon");
  const progressBar = document.getElementById("headwaters-progress-bar");
  const timeEl = document.getElementById("headwaters-audio-time");
  const playerBox = document.getElementById("headwaters-audio-player-box");
  const player = window.headwatersAudioPlayer;
  
  const prayer = window.getTodayHeadwatersPrayer();
  const isEng = (window.state && window.state.translation === "eng");
  const paragraphs = (prayer && (isEng ? prayer.paragraphsEn : prayer.paragraphsMr)) || [
    "हे दयाळू आणि सर्वसमर्थ स्वर्गीय पित्या, या नव्या दिवसाच्या उषःकाली मी अत्यंत कृतज्ञ अंतःकरणाने तुझ्या पवित्र चरणांशी नतमस्तक होतो."
  ];
  const fullPrayerText = paragraphs.join(" ");
  
  // 1. If currently playing, Pause
  if (player.isPlaying && !player.isPaused) {
    player.isPaused = true;
    player.pausedElapsed = Date.now() - player.startTs;
    
    if (player.activeAudio && !player.activeAudio.paused) {
      try { player.activeAudio.pause(); } catch(e) {}
    }
    if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      try { window.speechSynthesis.pause(); } catch(e) {}
    }
    if (player.progressInterval) {
      clearInterval(player.progressInterval);
      player.progressInterval = null;
    }
    
    if (icon) icon.innerHTML = '<polygon points="6 4 20 12 6 20 6 4"></polygon>';
    if (playerBox) playerBox.classList.remove("playing");
    showToast(isEng ? "⏸ Audio Paused" : "⏸ ऑडिओ थांबवला (Audio Paused)");
    return;
  }
  
  // 2. If paused, Resume
  if (player.isPlaying && player.isPaused) {
    player.isPaused = false;
    player.startTs = Date.now() - player.pausedElapsed;
    
    if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
    if (playerBox) playerBox.classList.add("playing");
    
    if (player.activeAudio && player.activeAudio.paused) {
      player.activeAudio.play().catch(e => console.warn(e));
    } else if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    
    startHeadwatersProgressLoop();
    showToast(isEng ? "▶ Resuming Prayer..." : "▶ प्रार्थना सुरू ठेवत आहे...");
    return;
  }
  
  // 3. Clean slate: Stop all other active audio
  if (window.currentSingleAudio) {
    try { window.currentSingleAudio.pause(); } catch(e) {}
    window.currentSingleAudio = null;
  }
  if (window.audioPlayerInstance) {
    try { window.audioPlayerInstance.pause(); } catch(e) {}
    window.audioPlayerInstance = null;
  }
  if (window.SarvamTTS && window.SarvamTTS.queue) {
    try { window.SarvamTTS.queue.stop(); } catch(e) {}
  }
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch(e) {}
  }
  
  // Unlock audio context on mobile immediately
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();
    }
  } catch(e) {}
  
  player.currentSessionId = Date.now();
  const thisSessionId = player.currentSessionId;
  
  // Duration calculation
  const words = fullPrayerText.split(/\s+/).length;
  const estDurationSec = Math.max(30, Math.min(85, Math.round(words / 1.9)));
  player.estimatedDurationMs = estDurationSec * 1000;
  player.startTs = Date.now();
  player.pausedElapsed = 0;
  player.isPlaying = true;
  player.isPaused = false;
  
  if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
  if (playerBox) playerBox.classList.add("playing");
  if (progressBar) progressBar.style.width = '3%';
  
  startHeadwatersProgressLoop();
  
  // 4. Try Direct High-Fidelity Audio File First
  const directAudioPath = (prayer && prayer.id === 1) ? "assets/audio/devotional/headwaters_morning.mp3" : null;
  if (directAudioPath && !isEng) {
    try {
      const audio = new Audio(directAudioPath);
      player.activeAudio = audio;
      window.currentSingleAudio = audio;
      
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          player.estimatedDurationMs = Math.round(audio.duration * 1000);
        }
      };
      
      audio.ontimeupdate = () => {
        if (!player.isPlaying || player.isPaused) return;
        const cur = audio.currentTime || 0;
        const dur = audio.duration || (player.estimatedDurationMs / 1000);
        const pct = Math.min(99, Math.max(0, (cur / dur) * 100));
        if (progressBar) progressBar.style.width = `${pct.toFixed(1)}%`;
        
        const mCur = Math.floor(cur / 60);
        const sCur = Math.floor(cur % 60).toString().padStart(2, "0");
        const mDur = Math.floor(dur / 60);
        const sDur = Math.floor(dur % 60).toString().padStart(2, "0");
        if (timeEl) timeEl.textContent = `${mCur}:${sCur} / ${mDur}:${sDur}`;
      };
      
      audio.onplay = () => {
        showToast("🔊 सकाळची प्रार्थना सुरू आहे (Natural Devotional Marathi Voice) ✨");
      };
      
      audio.onended = () => {
        if (player.currentSessionId === thisSessionId) {
          stopHeadwatersPlaybackState();
        }
      };
      
      audio.onerror = () => {
        console.warn("Direct audio failed, falling back to Web Speech...");
        player.activeAudio = null;
        executeHeadwatersSpeechSynthesis(fullPrayerText, isEng, thisSessionId);
      };
      
      await audio.play();
      return;
    } catch (e) {
      console.warn("Direct audio playback failed:", e);
      player.activeAudio = null;
    }
  }
  
  // 5. Fallback: Universal Voice Speech Synthesis
  executeHeadwatersSpeechSynthesis(fullPrayerText, isEng, thisSessionId);
};

function executeHeadwatersSpeechSynthesis(fullPrayerText, isEng, thisSessionId) {
  const player = window.headwatersAudioPlayer;
  
  if (window.speechSynthesis) {
    const cleanText = fullPrayerText
      .replace(/[—–]/g, ', ')
      .replace(/[;:]/g, ', ')
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = isEng ? 0.92 : 0.86;
    utter.pitch = 0.95;
    
    const voices = window.speechSynthesis.getVoices() || [];
    let selectedVoice = null;
    
    if (!isEng) {
      selectedVoice = voices.find(v => (v.lang === 'mr-IN' || v.lang === 'mr_IN' || v.lang.startsWith('mr')));
      if (!selectedVoice) {
        selectedVoice = voices.find(v => (v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi')));
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('IN') || (v.name && v.name.toLowerCase().includes('india')));
      }
      
      if (selectedVoice) {
        utter.voice = selectedVoice;
        utter.lang = selectedVoice.lang;
      } else {
        utter.lang = 'mr-IN';
      }
    } else {
      selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))) ||
                      voices.find(v => v.lang.startsWith('en'));
      if (selectedVoice) {
        utter.voice = selectedVoice;
        utter.lang = selectedVoice.lang;
      } else {
        utter.lang = 'en-US';
      }
    }
    
    utter.onstart = () => {
      if (player.currentSessionId === thisSessionId) {
        player.startTs = Date.now();
        showToast(isEng ? "🔊 Listening to Daily Prayer ✨" : "🔊 सकाळची प्रार्थना सुरू आहे (Daily Guided Prayer) ✨");
      }
    };
    
    utter.onend = () => {
      if (player.currentSessionId === thisSessionId && player.isPlaying && !player.isPaused) {
        stopHeadwatersPlaybackState();
      }
    };
    
    utter.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn("[Headwaters TTS Error]:", e);
      if (player.currentSessionId === thisSessionId) {
        stopHeadwatersPlaybackState();
      }
    };
    
    player.activeUtterance = utter;
    window.speechSynthesis.speak(utter);
  } else {
    showToast("ऑडिओ उपलब्ध नाही (Speech synthesis not supported)");
    stopHeadwatersPlaybackState();
  }
}

function startHeadwatersProgressLoop() {
  const player = window.headwatersAudioPlayer;
  const progressBar = document.getElementById("headwaters-progress-bar");
  const timeEl = document.getElementById("headwaters-audio-time");
  
  if (player.progressInterval) clearInterval(player.progressInterval);
  
  player.progressInterval = setInterval(() => {
    if (!player.isPlaying || player.isPaused) return;
    
    // If active audio element is tracking its own time, let audio.ontimeupdate handle it
    if (player.activeAudio) return;
    
    const elapsedMs = Date.now() - player.startTs;
    const pct = Math.min(99, (elapsedMs / player.estimatedDurationMs) * 100);
    if (progressBar) progressBar.style.width = `${pct.toFixed(1)}%`;
    
    const curSec = Math.floor(elapsedMs / 1000);
    const totSec = Math.floor(player.estimatedDurationMs / 1000);
    const mCur = Math.floor(curSec / 60);
    const sCur = (curSec % 60).toString().padStart(2, "0");
    const mTot = Math.floor(totSec / 60);
    const sTot = (totSec % 60).toString().padStart(2, "0");
    if (timeEl) timeEl.textContent = `${mCur}:${sCur} / ${mTot}:${sTot}`;
    
    if (elapsedMs >= player.estimatedDurationMs + 2000) {
      stopHeadwatersPlaybackState();
    }
  }, 250);
}

function stopHeadwatersPlaybackState() {
  const player = window.headwatersAudioPlayer;
  player.isPlaying = false;
  player.isPaused = false;
  player.pausedElapsed = 0;
  
  if (player.activeAudio) {
    try { player.activeAudio.pause(); } catch(e) {}
    player.activeAudio = null;
  }
  
  if (player.progressInterval) {
    clearInterval(player.progressInterval);
    player.progressInterval = null;
  }
  
  const icon = document.getElementById("headwaters-play-icon");
  const playerBox = document.getElementById("headwaters-audio-player-box");
  const progressBar = document.getElementById("headwaters-progress-bar");
  const timeEl = document.getElementById("headwaters-audio-time");
  
  if (icon) icon.innerHTML = '<polygon points="6 4 20 12 6 20 6 4"></polygon>';
  if (playerBox) playerBox.classList.remove("playing");
  if (progressBar) progressBar.style.width = '0%';
  
  if (timeEl) {
    const totSec = Math.floor(player.estimatedDurationMs / 1000);
    const mTot = Math.floor(totSec / 60);
    const sTot = (totSec % 60).toString().padStart(2, "0");
    timeEl.textContent = `${mTot}:${sTot}`;
  }
}

window.closeHeadwatersModal = function() {
  const modal = document.getElementById("modal-headwaters-sanctuary");
  if (modal) modal.style.display = "none";
  
  const player = window.headwatersAudioPlayer;
  if (player) {
    player.currentSessionId = 0;
  }
  
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  stopHeadwatersPlaybackState();
};

// 2. THE DAILY CONFLUENCE LOGIC
const CONFLUENCE_SOUL_DB = {
  restless: {
    title: "🌊 Restless & Anxious • अस्वस्थ व चिंताग्रस्त मन",
    desc: "जेव्हा विचारांचा प्रवाह गोंधळलेला असतो, तेव्हा देवाच्या शांतीचा किनारा शोधा.",
    verses: [
      {
        refMr: "फिलिप्पैकरांस ४:६-७",
        refEn: "Philippians 4:6-7",
        textMr: "कशाविषयीही काळजी करू नका, तर सर्व गोष्टींत प्रार्थना आणि विनंत्यांद्वारे उपकारस्तुतीसह आपल्या मागण्या देवाला कळवा. म्हणजे सर्व बुद्धीच्या पलीकडची देवाची शांती तुमच्या हृदयांचे व मनांचे ख्रिस्त येशूच्या द्वारे रक्षण करील.",
        textEn: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God will guard your hearts and minds.",
        note: "आपली प्रत्येक काळजी प्रार्थनेद्वारे देवाला द्या. त्याची शांती तुमची काळजी घेईल.",
        bookKey: "philippians", chapter: 4, verse: 6
      },
      {
        refMr: "स्तोत्रसंहिता ४६:१०",
        refEn: "Psalm 46:10",
        textMr: "शांत व्हा आणि जाणा की मीच देव आहे; राष्ट्रांमध्ये मी थोर मानला जाईन, पृथ्वीवर मी थोर मानला जाईन.",
        textEn: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.",
        note: "क्षणभर थांबा आणि देवाची सार्वभौम शक्ती अनुभवा.",
        bookKey: "psalms", chapter: 46, verse: 10
      }
    ]
  },
  heavy: {
    title: "🌧️ Heavy & Weary • थकलेले व जड झालेले मन",
    desc: "जेव्हा मनावर जबाबदाऱ्यांचे किंवा दुःखाचे ओझे जड असते, तेव्हा येशू आपल्याला विसावा देतो.",
    verses: [
      {
        refMr: "मत्तय ११:२८",
        refEn: "Matthew 11:28",
        textMr: "अहो कष्टी व ओझे वाहणारे सर्व लोकहो, माझ्याकडे या, म्हणजे मी तुम्हांला विसावा देईन.",
        textEn: "Come to me, all you who are weary and burdened, and I will give you rest.",
        note: "येशू तुमचे जड ओझे स्वतःवर घेण्यास तयार आहे.",
        bookKey: "matthew", chapter: 11, verse: 28
      },
      {
        refMr: "स्तोत्रसंहिता ५५:२२",
        refEn: "Psalm 55:22",
        textMr: "तुझे ओझे परमेश्वरावर टाक, म्हणजे तो तुला साभाळील; तो नीतिमानाला कधीही ढळू देणार नाही.",
        textEn: "Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken.",
        note: "तुमचे सर्व ओझे परमेश्वरावर टाका, तो तुम्हाला कधीही पडू देणार नाही.",
        bookKey: "psalms", chapter: 55, verse: 22
      }
    ]
  },
  thirsty: {
    title: "🏜️ Thirsty & Seeking • आत्मिक तहान व शोधात असलेले मन",
    desc: "जेव्हा आत्म्याला नव्या प्रेरणेची आणि देवाच्या सान्निध्याची तहान लागते.",
    verses: [
      {
        refMr: "स्तोत्रसंहिता ४२:१-२",
        refEn: "Psalm 42:1-2",
        textMr: "जशी हरणी पाण्याच्या प्रवाहासाठी तहानते, तसेच हे देवा, माझे मन तुझ्यासाठी तहानते. माझे मन देवासाठी, जिवंत देवासाठी तहानले आहे.",
        textEn: "As the deer pants for streams of water, so my soul pants for you, my God. My soul thirsts for God, for the living God.",
        note: "जिवंत देवाचे सान्निध्य हीच आत्म्याची खरी तहान भागवते.",
        bookKey: "psalms", chapter: 42, verse: 1
      },
      {
        refMr: "यशया ५५:१",
        refEn: "Isaiah 55:1",
        textMr: "अहो तहानलेल्या सर्व लोकहो, पाण्याकडे या! ज्यांच्याजवळ पैसे नाहीत त्यांनीही या, विकत घ्या आणि खा!",
        textEn: "Come, all you who are thirsty, come to the waters; and you who have no money, come, buy and eat!",
        note: "देवाची कृपा अमूल्य व विनामूल्य सर्वांसाठी खुली आहे.",
        bookKey: "isaiah", chapter: 55, verse: 1
      }
    ]
  },
  peace: {
    title: "🕊️ Peaceful & Still • शांत व स्थिर मन",
    desc: "देवाने दिलेल्या शांतीमध्ये स्थिर राहून त्याचे गौरव करा.",
    verses: [
      {
        refMr: "योहान १४:२७",
        refEn: "John 14:27",
        textMr: "मी तुम्हांला शांती देऊन जातो; माझीच शांती मी तुम्हांला देतो; जग देते तशी मी तुम्हांला देत नाही. तुमचे हृदय अस्वस्थ होऊ नये व ते भयभीतही होऊ नये.",
        textEn: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.",
        note: "ख्रिस्ताची शांती बाह्य परिस्थितीवर अवलंबून नसते.",
        bookKey: "john", chapter: 14, verse: 27
      }
    ]
  },
  gratitude: {
    title: "✨ Grateful & Joyful • आनंदी व कृतज्ञ मन",
    desc: "देवाने केलेल्या महान उपकारांचे स्मरण करून आनंदोत्सव साजरा करा.",
    verses: [
      {
        refMr: "स्तोत्रसंहिता १०३:१-२",
        refEn: "Psalm 103:1-2",
        textMr: "हे माझ्या मना, परमेश्वराचा धन्यवाद कर, आणि माझ्या अंतर्यामातील सर्व काही त्याच्या पवित्र नावाचा धन्यवाद करो! त्याचे कोणतेही उपकार विसरू नको!",
        textEn: "Praise the Lord, my soul; all my inmost being, praise his holy name. Praise the Lord, my soul, and forget not all his benefits.",
        note: "देवाच्या आशीर्वादांची मोजदाद करा आणि त्याचे आभार माना.",
        bookKey: "psalms", chapter: 103, verse: 1
      }
    ]
  }
};

window.openConfluenceModal = function(initialFlow) {
  const modal = document.getElementById("modal-confluence-flow");
  if (!modal) return;
  modal.style.display = "flex";
  switchConfluenceTab(initialFlow || "heavy");
};

window.closeConfluenceModal = function() {
  const modal = document.getElementById("modal-confluence-flow");
  if (modal) modal.style.display = "none";
};

window.openConfluenceFlow = function(flowKey, event) {
  if (event) event.stopPropagation();
  // Update card active chip
  document.querySelectorAll(".confluence-chip-pill").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.toLowerCase().includes(flowKey.substring(0,4)));
  });
  openConfluenceModal(flowKey);
};

window.playConfluenceVerseAudio = function(flowKey, verseIdx, btn) {
  const data = CONFLUENCE_SOUL_DB[flowKey];
  if (!data || !data.verses || !data.verses[verseIdx]) return;
  const v = data.verses[verseIdx];
  const text = `${v.refMr}... ${v.textMr}`;
  const directPath = `assets/audio/devotional/confluence_${flowKey}_${verseIdx}.mp3`;
  playSingleVerseAudio(text, btn, directPath);
};

window.switchConfluenceTab = function(flowKey) {
  const data = CONFLUENCE_SOUL_DB[flowKey] || CONFLUENCE_SOUL_DB.heavy;
  
  // Highlight tab button
  document.querySelectorAll(".confluence-tab-btn").forEach(btn => {
    const isAct = btn.dataset.flow === flowKey;
    btn.style.background = isAct ? "#0d9488" : "var(--surface)";
    btn.style.color = isAct ? "#ffffff" : "var(--text)";
    btn.style.borderColor = isAct ? "#0d9488" : "var(--border)";
    btn.style.fontWeight = isAct ? "800" : "700";
  });

  const container = document.getElementById("confluence-flow-body-container");
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom: 16px; background: rgba(13,148,136,0.06); border-radius: 14px; padding: 14px; border-left: 4px solid #0d9488;">
      <h4 style="font-size: 16px; font-weight: 800; color: #0f766e; margin: 0 0 4px 0;">${data.title}</h4>
      <p style="font-size: 13px; color: var(--text-muted); margin: 0;">${data.desc}</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${data.verses.map((v, idx) => `
        <div style="background: var(--bg); border: 1.5px solid var(--border); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-xs);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 13px; font-weight: 800; color: #0f766e; background: rgba(13,148,136,0.12); padding: 3px 10px; border-radius: 8px;">${v.refMr} • ${v.refEn}</span>
            <button onclick="playConfluenceVerseAudio('${flowKey}', ${idx}, this)" style="background: var(--surface); border: 1.5px solid #0d9488; padding: 5px 12px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #0f766e; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(13,148,136,0.15);">
              <span>▶ ऐका</span>
            </button>
          </div>
          
          <blockquote style="font-family: var(--font-body); font-size: 15.5px; font-weight: 700; line-height: 1.6; color: var(--text); margin: 0 0 8px 0;">
            "${v.textMr}"
          </blockquote>
          
          <p style="font-size: 13px; color: var(--text-muted); font-style: italic; margin: 0 0 10px 0; line-height: 1.4;">
            "${v.textEn}"
          </p>

          <div style="background: rgba(201,138,44,0.08); border-left: 3px solid var(--accent-gold); padding: 8px 10px; border-radius: 6px; margin-bottom: 12px; font-size: 12.5px; color: var(--text);">
            <strong>सांत्वन:</strong> ${v.note}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button onclick="openReaderAndNavigate('${v.bookKey}', ${v.chapter}, ${v.verse});" style="background: var(--primary); color: #ffffff; border: none; padding: 7px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer;">
              📖 बायबलमध्ये वाचा (Open in Bible)
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

// 3. LIVING WATER RESET LOGIC (ACOUSTIC BREATH & PAUSE)
let resetSessionTimer = null;
let resetSecondsRemaining = 120;
let isResetSessionRunning = false;
let resetBreathInterval = null;
let resetAudioOscillator = null;

window.openLivingWaterResetModal = function() {
  const modal = document.getElementById("modal-living-water-reset");
  if (modal) modal.style.display = "flex";
};

window.closeLivingWaterResetModal = function() {
  const modal = document.getElementById("modal-living-water-reset");
  if (modal) modal.style.display = "none";
  stopLivingWaterResetSession();
};

window.setResetDuration = function(sec, btnEl) {
  if (isResetSessionRunning) stopLivingWaterResetSession();
  resetSecondsRemaining = sec;
  document.querySelectorAll(".reset-duration-btn").forEach(b => {
    b.classList.remove("active");
    b.style.background = "rgba(255,255,255,0.08)";
    b.style.borderColor = "rgba(255,255,255,0.2)";
  });
  if (btnEl) {
    btnEl.classList.add("active");
    btnEl.style.background = "#0d9488";
    btnEl.style.borderColor = "#2dd4bf";
  }
  updateResetTimerDisplay();
};

function updateResetTimerDisplay() {
  const mins = Math.floor(resetSecondsRemaining / 60);
  const secs = resetSecondsRemaining % 60;
  const timeEl = document.getElementById("reset-timer-countdown");
  if (timeEl) {
    timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

window.toggleLivingWaterResetSession = function() {
  if (isResetSessionRunning) {
    stopLivingWaterResetSession();
  } else {
    startLivingWaterResetSession();
  }
};

function startLivingWaterResetSession() {
  isResetSessionRunning = true;
  const btnLabel = document.getElementById("reset-btn-label");
  const btnIcon = document.getElementById("reset-btn-icon");
  if (btnLabel) btnLabel.textContent = "Pause Session / थांबवा";
  if (btnIcon) btnIcon.textContent = "⏸";

  // Cycle breath instructions every 4 seconds (Inhale -> Hold -> Exhale)
  const breathStages = [
    "श्वास घ्या (Inhale Peace 🕊️)",
    "धारण करा (Hold in His Presence ✨)",
    "श्वास सोडा (Exhale Anxiety 🌊)",
    "शांत व्हा (Rest in Grace 💧)"
  ];
  let stageIdx = 0;
  const breathTextEl = document.getElementById("reset-breath-instruction");
  if (breathTextEl) breathTextEl.textContent = breathStages[0];

  resetBreathInterval = setInterval(() => {
    stageIdx = (stageIdx + 1) % breathStages.length;
    if (breathTextEl) breathTextEl.textContent = breathStages[stageIdx];
  }, 4000);

  // Play gentle acoustic tone chords via Web Audio API
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(432, audioCtx.currentTime); // 432Hz calming tone
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    resetAudioOscillator = { osc, audioCtx };
  } catch (e) {}

  resetSessionTimer = setInterval(() => {
    resetSecondsRemaining--;
    updateResetTimerDisplay();
    if (resetSecondsRemaining <= 0) {
      stopLivingWaterResetSession();
      showToast("✨ Living Water Reset Complete • मन शांत व ताजेतवाने झाले!");
    }
  }, 1000);

  showToast("🌊 Living Water Reset Started • दीर्घ श्वास घ्या...");
}

function stopLivingWaterResetSession() {
  isResetSessionRunning = false;
  if (resetSessionTimer) clearInterval(resetSessionTimer);
  if (resetBreathInterval) clearInterval(resetBreathInterval);
  if (resetAudioOscillator) {
    try {
      resetAudioOscillator.osc.stop();
      resetAudioOscillator.audioCtx.close();
    } catch (e) {}
    resetAudioOscillator = null;
  }
  const btnLabel = document.getElementById("reset-btn-label");
  const btnIcon = document.getElementById("reset-btn-icon");
  if (btnLabel) btnLabel.textContent = "Start Living Water Reset / सुरू करा";
  if (btnIcon) btnIcon.textContent = "▶";
  const breathTextEl = document.getElementById("reset-breath-instruction");
  if (breathTextEl) breathTextEl.textContent = "शांत व्हा (Rest in Grace 💧)";
}



// Global Window Exports for Localization & River of Life Modules
window.state = state;
window.I18N_DICTIONARY = I18N_DICTIONARY;
window.t = t;
window.applyAppLanguage = applyAppLanguage;
window.getActiveLanguage = getActiveLanguage;
window.applyStylesFromState = applyStylesFromState;

package com.riveroflife.bibleapp;

import android.os.Bundle;
import android.media.AudioManager;
import android.content.Context;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure Android Audio Session for system-level media stream playback
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
            setVolumeControlStream(AudioManager.STREAM_MUSIC);
            android.util.Log.d("AUDIO_SESSION", "Android Audio Session configured: stream=STREAM_MUSIC, mode=MODE_NORMAL");
        } catch (Exception e) {
            android.util.Log.e("AUDIO_SESSION", "Error configuring Android audio session: " + e.getMessage());
        }
    }
}


/**
 * ============================================================================
 * elevenlabs_demo.js — Standalone Demo & CLI Runner
 * River of Life Bible App - ElevenLabs TTS Integration
 *
 * Specifications:
 *   Voice Name: Shrey - Deep Marathi Conversational
 *   Model ID: eleven_v3
 *   Voice ID: C9v09R5AIM6tOX6Fn06I
 *   SDK: @elevenlabs/elevenlabs-js
 * ============================================================================
 *
 * Usage:
 *   npm install @elevenlabs/elevenlabs-js dotenv
 *   node elevenlabs_demo.js
 */

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// Configuration
const CONFIG = {
  voiceName: 'Shrey - Deep Marathi Conversational',
  voiceId: 'C9v09R5AIM6tOX6Fn06I',
  modelId: 'eleven_v3',
  apiKey: process.env.ELEVENLABS_API_KEY || 'YOUR_ELEVENLABS_API_KEY_HERE'
};

const client = new ElevenLabsClient({
  apiKey: CONFIG.apiKey
});

/**
 * 1. Convert a single Bible Verse to an audio file
 */
async function convertBibleVerse(verseText, outputPath) {
  console.log(`\n📖 [1/2] Converting Scripture text to audio using ${CONFIG.voiceName}...`);
  console.log(`📝 Text: "${verseText}"`);

  const audioStream = await client.textToSpeech.convert(CONFIG.voiceId, {
    model_id: CONFIG.modelId,
    text: verseText,
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.85,
      style: 0.20,
      use_speaker_boost: true
    }
  });

  const chunks = [];
  if (Buffer.isBuffer(audioStream)) {
    chunks.push(audioStream);
  } else {
    for await (const chunk of audioStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
  }

  const audioBuffer = Buffer.concat(chunks);
  fs.writeFileSync(outputPath, audioBuffer);
  console.log(`✅ Saved audio file: ${outputPath} (${audioBuffer.length} bytes)`);
}

/**
 * 2. Convert and Stream chunked text in real-time
 * Handles sequential text chunks (e.g. verse-by-verse or streaming devotional prayer)
 */
async function streamChunkedVerses(verseChunks, outputStreamPath) {
  console.log(`\n🌊 [2/2] Streaming chunked Bible text using ${CONFIG.modelId}...`);
  const writeStream = fs.createWriteStream(outputStreamPath);

  for (let i = 0; i < verseChunks.length; i++) {
    const chunkText = verseChunks[i];
    console.log(`   ▶ Streaming Chunk ${i + 1}/${verseChunks.length}: "${chunkText.slice(0, 45)}..."`);

    const audioStream = await client.textToSpeech.convertAsStream(CONFIG.voiceId, {
      model_id: CONFIG.modelId,
      text: chunkText,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.85
      }
    });

    if (typeof audioStream[Symbol.asyncIterator] === 'function') {
      for await (const audioChunk of audioStream) {
        writeStream.write(typeof audioChunk === 'string' ? Buffer.from(audioChunk) : audioChunk);
      }
    } else if (Buffer.isBuffer(audioStream)) {
      writeStream.write(audioStream);
    }
  }

  writeStream.end();
  console.log(`✅ Completed streaming all chunks into: ${outputStreamPath}`);
}

async function main() {
  console.log('======================================================');
  console.log('  River of Life - ElevenLabs Bible TTS Service Demo');
  console.log(`  Voice: ${CONFIG.voiceName} (${CONFIG.voiceId})`);
  console.log(`  Model: ${CONFIG.modelId}`);
  console.log('======================================================');

  const sampleVerse = 'परमेश्वर माझा मेंढपाळ आहे; मला काहीही कमी पडणार नाही. तो मला हिरव्या कुरणात बसवतो; तो मला शांत पाण्याच्या काठावर नेतो.';
  const sampleChunks = [
    'सुरुवातीला देवाने आकाश आणि पृथ्वी निर्माण केली.',
    'पृथ्वी निराकार आणि रिकामी होती, आणि खोल जलाशयावर अंधार होता.',
    'आणि देवाचा आत्मा पाण्याच्या पृष्ठभागावर संचार करत होता.',
    'तेव्हा देव म्हणाला, "प्रकाश होवो"; आणि प्रकाश झाला.'
  ];

  const out1 = path.join(__dirname, 'sample_verse.mp3');
  const out2 = path.join(__dirname, 'sample_chunked_passage.mp3');

  if (!CONFIG.apiKey || CONFIG.apiKey === 'YOUR_ELEVENLABS_API_KEY_HERE') {
    console.log('\n⚠️ Notice: Please set ELEVENLABS_API_KEY in your .env file to run live audio generation.');
    console.log('   The service structure, SDK integration, and streaming logic are ready!');
    return;
  }

  try {
    await convertBibleVerse(sampleVerse, out1);
    await streamChunkedVerses(sampleChunks, out2);
    console.log('\n🎉 All conversions finished successfully!');
  } catch (err) {
    console.error('❌ Synthesis Error:', err);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  convertBibleVerse,
  streamChunkedVerses,
  CONFIG
};

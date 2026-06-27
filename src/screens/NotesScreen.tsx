import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unzipSync, decompressSync, inflateSync, strFromU8 } from 'fflate';
import { Buffer } from 'buffer';
import {
  ArrowLeft, Upload, ChevronLeft, ChevronRight,
  RotateCcw, Zap, Brain, CheckCircle, XCircle, Settings2, Plus, Minus,
  BookOpen, Trash2, Clock, Save,
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { generateFromNotes, hasGroqKey } from '../services/aiService';
import { StudyContent, QuizQuestion, SavedStudySession } from '../constants/types';

const sessionsKey = (userId: string) => `study_notes_sessions_${userId}`;

const { width } = Dimensions.get('window');

type Tab = 'flashcards' | 'quiz' | 'study';
type Stage = 'input' | 'loading' | 'results';

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function bytesToStr(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
  }
  return out;
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

// Decode a hex string from a PDF stream.
// Modern PDFs (Word, Google Docs) use 2-byte UTF-16 BE glyph IDs — try that first.
function hexToText(hex: string): string {
  hex = hex.replace(/\s/g, '');
  if (!hex || hex.length % 2 !== 0) return '';

  // Try 2-byte UTF-16 BE (e.g. <0041> → 'A')
  if (hex.length % 4 === 0) {
    let t = '';
    let allPrintable = true;
    for (let i = 0; i < hex.length; i += 4) {
      const cp = parseInt(hex.slice(i, i + 4), 16);
      if (cp < 9 || (cp > 13 && cp < 32)) { allPrintable = false; break; }
      t += String.fromCodePoint(cp);
    }
    if (allPrintable && t.trim()) return t;
  }

  // 1-byte fallback
  let t = '';
  for (let i = 0; i < hex.length; i += 2) {
    const c = parseInt(hex.slice(i, i + 2), 16);
    if (c > 31 && c < 256) t += String.fromCharCode(c);
  }
  return t;
}

function extractTextFromStream(content: string, texts: string[]) {
  // (text) Tj
  for (const m of content.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g)) {
    const t = decodePdfString(m[1]);
    if (t.trim()) texts.push(t);
  }

  // <hex> Tj
  for (const m of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
    const t = hexToText(m[1]);
    if (t.trim()) texts.push(t);
  }

  // [mixed] TJ — handles both <hex> and (literal) entries in the same array
  for (const m of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
    const inner = m[1];
    const entries: { idx: number; text: string }[] = [];

    for (const h of inner.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
      const t = hexToText(h[1]);
      if (t.trim()) entries.push({ idx: h.index!, text: t });
    }
    for (const s of inner.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g)) {
      const t = decodePdfString(s[1]);
      if (t.trim()) entries.push({ idx: s.index!, text: t });
    }

    entries.sort((a, b) => a.idx - b.idx);
    if (entries.length) texts.push(entries.map((e) => e.text).join(''));
  }
}

// ── PDF extraction ────────────────────────────────────────────────────────────
// indexOf-based stream detection avoids regex backtracking on binary data.
// PDF FlateDecode = zlib (RFC 1950) → decompressSync (not inflateSync).
async function extractPdfText(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  const bytes = base64ToBytes(base64);
  const pdfStr = bytesToStr(bytes);

  const texts: string[] = [];
  let pos = 0;

  while (pos < pdfStr.length) {
    const streamPos = pdfStr.indexOf('stream', pos);
    if (streamPos === -1) break;

    const afterStream = pdfStr[streamPos + 6];
    if (afterStream !== '\n' && afterStream !== '\r') {
      pos = streamPos + 6;
      continue;
    }

    const dictStart = pdfStr.lastIndexOf('<<', streamPos);
    if (dictStart === -1) { pos = streamPos + 6; continue; }
    const dict = pdfStr.slice(dictStart, streamPos);

    let dataStart = streamPos + 6;
    if (pdfStr[dataStart] === '\r') dataStart++;
    if (pdfStr[dataStart] === '\n') dataStart++;

    const endPos = pdfStr.indexOf('endstream', dataStart);
    if (endPos === -1) { pos = streamPos + 6; continue; }

    let dataEnd = endPos;
    if (pdfStr[dataEnd - 1] === '\n') dataEnd--;
    if (pdfStr[dataEnd - 1] === '\r') dataEnd--;

    const hasFlate = /FlateDecode/.test(dict);

    let content: string;
    if (hasFlate) {
      const rawBytes = new Uint8Array(dataEnd - dataStart);
      for (let i = 0; i < rawBytes.length; i++) {
        rawBytes[i] = pdfStr.charCodeAt(dataStart + i) & 0xFF;
      }
      let decompressed: Uint8Array | null = null;
      // Try zlib (RFC 1950) — standard PDF FlateDecode
      try { decompressed = decompressSync(rawBytes); } catch (_) {}
      // Some PDFs use raw deflate without a zlib header
      if (!decompressed) { try { decompressed = inflateSync(rawBytes); } catch (_) {} }
      if (!decompressed) { pos = endPos + 9; continue; }
      content = bytesToStr(decompressed);
    } else {
      content = pdfStr.slice(dataStart, dataEnd);
    }

    if (/Tj|TJ/.test(content)) {
      extractTextFromStream(content, texts);
    }

    pos = endPos + 9;
  }

  // Fallback A: scan raw PDF bytes for text operators (catches uncompressed streams)
  if (texts.length === 0) {
    extractTextFromStream(pdfStr, texts);
  }

  // Fallback B: brute-force — collect all printable ASCII runs ≥ 4 chars that look like words
  if (texts.length === 0) {
    const words: string[] = [];
    let run = '';
    for (let i = 0; i < pdfStr.length; i++) {
      const c = pdfStr.charCodeAt(i);
      if (c >= 32 && c <= 126) {
        run += pdfStr[i];
      } else {
        if (run.length >= 4 && /[A-Za-z]{2}/.test(run)) words.push(run.trim());
        run = '';
      }
    }
    if (words.length > 30) texts.push(words.join(' '));
  }

  const result = texts.join(' ').replace(/\s+/g, ' ').trim();
  if (!result) {
    throw new Error(
      'Could not extract text from this PDF. If it is scanned, please copy and paste the text manually.'
    );
  }
  return result;
}

// ── DOCX extraction ───────────────────────────────────────────────────────────
async function extractDocxText(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  const unzipped = unzipSync(base64ToBytes(base64));
  const xmlBytes = unzipped['word/document.xml'];
  if (!xmlBytes) throw new Error('Could not read this Word document');
  return strFromU8(xmlBytes)
    .replace(/<w:br[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

// ── Loading screen ────────────────────────────────────────────────────────────
const LOADING_MSGS = [
  'Reading your notes…',
  'Finding key concepts…',
  'Crafting quiz questions…',
  'Building flashcards…',
  'Writing study questions…',
  'Almost ready…',
];

function LoadingScreen({ theme }: { theme: any }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMsgIdx((i) => (i + 1) % LOADING_MSGS.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 1800);

    return () => { pulse.stop(); clearInterval(interval); };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <LinearGradient colors={theme.heroGradient} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient colors={['#6c47ff', '#2563eb']} style={loadS.orb}>
          <Brain size={40} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text style={[loadS.msg, { color: theme.textPrimary, opacity: fadeAnim }]}>
        {LOADING_MSGS[msgIdx]}
      </Animated.Text>
      <Text style={[loadS.sub, { color: theme.textSecondary }]}>AI is studying your notes</Text>
    </View>
  );
}

const loadS = StyleSheet.create({
  orb: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  msg: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, textAlign: 'center' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotesScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { apiKey, user } = useAppStore();
  const { showToast } = useToast();

  const [stage, setStage] = useState<Stage>('input');
  const [notesText, setNotesText] = useState('');
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState<StudyContent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('flashcards');

  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);

  // Generation counts
  const [quizCount, setQuizCount] = useState(5);
  const [flashcardCount, setFlashcardCount] = useState(8);
  const [studyQCount, setStudyQCount] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  // Saved sessions
  const [sessions, setSessions] = useState<SavedStudySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(sessionsKey(user.id)).then((raw) => {
      if (raw) setSessions(JSON.parse(raw));
    });
  }, [user?.id]);

  const persistSessions = (updated: SavedStudySession[]) => {
    setSessions(updated);
    if (user?.id) AsyncStorage.setItem(sessionsKey(user.id), JSON.stringify(updated)).catch(() => {});
  };

  const saveSession = () => {
    if (!content) return;
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const title = fileName
      ? fileName.replace(/\.[^.]+$/, '')
      : `Session ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const session: SavedStudySession = {
      id,
      title,
      fileName,
      notesPreview: notesText.slice(0, 120),
      createdAt: new Date().toISOString(),
      content,
    };
    persistSessions([session, ...sessions]);
    setCurrentSessionId(id);
    showToast('Session saved!', 'success');
  };

  const deleteSession = (id: string) => {
    Alert.alert('Delete Session', 'Remove this saved session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          persistSessions(sessions.filter((s) => s.id !== id));
          if (currentSessionId === id) setCurrentSessionId(null);
          showToast('Session deleted', 'info');
        },
      },
    ]);
  };

  const loadSession = (session: SavedStudySession) => {
    setContent(session.content);
    setFileName(session.fileName ?? '');
    setNotesText(session.notesPreview);
    setCurrentSessionId(session.id);
    setActiveTab('flashcards');
    resetCard(0);
    setQuizIndex(0); setSelected(null); setRevealed(false); setQuizAnswers([]);
    setStage('results');
  };

  const s = styles(theme);

  const flipCard = () => {
    // Phase 1: rotate out to 90° (card disappears edge-on)
    Animated.timing(flipAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
      // Swap content while invisible at the edge
      setShowBack((v) => !v);
      setFlipped((v) => !v);
      flipAnim.setValue(-1);
      // Phase 2: rotate back in from -90° to 0°
      Animated.timing(flipAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    });
  };

  const resetCard = (idx: number) => {
    setCardIndex(idx);
    setFlipped(false);
    setShowBack(false);
    flipAnim.setValue(0);
  };

  // Maps -1→-90°, 0→0°, 1→90°  — text is never inverted
  const frontRotateY = flipAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });
  const cardOpacity = flipAnim.interpolate({ inputRange: [-1, -0.8, 0.8, 1], outputRange: [0, 1, 1, 0] });

  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc'];
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME_TYPES,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const ext = (asset.name ?? '').split('.').pop()?.toLowerCase() ?? '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showToast('Only PDF, DOCX, TXT and MD files are supported', 'error');
        return;
      }

      let text = '';
      if (ext === 'pdf') {
        text = await extractPdfText(asset.uri);
      } else if (ext === 'docx' || ext === 'doc') {
        text = await extractDocxText(asset.uri);
      } else {
        text = await FileSystem.readAsStringAsync(asset.uri);
      }

      if (!text.trim()) { showToast('No readable text found in this file', 'error'); return; }
      setNotesText(text);
      setFileName(asset.name ?? 'file');
      showToast('File loaded! Ready to generate.', 'success');
    } catch (e: any) {
      showToast(e?.message ?? 'Could not read file — try pasting the text instead', 'error');
    }
  };

  const generate = async () => {
    if (!notesText.trim()) { showToast('Paste or upload your notes first', 'error'); return; }
    if (!hasGroqKey(apiKey)) { showToast('Add your Groq API key in Profile', 'error'); return; }
    setStage('loading');
    try {
      const result = await generateFromNotes(apiKey, notesText, { quiz: quizCount, flashcards: flashcardCount, studyQuestions: studyQCount });
      setContent(result);
      setCurrentSessionId(null);
      setActiveTab('flashcards');
      resetCard(0);
      setQuizIndex(0); setSelected(null); setRevealed(false); setQuizAnswers([]);
      setStage('results');
    } catch (err: any) {
      showToast(err.message ?? 'Generation failed', 'error');
      setStage('input');
    }
  };

  const quizScore = quizAnswers.filter((a, i) => content?.quiz[i] && a === content.quiz[i].correctIndex).length;

  if (stage === 'loading') return <LoadingScreen theme={theme} />;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <LinearGradient colors={theme.heroGradient} style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerRow}>
          <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.headerIcon}>
            <Brain size={20} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={s.headerTitle}>Study from Notes</Text>
            <Text style={s.headerSub}>Turn notes into flashcards, quizzes & more</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── INPUT ── */}
      {stage === 'input' && (
        <ScrollView contentContainerStyle={s.inputContent} keyboardShouldPersistTaps="handled">

          {/* Saved sessions */}
          {sessions.length > 0 && (
            <View style={s.savedSection}>
              <View style={s.savedHeader}>
                <BookOpen size={15} color={theme.textSecondary} />
                <Text style={[s.savedTitle, { color: theme.textSecondary }]}>Saved Sessions</Text>
              </View>
              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[s.sessionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => loadSession(session)}
                  activeOpacity={0.8}
                >
                  <View style={s.sessionCardLeft}>
                    <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.sessionIcon}>
                      <BookOpen size={14} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.sessionName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {session.title}
                      </Text>
                      <Text style={[s.sessionMeta, { color: theme.textMuted }]} numberOfLines={1}>
                        {session.notesPreview}
                      </Text>
                      <View style={s.sessionBadges}>
                        <View style={[s.sessionBadge, { backgroundColor: '#6c47ff18' }]}>
                          <Text style={[s.sessionBadgeText, { color: '#a78bfa' }]}>
                            {session.content.quiz.length}Q
                          </Text>
                        </View>
                        <View style={[s.sessionBadge, { backgroundColor: '#2563eb18' }]}>
                          <Text style={[s.sessionBadgeText, { color: '#60a5fa' }]}>
                            {session.content.flashcards.length} cards
                          </Text>
                        </View>
                        <View style={[s.sessionBadge, { backgroundColor: '#10b98118' }]}>
                          <Text style={[s.sessionBadgeText, { color: '#34d399' }]}>
                            {session.content.studyQuestions.length} Qs
                          </Text>
                        </View>
                        <View style={s.sessionDateRow}>
                          <Clock size={10} color={theme.textMuted} />
                          <Text style={[s.sessionBadgeText, { color: theme.textMuted }]}>
                            {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteSession(session.id)}
                    style={s.sessionDelete}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={15} color={theme.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <View style={[s.savedDivider, { backgroundColor: theme.border }]} />
            </View>
          )}

          <TouchableOpacity style={s.uploadZone} onPress={pickFile} activeOpacity={0.8}>
            <LinearGradient colors={['#6c47ff18', '#2563eb18']} style={s.uploadGrad}>
              <View style={s.uploadIconWrap}>
                <Upload size={28} color="#6c47ff" />
              </View>
              {fileName ? (
                <>
                  <Text style={[s.uploadTitle, { color: theme.textPrimary }]}>{fileName}</Text>
                  <Text style={[s.uploadHint, { color: theme.textSecondary }]}>Tap to change file</Text>
                </>
              ) : (
                <>
                  <Text style={[s.uploadTitle, { color: theme.textPrimary }]}>Upload your notes</Text>
                  <Text style={[s.uploadHint, { color: theme.textSecondary }]}>PDF and DOCX supported</Text>
                </>
              )}
              <View style={s.badgeRow}>
                {['PDF', 'DOCX'].map((b) => (
                  <View key={b} style={s.badge}>
                    <Text style={s.badgeText}>{b}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={[s.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[s.dividerText, { color: theme.textMuted }]}>or paste text</Text>
            <View style={[s.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <TextInput
            style={[s.textArea, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
            placeholder="Paste your notes here…"
            placeholderTextColor={theme.textMuted}
            value={notesText}
            onChangeText={setNotesText}
            multiline
            textAlignVertical="top"
          />

          {notesText.trim().length > 0 && (
            <Text style={[s.charCount, { color: theme.textMuted }]}>
              {notesText.trim().length} characters ready
            </Text>
          )}

          <TouchableOpacity style={s.generateBtn} onPress={generate} activeOpacity={0.85}>
            <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.generateGrad}>
              <Zap size={18} color="#fff" />
              <Text style={s.generateText}>Generate Study Materials</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Settings toggle */}
          <TouchableOpacity
            style={[s.settingsToggle, { backgroundColor: theme.surface, borderColor: showSettings ? '#6c47ff66' : theme.border }]}
            onPress={() => setShowSettings((v) => !v)}
            activeOpacity={0.8}
          >
            <Settings2 size={16} color={showSettings ? '#6c47ff' : theme.textSecondary} />
            <Text style={[s.settingsToggleText, { color: showSettings ? '#6c47ff' : theme.textSecondary }]}>
              Customize content
            </Text>
            <Text style={[s.settingsToggleHint, { color: theme.textMuted }]}>
              {quizCount}Q · {flashcardCount} cards · {studyQCount} study Qs
            </Text>
          </TouchableOpacity>

          {showSettings && (
            <View style={[s.settingsPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[
                { label: 'Quiz questions', value: quizCount, set: setQuizCount, min: 3, max: 20 },
                { label: 'Flashcards', value: flashcardCount, set: setFlashcardCount, min: 4, max: 25 },
                { label: 'Study questions', value: studyQCount, set: setStudyQCount, min: 3, max: 15 },
              ].map((row) => (
                <View key={row.label} style={s.stepperRow}>
                  <Text style={[s.stepperLabel, { color: theme.textPrimary }]}>{row.label}</Text>
                  <View style={s.stepper}>
                    <TouchableOpacity
                      style={[s.stepBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => row.set((v) => Math.max(row.min, v - 1))}
                      disabled={row.value <= row.min}
                    >
                      <Minus size={14} color={row.value <= row.min ? theme.textMuted : theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[s.stepValue, { color: '#6c47ff' }]}>{row.value}</Text>
                    <TouchableOpacity
                      style={[s.stepBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => row.set((v) => Math.min(row.max, v + 1))}
                      disabled={row.value >= row.max}
                    >
                      <Plus size={14} color={row.value >= row.max ? theme.textMuted : theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── RESULTS ── */}
      {stage === 'results' && content && (
        <View style={{ flex: 1 }}>
          <View style={[s.tabs, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            {([
              { key: 'flashcards' as Tab, label: '🃏', sub: `${content.flashcards.length} cards` },
              { key: 'quiz' as Tab, label: '❓', sub: `${content.quiz.length} Qs` },
              { key: 'study' as Tab, label: '💡', sub: 'Study Qs' },
            ]).map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[s.tab, activeTab === t.key && s.tabActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={s.tabEmoji}>{t.label}</Text>
                <Text style={[s.tabSub, { color: activeTab === t.key ? '#6c47ff' : theme.textMuted }]}>{t.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={s.resultsContent} showsVerticalScrollIndicator={false}>
            {/* FLASHCARDS */}
            {activeTab === 'flashcards' && content.flashcards.length > 0 && (
              <View style={s.flashWrap}>
                <View style={s.progressDots}>
                  {content.flashcards.map((_, i) => (
                    <View
                      key={i}
                      style={[s.progressDot, { backgroundColor: i === cardIndex ? '#6c47ff' : theme.border, width: i === cardIndex ? 20 : 6 }]}
                    />
                  ))}
                </View>

                <Text style={[s.cardCounter, { color: theme.textMuted }]}>
                  {cardIndex + 1} of {content.flashcards.length}
                </Text>

                <Animated.View style={[s.flashCard, { transform: [{ perspective: 1200 }, { rotateY: frontRotateY }], opacity: cardOpacity }]}>
                  <TouchableOpacity onPress={flipCard} activeOpacity={1} style={{ flex: 1 }}>
                    <LinearGradient
                      colors={showBack
                        ? ['#052e16', '#064e3b', '#065f46']
                        : ['#13005a', '#1e1b4b', '#1e3a8a']}
                      style={s.flashCardGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {/* Gloss overlay */}
                      <LinearGradient
                        colors={['rgba(255,255,255,0.08)', 'transparent']}
                        style={s.flashGloss}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        pointerEvents="none"
                      />
                      {/* Top accent line */}
                      <LinearGradient
                        colors={showBack ? ['#10b981', '#059669'] : ['#6c47ff', '#2563eb']}
                        style={s.flashAccentLine}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        pointerEvents="none"
                      />

                      <View style={s.flashCardInner}>
                        <View style={[s.flashSideTag, { backgroundColor: showBack ? '#10b98133' : '#6c47ff33', borderColor: showBack ? '#10b981' : '#6c47ff' }]}>
                          <Text style={[s.flashSideTagText, { color: showBack ? '#6ee7b7' : '#c4b5fd' }]}>
                            {showBack ? '● ANSWER' : '◆ TERM'}
                          </Text>
                        </View>

                        <Text style={s.flashCardText}>
                          {showBack ? content.flashcards[cardIndex].back : content.flashcards[cardIndex].front}
                        </Text>

                        <LinearGradient
                          colors={['transparent', showBack ? '#10b98166' : '#6c47ff66', 'transparent']}
                          style={s.flashDivider}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          pointerEvents="none"
                        />

                        <View style={s.flashTapHint}>
                          <RotateCcw size={13} color="rgba(255,255,255,0.35)" />
                          <Text style={s.flashHint}>tap to {showBack ? 'see term' : 'reveal answer'}</Text>
                        </View>
                      </View>

                      <View style={s.flashCornerNum}>
                        <Text style={s.flashCornerNumText}>{cardIndex + 1}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <View style={s.flashNav}>
                  <TouchableOpacity
                    style={[s.flashNavBtn, { borderColor: theme.border, opacity: cardIndex === 0 ? 0.3 : 1 }]}
                    onPress={() => resetCard(Math.max(0, cardIndex - 1))}
                    disabled={cardIndex === 0}
                  >
                    <ChevronLeft size={22} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.flashNavBtn, { borderColor: theme.border }]} onPress={() => resetCard(0)}>
                    <RotateCcw size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.flashNavBtn, { borderColor: theme.border, opacity: cardIndex === content.flashcards.length - 1 ? 0.3 : 1 }]}
                    onPress={() => resetCard(Math.min(content.flashcards.length - 1, cardIndex + 1))}
                    disabled={cardIndex === content.flashcards.length - 1}
                  >
                    <ChevronRight size={22} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* QUIZ */}
            {activeTab === 'quiz' && content.quiz.length > 0 && (
              <QuizPanel
                questions={content.quiz}
                quizIndex={quizIndex}
                selected={selected}
                revealed={revealed}
                quizAnswers={quizAnswers}
                quizScore={quizScore}
                onSelect={setSelected}
                onReveal={() => {
                  setRevealed(true);
                  if (selected !== null) {
                    setQuizAnswers((prev) => { const a = [...prev]; a[quizIndex] = selected; return a; });
                  }
                }}
                onNext={() => { setQuizIndex((i) => i + 1); setSelected(null); setRevealed(false); }}
                onReset={() => { setQuizIndex(0); setSelected(null); setRevealed(false); setQuizAnswers([]); }}
                theme={theme}
              />
            )}

            {/* STUDY QUESTIONS */}
            {activeTab === 'study' && (
              <View>
                <LinearGradient colors={['#1e1b4b', theme.background]} style={s.studyHeader}>
                  <Text style={s.studyHeaderTitle}>Deep Dive Questions</Text>
                  <Text style={s.studyHeaderSub}>Think through these to master the material</Text>
                </LinearGradient>
                {content.studyQuestions.map((q, i) => (
                  <View key={i} style={[s.studyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.studyNum}>
                      <Text style={s.studyNumText}>{i + 1}</Text>
                    </LinearGradient>
                    <Text style={[s.studyQ, { color: theme.textPrimary }]}>{q}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Save / already saved row */}
            <View style={s.bottomActions}>
              {currentSessionId ? (
                <View style={[s.savedBadge, { backgroundColor: '#10b98118', borderColor: '#10b98144' }]}>
                  <CheckCircle size={14} color="#10b981" />
                  <Text style={s.savedBadgeText}>Saved</Text>
                </View>
              ) : (
                <TouchableOpacity style={[s.saveBtn, { borderColor: '#6c47ff66' }]} onPress={saveSession} activeOpacity={0.8}>
                  <Save size={15} color="#6c47ff" />
                  <Text style={[s.saveBtnText, { color: '#6c47ff' }]}>Save session</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.newBtn, { borderColor: theme.border, flex: 1 }]}
                onPress={() => { setStage('input'); setContent(null); setNotesText(''); setFileName(''); setCurrentSessionId(null); }}
              >
                <Text style={[s.newBtnText, { color: theme.textSecondary }]}>← New notes</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Quiz Panel ────────────────────────────────────────────────────────────────
function QuizPanel({ questions, quizIndex, selected, revealed, quizAnswers, quizScore, onSelect, onReveal, onNext, onReset, theme }: {
  questions: QuizQuestion[]; quizIndex: number; selected: number | null; revealed: boolean;
  quizAnswers: number[]; quizScore: number;
  onSelect: (i: number) => void; onReveal: () => void; onNext: () => void; onReset: () => void; theme: any;
}) {
  const answerAnim = useRef(new Animated.Value(0)).current;
  const done = quizIndex >= questions.length;

  useEffect(() => {
    if (revealed) {
      Animated.spring(answerAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    } else {
      answerAnim.setValue(0);
    }
  }, [revealed, quizIndex]);

  if (done) {
    const pct = Math.round((quizScore / questions.length) * 100);
    const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '👍' : '📚';
    const msg = pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Great work!' : pct >= 40 ? 'Keep going!' : 'Keep studying!';
    return (
      <View style={qS.scoreWrap}>
        <LinearGradient colors={['#1e1b4b', '#0f2d1e']} style={qS.scoreCard}>
          <Text style={qS.scoreEmoji}>{emoji}</Text>
          <Text style={qS.scoreTitle}>{msg}</Text>
          <Text style={qS.scoreText}>{quizScore} / {questions.length} correct</Text>
          <View style={[qS.scoreBar, { backgroundColor: '#ffffff22' }]}>
            <LinearGradient
              colors={pct >= 70 ? ['#10b981', '#059669'] : pct >= 40 ? ['#f59e0b', '#d97706'] : ['#ef4444', '#dc2626']}
              style={[qS.scoreBarFill, { width: `${pct}%` as any }]}
            />
          </View>
          <Text style={qS.scorePct}>{pct}%</Text>
        </LinearGradient>
        <TouchableOpacity style={[qS.retryBtn, { borderColor: '#6c47ff' }]} onPress={onReset}>
          <RotateCcw size={16} color="#6c47ff" />
          <Text style={qS.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = questions[quizIndex];
  const progress = (quizIndex + 1) / questions.length;

  return (
    <View>
      <View style={[qS.progressTrack, { backgroundColor: theme.border }]}>
        <LinearGradient
          colors={['#6c47ff', '#2563eb']}
          style={[qS.progressFill, { width: `${progress * 100}%` as any }]}
        />
      </View>
      <Text style={[qS.qCounter, { color: theme.textMuted }]}>
        Question {quizIndex + 1} of {questions.length}
      </Text>

      <View style={[qS.questionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[qS.question, { color: theme.textPrimary }]}>{q.question}</Text>
      </View>

      {q.options.map((opt, i) => {
        const isCorrect = i === q.correctIndex;
        const isSelected = i === selected;
        let bg = theme.surface;
        let border = theme.border;
        let textColor = theme.textPrimary;
        let rightIcon = null as any;

        if (revealed) {
          if (isCorrect) { bg = '#064e3b'; border = '#10b981'; textColor = '#a7f3d0'; rightIcon = <CheckCircle size={18} color="#10b981" />; }
          else if (isSelected) { bg = '#450a0a'; border = '#ef4444'; textColor = '#fca5a5'; rightIcon = <XCircle size={18} color="#ef4444" />; }
        } else if (isSelected) {
          bg = '#1e1b4b'; border = '#6c47ff'; textColor = '#c4b5fd';
        }

        return (
          <TouchableOpacity
            key={i}
            style={[qS.option, { backgroundColor: bg, borderColor: border }]}
            onPress={() => !revealed && onSelect(i)}
            activeOpacity={revealed ? 1 : 0.75}
          >
            <View style={[qS.optLetter, { backgroundColor: border + '33' }]}>
              <Text style={[qS.optLetterText, { color: border }]}>{String.fromCharCode(65 + i)}</Text>
            </View>
            <Text style={[qS.optText, { color: textColor, flex: 1 }]}>{opt}</Text>
            {rightIcon}
          </TouchableOpacity>
        );
      })}

      {revealed && (
        <Animated.View style={[
          qS.explanation,
          { backgroundColor: theme.surface, borderColor: theme.border },
          { opacity: answerAnim, transform: [{ translateY: answerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
        ]}>
          <Text style={qS.explanationLabel}>Explanation</Text>
          <Text style={[qS.explanationText, { color: theme.textSecondary }]}>{q.explanation}</Text>
        </Animated.View>
      )}

      <TouchableOpacity
        style={[qS.actionBtn, (!revealed && selected === null) && { opacity: 0.4 }]}
        onPress={revealed ? onNext : onReveal}
        disabled={!revealed && selected === null}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#6c47ff', '#2563eb']} style={qS.actionGrad}>
          <Text style={qS.actionText}>
            {revealed ? (quizIndex + 1 === questions.length ? 'See Results →' : 'Next Question →') : 'Check Answer'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const qS = StyleSheet.create({
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  qCounter: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  question: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  optLetter: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: 13, fontWeight: '800' },
  optText: { fontSize: 14, lineHeight: 20 },
  explanation: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  explanationLabel: { color: '#6c47ff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  explanationText: { fontSize: 14, lineHeight: 20 },
  actionBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  actionGrad: { paddingVertical: 16, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scoreWrap: { alignItems: 'center', paddingTop: 8 },
  scoreCard: { width: '100%', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 20 },
  scoreEmoji: { fontSize: 64, marginBottom: 16 },
  scoreTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  scoreText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 20 },
  scoreBar: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scorePct: { color: '#fff', fontSize: 28, fontWeight: '800' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#6c47ff', fontWeight: '700', fontSize: 14 },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  inputContent: { padding: 20, paddingTop: 8 },
  uploadZone: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#6c47ff66' },
  uploadGrad: { padding: 28, alignItems: 'center' },
  uploadIconWrap: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#6c47ff22', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  uploadTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  uploadHint: { fontSize: 13, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#6c47ff22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#6c47ff44' },
  badgeText: { color: '#a78bfa', fontSize: 11, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  textArea: { borderRadius: 16, borderWidth: 1, padding: 16, fontSize: 14, minHeight: 180, lineHeight: 22 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 6, marginBottom: 4 },
  generateBtn: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  generateGrad: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Settings / stepper
  settingsToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 16 },
  settingsToggleText: { fontSize: 14, fontWeight: '600', flex: 1 },
  settingsToggleHint: { fontSize: 12 },
  settingsPanel: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8, gap: 14 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { fontSize: 14, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6c47ff' },
  tabEmoji: { fontSize: 18, marginBottom: 2 },
  tabSub: { fontSize: 11, fontWeight: '700' },
  resultsContent: { padding: 20, paddingTop: 16 },
  flashWrap: { alignItems: 'center' },
  progressDots: { flexDirection: 'row', gap: 5, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  progressDot: { width: 6, height: 6, borderRadius: 3 },
  cardCounter: { fontSize: 12, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  flashCard: {
    width: width - 40, borderRadius: 28, overflow: 'hidden', marginBottom: 24, minHeight: 260,
    shadowColor: '#6c47ff', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  flashCardGrad: { flex: 1, minHeight: 260, position: 'relative' },
  flashGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, borderRadius: 28 },
  flashAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  flashCardInner: { flex: 1, minHeight: 260, padding: 28, alignItems: 'center', justifyContent: 'center' },
  flashSideTag: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 22 },
  flashSideTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  flashCardText: { color: '#fff', fontSize: 19, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  flashDivider: { height: 1, width: '60%', marginVertical: 20 },
  flashTapHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flashHint: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  flashCornerNum: { position: 'absolute', bottom: 14, right: 18 },
  flashCornerNumText: { color: 'rgba(255,255,255,0.2)', fontSize: 32, fontWeight: '900' },
  flashNav: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  flashNavBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  studyHeader: { borderRadius: 16, padding: 20, marginBottom: 16 },
  studyHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  studyHeaderSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  studyCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  studyNum: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  studyNumText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  studyQ: { fontSize: 15, flex: 1, lineHeight: 22 },
  // Saved sessions
  savedSection: { marginBottom: 4 },
  savedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  savedTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 8,
  },
  sessionCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sessionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  sessionName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sessionMeta: { fontSize: 12, lineHeight: 16, marginBottom: 6 },
  sessionBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sessionBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  sessionBadgeText: { fontSize: 11, fontWeight: '700' },
  sessionDateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sessionDelete: { padding: 6 },
  savedDivider: { height: 1, marginTop: 4, marginBottom: 20 },

  // Bottom actions in results
  bottomActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  savedBadgeText: { color: '#10b981', fontSize: 14, fontWeight: '700' },
  newBtn: { paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { fontSize: 14, fontWeight: '600' },
});

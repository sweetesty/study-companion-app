import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Brain, ChevronRight, RotateCcw } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { generateQuiz } from '../services/aiService';
import { QuizQuestion } from '../constants/types';

type Stage = 'config' | 'loading' | 'quiz' | 'results';
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const COUNTS = [5, 10, 15];

export default function QuizScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { apiKey, saveQuizResult, quizResults } = useAppStore();
  const { showToast } = useToast();

  const [stage, setStage] = useState<Stage>('config');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  const s = styles(theme);

  const startQuiz = async () => {
    if (!topic.trim()) { showToast('Enter a topic first!', 'error'); return; }
    if (!apiKey) { showToast('Add your Groq API key in Profile', 'error'); return; }
    setStage('loading');
    try {
      const qs = await generateQuiz(apiKey, topic.trim(), difficulty, count);
      setQuestions(qs);
      setCurrent(0); setAnswers([]); setSelected(null); setRevealed(false);
      setStage('quiz');
    } catch (err: any) {
      showToast(err.message ?? 'Failed to generate quiz', 'error');
      setStage('config');
    }
  };

  const handleAnswer = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);

    if (current + 1 >= questions.length) {
      const score = newAnswers.filter((a, i) => a === questions[i].correctIndex).length;
      saveQuizResult({ topic, difficulty, score, total: questions.length, date: new Date().toISOString().slice(0, 10), questions });
      setStage('results');
    } else {
      setCurrent(current + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  if (stage === 'loading') {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={theme.purple} />
        <Text style={s.loadingText}>Generating your quiz...</Text>
        <Text style={s.loadingSub}>Crafting {count} questions on {topic}</Text>
      </View>
    );
  }

  if (stage === 'quiz') {
    const q = questions[current];
    const progress = (current + 1) / questions.length;

    return (
      <View style={s.root}>
        <LinearGradient colors={['#1a0d2d', theme.background]} style={s.header}>
          <TouchableOpacity onPress={() => setStage('config')} style={s.backBtn}>
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={s.quizMeta}>
            <Text style={s.quizCounter}>{current + 1} / {questions.length}</Text>
            <View style={s.diffBadge}><Text style={s.diffText}>{difficulty}</Text></View>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressBar, { width: `${progress * 100}%` }]} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={s.quizContent}>
          <Text style={s.question}>{q.question}</Text>
          <View style={s.optionsList}>
            {q.options.map((opt, i) => {
              let borderColor = theme.border;
              let bg = theme.surface;
              if (revealed) {
                if (i === q.correctIndex) { borderColor = theme.green; bg = theme.green + '22'; }
                else if (i === selected) { borderColor = theme.red; bg = theme.red + '22'; }
              } else if (selected === i) {
                borderColor = theme.purple;
                bg = theme.purple + '22';
              }
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.option, { backgroundColor: bg, borderColor }]}
                  onPress={() => handleAnswer(i)}
                  activeOpacity={0.8}
                  disabled={revealed}
                >
                  <View style={[s.optionLetter, { borderColor }]}>
                    <Text style={[s.optionLetterText, { color: borderColor }]}>
                      {['A', 'B', 'C', 'D'][i]}
                    </Text>
                  </View>
                  <Text style={[s.optionText, { color: theme.textPrimary }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {revealed && (
            <View style={[s.explanationCard, { backgroundColor: theme.surface, borderColor: selected === q.correctIndex ? theme.green + '44' : theme.red + '44' }]}>
              <Text style={s.explanationLabel}>
                {selected === q.correctIndex ? '✅ Correct!' : '❌ Incorrect'}
              </Text>
              <Text style={s.explanationText}>{q.explanation}</Text>
            </View>
          )}

          {revealed && (
            <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <LinearGradient colors={theme.gradient} style={s.nextGrad}>
                <Text style={s.nextText}>{current + 1 >= questions.length ? 'See Results' : 'Next Question'} →</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  if (stage === 'results') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={s.root}>
        <LinearGradient colors={['#1a0d2d', theme.background]} style={s.header}>
          <Text style={s.headerTitle}>Quiz Complete!</Text>
          <Text style={s.headerSub}>{topic} · {difficulty}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={s.quizContent}>
          <View style={s.scoreCard}>
            <Text style={s.scoreEmoji}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</Text>
            <Text style={s.scoreValue}>{pct}%</Text>
            <Text style={s.scoreSub}>{score} / {questions.length} correct</Text>
            <Text style={s.scoreMsg}>{pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!'}</Text>
          </View>

          {/* Answer review */}
          <Text style={s.reviewLabel}>Answer Review</Text>
          {questions.map((q, i) => (
            <View key={q.id} style={[s.reviewCard, { backgroundColor: theme.surface, borderColor: answers[i] === q.correctIndex ? theme.green + '44' : theme.red + '44' }]}>
              <Text style={s.reviewQ} numberOfLines={2}>{q.question}</Text>
              <Text style={[s.reviewAnswer, { color: answers[i] === q.correctIndex ? theme.green : theme.red }]}>
                {answers[i] === q.correctIndex ? '✓' : '✗'} {q.options[answers[i]]}
              </Text>
              {answers[i] !== q.correctIndex && (
                <Text style={[s.reviewCorrect, { color: theme.textSecondary }]}>Correct: {q.options[q.correctIndex]}</Text>
              )}
            </View>
          ))}

          <TouchableOpacity style={[s.nextBtn, { marginTop: 16 }]} onPress={() => { setStage('config'); setTopic(''); }} activeOpacity={0.85}>
            <LinearGradient colors={theme.gradient} style={s.nextGrad}>
              <RotateCcw size={16} color="#fff" />
              <Text style={s.nextText}>  New Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // Config stage
  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0d2d', theme.background]} style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>AI Quiz Generator</Text>
        <Text style={s.headerSub}>Test your knowledge on any topic</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.configContent}>
        <View style={[s.configCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={s.configIcon}>
            <Brain size={28} color={theme.purple} />
          </View>

          <Text style={s.label}>Topic</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. World War II, Photosynthesis, Python..."
            placeholderTextColor={theme.textMuted}
            value={topic}
            onChangeText={setTopic}
          />

          <Text style={s.label}>Difficulty</Text>
          <View style={s.optionRow}>
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[s.pill, difficulty === d && { backgroundColor: theme.purple + '33', borderColor: theme.purple }]}
                onPress={() => setDifficulty(d)}
              >
                <Text style={[s.pillText, { color: difficulty === d ? theme.purple : theme.textSecondary }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Questions</Text>
          <View style={s.optionRow}>
            {COUNTS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.pill, count === c && { backgroundColor: theme.blue + '33', borderColor: theme.blue }]}
                onPress={() => setCount(c)}
              >
                <Text style={[s.pillText, { color: count === c ? theme.blue : theme.textSecondary }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.genBtn} onPress={startQuiz} activeOpacity={0.85}>
            <LinearGradient colors={theme.gradient} style={s.genGrad}>
              <Brain size={18} color="#fff" />
              <Text style={s.genText}>  Generate Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* History */}
        {quizResults.length > 0 && (
          <>
            <Text style={s.historyLabel}>Recent Scores</Text>
            {quizResults.slice(0, 5).map((r) => (
              <View key={r.id} style={[s.historyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View>
                  <Text style={s.histTopic}>{r.topic}</Text>
                  <Text style={s.histMeta}>{r.difficulty} · {r.date}</Text>
                </View>
                <View style={[s.scorePill, { backgroundColor: r.score / r.total >= 0.8 ? theme.green + '22' : theme.yellow + '22' }]}>
                  <Text style={[s.scoreNum, { color: r.score / r.total >= 0.8 ? theme.green : theme.yellow }]}>
                    {r.score}/{r.total}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
    backBtn: { marginBottom: 8 },
    headerTitle: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    loadingText: { color: theme.textPrimary, fontSize: 18, fontWeight: '600', marginTop: 20 },
    loadingSub: { color: theme.textSecondary, fontSize: 14, marginTop: 6 },
    configContent: { padding: 20 },
    configCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
    configIcon: { alignItems: 'center', marginBottom: 16 },
    label: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: theme.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.textPrimary, fontSize: 15, borderWidth: 1, borderColor: theme.inputBorder },
    optionRow: { flexDirection: 'row', gap: 8 },
    pill: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
    pillText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
    genBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
    genGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    genText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    historyLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
    histTopic: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
    histMeta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
    scorePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    scoreNum: { fontSize: 14, fontWeight: '700' },
    // Quiz stage
    quizMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    quizCounter: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    diffBadge: { backgroundColor: theme.purple + '33', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    diffText: { color: theme.purple, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
    progressTrack: { height: 4, backgroundColor: theme.border, borderRadius: 2 },
    progressBar: { height: 4, backgroundColor: theme.purple, borderRadius: 2 },
    quizContent: { padding: 20 },
    question: { color: theme.textPrimary, fontSize: 18, fontWeight: '600', lineHeight: 26, marginBottom: 20 },
    optionsList: { gap: 10 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5 },
    optionLetter: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    optionLetterText: { fontSize: 14, fontWeight: '700' },
    optionText: { flex: 1, fontSize: 15, lineHeight: 22 },
    explanationCard: { borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1 },
    explanationLabel: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6 },
    explanationText: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    nextBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
    nextGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    // Results stage
    scoreCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 24 },
    scoreEmoji: { fontSize: 56, marginBottom: 8 },
    scoreValue: { color: theme.textPrimary, fontSize: 52, fontWeight: '700' },
    scoreSub: { color: theme.textSecondary, fontSize: 16, marginTop: 4 },
    scoreMsg: { color: theme.purple, fontSize: 16, fontWeight: '600', marginTop: 8 },
    reviewLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    reviewCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
    reviewQ: { color: theme.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 6 },
    reviewAnswer: { fontSize: 13, fontWeight: '600' },
    reviewCorrect: { fontSize: 12, marginTop: 2 },
  });

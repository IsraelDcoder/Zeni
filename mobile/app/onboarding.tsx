import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

const PAIN_POINTS = [
  "Impulse shopping",
  "Nights out",
  "Online orders",
  "Food & restaurants",
  "Subscriptions",
  "Transport costs",
  "Clothing & fashion",
  "Tech gadgets",
];

const GOALS = [
  "Build emergency fund",
  "Buy a laptop / gadget",
  "Travel abroad",
  "Start investing",
  "Save for rent",
  "Clear my debts",
  "Build a business",
  "Help my family",
];

const PERSONALITIES: { label: string; desc: string; icon: string }[] = [
  { label: "The Spender", desc: "Money flows fast — you live in the moment", icon: "zap" },
  { label: "The Saver", desc: "You're careful but could do more with your money", icon: "shield" },
  { label: "The Builder", desc: "Ambitious and focused on growing wealth", icon: "trending-up" },
  { label: "The Learner", desc: "New to finances, eager to master money", icon: "book-open" },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { setProfile } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedPains, setSelectedPains] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [personality, setPersonality] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goNext = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep((s) => s + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const togglePain = (item: string) => {
    setSelectedPains((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  const toggleGoal = (item: string) => {
    setSelectedGoals((prev) =>
      prev.includes(item) ? prev.filter((g) => g !== item) : [...prev, item]
    );
  };

  const finish = async () => {
    await setProfile({
      name: name.trim() || "Friend",
      currency: "NGN",
      monthlyIncome: parseInt(income.replace(/\D/g, ""), 10) || 250000,
      financialPersonality: personality ?? "The Learner",
      onboardingComplete: true,
      savingsStreak: 0,
    });
    await AsyncStorage.setItem("onboardingComplete", "true");
    router.replace("/auth");
  };

  const canContinue = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return selectedPains.length > 0;
    if (step === 3) return selectedGoals.length > 0;
    if (step === 4) return !!personality;
    return true;
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["#070D1A", "#0B1525", "#070D1A"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {step < 5 && (
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i <= step ? "#00D9C0" : "rgba(255,255,255,0.15)" },
                i <= step && { width: 24 },
              ]}
            />
          ))}
        </View>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === 0 && <StepWelcome onNext={goNext} />}
        {step === 1 && <StepName name={name} onChange={setName} />}
        {step === 2 && (
          <StepChips
            title={`What usually drains your money, ${name || "friend"}?`}
            subtitle="Select all that apply"
            items={PAIN_POINTS}
            selected={selectedPains}
            onToggle={togglePain}
          />
        )}
        {step === 3 && (
          <StepChips
            title="What are your financial goals?"
            subtitle="Pick what drives you"
            items={GOALS}
            selected={selectedGoals}
            onToggle={toggleGoal}
          />
        )}
        {step === 4 && (
          <StepPersonality
            selected={personality}
            onSelect={setPersonality}
          />
        )}
        {step === 5 && (
          <StepIncome
            income={income}
            onChange={setIncome}
            name={name}
          />
        )}
        {step === 6 && <StepSuccess name={name} />}
      </Animated.View>

      <View style={[styles.btnRow, { paddingBottom: botPad }]}>
        {step > 0 && step < 6 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
                setStep((s) => s - 1);
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
              });
            }}
          >
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}
        {step < 5 && (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              !canContinue() && styles.nextBtnDisabled,
              step === 0 && styles.nextBtnFull,
            ]}
            onPress={goNext}
            disabled={!canContinue()}
          >
            <LinearGradient
              colors={["#00D9C0", "#00A896"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <Text style={styles.nextBtnText}>
                {step === 0 ? "Begin Your Journey" : "Continue"}
              </Text>
              <Feather name="arrow-right" size={16} color="#070D1A" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        {step === 5 && (
          <TouchableOpacity style={[styles.nextBtn, styles.nextBtnFull]} onPress={() => goNext()}>
            <LinearGradient
              colors={["#00D9C0", "#00A896"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <Text style={styles.nextBtnText}>Generate My Profile</Text>
              <Feather name="zap" size={16} color="#070D1A" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        {step === 6 && (
          <TouchableOpacity style={[styles.nextBtn, styles.nextBtnFull]} onPress={finish}>
            <LinearGradient
              colors={["#00D9C0", "#7B5CF7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <Text style={styles.nextBtnText}>Enter Zeni</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={step_styles.center}>
      <View style={step_styles.logoBox}>
        <LinearGradient
          colors={["#00D9C0", "#7B5CF7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={step_styles.logoGrad}
        >
          <Text style={step_styles.logoLetter}>Z</Text>
        </LinearGradient>
      </View>
      <Text style={step_styles.heroTitle}>Welcome to{"\n"}Zeni</Text>
      <Text style={step_styles.heroSub}>
        Your AI financial companion designed for the ambitious African generation. We help you stop leaking money and start building wealth — without the shame.
      </Text>
    </View>
  );
}

function StepName({ name, onChange }: { name: string; onChange: (s: string) => void }) {
  return (
    <View style={step_styles.slide}>
      <Text style={step_styles.title}>First, what should{"\n"}I call you?</Text>
      <Text style={step_styles.sub}>This is just between us.</Text>
      <TextInput
        value={name}
        onChangeText={onChange}
        placeholder="Your name"
        placeholderTextColor="rgba(255,255,255,0.3)"
        style={step_styles.input}
        autoFocus
        returnKeyType="done"
      />
    </View>
  );
}

function StepChips({
  title,
  subtitle,
  items,
  selected,
  onToggle,
}: {
  title: string;
  subtitle: string;
  items: string[];
  selected: string[];
  onToggle: (s: string) => void;
}) {
  return (
    <View style={step_styles.slide}>
      <Text style={step_styles.title}>{title}</Text>
      <Text style={step_styles.sub}>{subtitle}</Text>
      <View style={step_styles.chips}>
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => onToggle(item)}
              style={[step_styles.chip, active && step_styles.chipActive]}
            >
              <Text style={[step_styles.chipText, active && step_styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepPersonality({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (s: string) => void;
}) {
  return (
    <View style={step_styles.slide}>
      <Text style={step_styles.title}>Which best describes{"\n"}your money personality?</Text>
      <Text style={step_styles.sub}>Be honest — no judgment here.</Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        {PERSONALITIES.map((p) => {
          const active = selected === p.label;
          return (
            <Pressable
              key={p.label}
              onPress={() => onSelect(p.label)}
              style={[
                step_styles.personalityCard,
                active && step_styles.personalityCardActive,
              ]}
            >
              <View style={[step_styles.persIcon, active && { backgroundColor: "#00D9C022" }]}>
                <Feather name={p.icon as any} size={20} color={active ? "#00D9C0" : "rgba(255,255,255,0.5)"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[step_styles.persLabel, active && { color: "#00D9C0" }]}>
                  {p.label}
                </Text>
                <Text style={step_styles.persDesc}>{p.desc}</Text>
              </View>
              {active && <Feather name="check-circle" size={18} color="#00D9C0" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepIncome({ income, onChange, name }: { income: string; onChange: (s: string) => void; name: string }) {
  return (
    <View style={step_styles.slide}>
      <Text style={step_styles.title}>
        {name ? `Almost there, ${name}!` : "Almost there!"}
      </Text>
      <Text style={step_styles.sub}>
        What's your approximate monthly income? This helps me give accurate insights.
      </Text>
      <View style={step_styles.inputWrap}>
        <Text style={step_styles.currency}>₦</Text>
        <TextInput
          value={income}
          onChangeText={onChange}
          placeholder="e.g. 250,000"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="numeric"
          style={step_styles.incomeInput}
          autoFocus
        />
      </View>
      <Text style={step_styles.privacyNote}>
        Your data stays on your device. We never share it.
      </Text>
    </View>
  );
}

function StepSuccess({ name }: { name: string }) {
  return (
    <View style={step_styles.center}>
      <View style={step_styles.successOrb}>
        <LinearGradient
          colors={["#00D9C0", "#7B5CF7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={step_styles.successGrad}
        />
        <Feather name="check" size={40} color="#FFFFFF" />
      </View>
      <Text style={step_styles.heroTitle}>
        {name ? `${name}, you're ready.` : "You're ready."}
      </Text>
      <Text style={step_styles.heroSub}>
        Your financial identity has been created. Zara — your AI coach — is already analyzing your patterns and preparing personalized insights.
      </Text>
      <View style={step_styles.badges}>
        {["AI Coach Ready", "Goals Tracked", "Score Active"].map((b) => (
          <View key={b} style={step_styles.badge}>
            <Feather name="check" size={11} color="#00D9C0" />
            <Text style={step_styles.badgeText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070D1A" },
  orb1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    backgroundColor: "#00D9C010", top: -60, right: -80,
  },
  orb2: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "#7B5CF710", bottom: 120, left: -60,
  },
  progressRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 24, marginBottom: 8,
  },
  dot: { height: 4, width: 8, borderRadius: 4 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  btnRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, gap: 12, paddingTop: 16,
  },
  backBtn: {
    width: 48, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  nextBtn: {
    flex: 1, height: 52, borderRadius: 16, overflow: "hidden",
  },
  nextBtnFull: { flex: 1 },
  nextBtnDisabled: { opacity: 0.4 },
  btnGrad: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#070D1A" },
});

const step_styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingBottom: 20 },
  slide: { flex: 1, paddingTop: 24, gap: 8 },
  logoBox: { width: 72, height: 72, borderRadius: 20, overflow: "hidden" },
  logoGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 36, fontWeight: "800", color: "#FFFFFF" },
  heroTitle: {
    fontSize: 34, fontWeight: "800", color: "#FFFFFF",
    textAlign: "center", lineHeight: 42,
  },
  heroSub: {
    fontSize: 15, color: "rgba(255,255,255,0.5)",
    textAlign: "center", lineHeight: 23, paddingHorizontal: 8,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#FFFFFF", lineHeight: 34 },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 18, color: "#FFFFFF", fontWeight: "500",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: { backgroundColor: "#00D9C022", borderColor: "#00D9C0" },
  chipText: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: "500" },
  chipTextActive: { color: "#00D9C0" },
  personalityCard: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 14,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  personalityCardActive: {
    backgroundColor: "rgba(0,217,192,0.07)", borderColor: "#00D9C060",
  },
  persIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  persLabel: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  persDesc: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14, paddingHorizontal: 18, backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 8,
  },
  currency: { fontSize: 22, color: "#00D9C0", fontWeight: "700", marginRight: 6 },
  incomeInput: { flex: 1, fontSize: 20, color: "#FFFFFF", fontWeight: "500", paddingVertical: 14 },
  privacyNote: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8, textAlign: "center" },
  successOrb: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  successGrad: { ...StyleSheet.absoluteFillObject },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#00D9C015", borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#00D9C030",
  },
  badgeText: { fontSize: 12, color: "#00D9C0", fontWeight: "600" },
});

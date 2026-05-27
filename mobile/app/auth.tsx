import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useAuth } from "@/context/AuthContext";

type Mode = "signin" | "signup" | "reset";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) { setError("Email is required"); return; }
    if (mode === "reset") {
      setLoading(true);
      const { error: e } = await resetPassword(email.trim());
      setLoading(false);
      if (e) setError(e);
      else setResetSent(true);
      return;
    }
    if (!password.trim()) { setError("Password is required"); return; }
    if (mode === "signup") {
      if (!name.trim()) { setError("Name is required"); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
      if (password !== confirm) { setError("Passwords do not match"); return; }
    }
    setLoading(true);
    let result: { error: string | null };
    if (mode === "signin") {
      result = await signIn(email.trim(), password);
      if (!result.error) {
        router.replace("/bank-connect");
        return;
      }
    } else {
      result = await signUp(email.trim(), password, name.trim());
      if (!result.error) {
        router.replace("/bank-connect");
        return;
      }
    }
    setLoading(false);
    setError(result.error);
  };

  const skipAuth = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#070D1A", "#0A1528", "#070D1A"]} style={StyleSheet.absoluteFill} />
      <View style={styles.tealOrb} />
      <View style={styles.violetOrb} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <LinearGradient colors={["#00D9C0", "#7B5CF7"]} style={styles.logoGrad}>
                <Text style={styles.logoLetter}>Z</Text>
              </LinearGradient>
            </View>
            <Text style={styles.appName}>ZENI</Text>
          </View>

          {/* Title */}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signin"
                ? "Sign in to your AI financial OS"
                : mode === "signup"
                ? "Join 50,000+ Gen Z building wealth"
                : "We'll send a reset link to your email"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === "signup" && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={styles.inputRow}>
                  <Feather name="user" size={16} color="rgba(255,255,255,0.35)" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Temi Adeyemi"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={styles.input}
                    autoCapitalize="words"
                    textContentType="name"
                  />
                </View>
              </View>
            )}

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputRow}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.35)" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                  autoCorrect={false}
                />
              </View>
            </View>

            {mode !== "reset" && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Feather name="lock" size={16} color="rgba(255,255,255,0.35)" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={styles.input}
                    secureTextEntry={!showPw}
                    textContentType={mode === "signup" ? "newPassword" : "password"}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)}>
                    <Feather name={showPw ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.35)" />
                  </Pressable>
                </View>
              </View>
            )}

            {mode === "signup" && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <Feather name="lock" size={16} color="rgba(255,255,255,0.35)" />
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Repeat your password"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={styles.input}
                    secureTextEntry={!showPw}
                    textContentType="newPassword"
                  />
                </View>
              </View>
            )}

            {mode === "signin" && (
              <Pressable onPress={() => { setMode("reset"); setError(null); }} style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#FF4757" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {resetSent && (
              <View style={styles.successBox}>
                <Feather name="check-circle" size={14} color="#00D9C0" />
                <Text style={styles.successText}>Reset link sent! Check your inbox.</Text>
              </View>
            )}

            {!isConfigured && (
              <View style={styles.warningBox}>
                <Feather name="info" size={14} color="#F5A623" />
                <Text style={styles.warningText}>
                  Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable authentication.
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading || !isConfigured}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#00D9C0", "#00A896"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGrad}
              >
                {loading ? (
                  <ActivityIndicator color="#070D1A" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Skip / Demo mode */}
            <TouchableOpacity style={styles.skipBtn} onPress={skipAuth}>
              <Text style={styles.skipText}>Continue without account</Text>
              <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          </View>

          {/* Toggle Mode */}
          {mode !== "reset" ? (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {mode === "signin" ? "New to Zeni?" : "Already have an account?"}
              </Text>
              <Pressable onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}>
                <Text style={styles.toggleAction}>
                  {mode === "signin" ? "Create account" : "Sign in"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setMode("signin"); setError(null); setResetSent(false); }} style={styles.toggleRow}>
              <Feather name="arrow-left" size={14} color="#00D9C0" />
              <Text style={styles.toggleAction}>Back to sign in</Text>
            </Pressable>
          )}

          {/* Feature badges */}
          {mode === "signup" && (
            <View style={styles.featureBadges}>
              {["AI-powered insights", "Bank-grade security", "Nigeria-first"].map((f) => (
                <View key={f} style={styles.featureBadge}>
                  <Feather name="check" size={10} color="#00D9C0" />
                  <Text style={styles.featureBadgeText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070D1A" },
  tealOrb: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "#00D9C00A", top: -100, right: -100,
  },
  violetOrb: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "#7B5CF70A", bottom: 100, left: -80,
  },
  scroll: { paddingHorizontal: 28, alignItems: "stretch" },
  logoRow: { alignItems: "center", gap: 10, marginBottom: 32 },
  logoBox: { width: 56, height: 56, borderRadius: 16, overflow: "hidden" },
  logoGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 26, fontWeight: "800", color: "#fff" },
  appName: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: 6 },
  titleWrap: { alignItems: "center", marginBottom: 32, gap: 8 },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 20 },
  form: { gap: 16 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 16, color: "#fff" },
  forgotWrap: { alignItems: "flex-end" },
  forgotText: { fontSize: 13, color: "#00D9C0", fontWeight: "600" },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(255,71,87,0.1)", borderWidth: 1,
    borderColor: "rgba(255,71,87,0.25)", borderRadius: 12, padding: 12,
  },
  errorText: { fontSize: 13, color: "#FF4757", flex: 1, lineHeight: 18 },
  successBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,217,192,0.1)", borderWidth: 1,
    borderColor: "rgba(0,217,192,0.25)", borderRadius: 12, padding: 12,
  },
  successText: { fontSize: 13, color: "#00D9C0", flex: 1 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(245,166,35,0.1)", borderWidth: 1,
    borderColor: "rgba(245,166,35,0.25)", borderRadius: 12, padding: 12,
  },
  warningText: { fontSize: 12, color: "#F5A623", flex: 1, lineHeight: 18 },
  submitBtn: { height: 54, borderRadius: 16, overflow: "hidden", marginTop: 4 },
  submitGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  submitText: { fontSize: 16, fontWeight: "700", color: "#070D1A" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  skipBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)",
  },
  skipText: { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 24,
  },
  toggleText: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  toggleAction: { fontSize: 14, color: "#00D9C0", fontWeight: "700" },
  featureBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 28 },
  featureBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,217,192,0.08)", borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(0,217,192,0.2)",
  },
  featureBadgeText: { fontSize: 11, color: "#00D9C0", fontWeight: "500" },
});

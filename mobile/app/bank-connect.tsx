import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { paystackService } from "@/lib/paystack";

interface Bank {
  id: string;
  name: string;
  code: string;
  color: string;
  accentColor: string;
  type: string;
  popular?: boolean;
  description: string;
}

const BANKS: Bank[] = [
  { id: "opay", name: "OPay", code: "100004", color: "#00A651", accentColor: "#00D966", type: "Mobile", popular: true, description: "Mobile money · Most popular" },
  { id: "kuda", name: "Kuda Bank", code: "090267", color: "#7B5CF7", accentColor: "#9B7DFF", type: "Digital", popular: true, description: "Digital bank · Zero fees" },
  { id: "palmpay", name: "PalmPay", code: "100033", color: "#1DA462", accentColor: "#25D079", type: "Mobile", description: "Mobile payments" },
  { id: "gtb", name: "GTBank", code: "058", color: "#F37021", accentColor: "#FF8A40", type: "Traditional", popular: true, description: "Tier-1 bank" },
  { id: "access", name: "Access Bank", code: "044", color: "#E31837", accentColor: "#FF2D4D", type: "Traditional", description: "Pan-African bank" },
  { id: "zenith", name: "Zenith Bank", code: "057", color: "#00529B", accentColor: "#0070D8", type: "Traditional", description: "Corporate & retail" },
  { id: "firstbank", name: "First Bank", code: "011", color: "#0066A0", accentColor: "#0088CC", type: "Traditional", description: "Oldest Nigerian bank" },
  { id: "uba", name: "UBA", code: "033", color: "#CC0000", accentColor: "#FF1A1A", type: "Traditional", description: "Pan-African bank" },
];

function BankLogo({ bank, size = 44 }: { bank: Bank; size?: number }) {
  return (
    <View style={[styles.bankLogo, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bank.color + "22" }]}>
      <Text style={[styles.bankLogoText, { fontSize: size * 0.3, color: bank.accentColor }]}>
        {bank.name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export default function BankConnectScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [step, setStep] = useState<"select" | "connecting" | "success">("select");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleConnect = async (bank: Bank) => {
    setSelectedBank(bank);
    setStep("connecting");
    setConnecting(true);

    try {
      // Get Paystack OAuth URL from backend
      const authData = await paystackService.getAuthorizationUrl();
      
      // Open Paystack OAuth flow in WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(
        authData.authUrl,
        "zeni://bank-connect" // Deep link to handle callback
      );

      if (result.type === "success" && result.url) {
        // Extract authorization code from callback URL
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        
        if (code) {
          // Exchange code for connected banks
          const syncResult = await paystackService.handleOAuthCallback(code);
          
          setConnecting(false);
          setConnected(true);
          setStep("success");
        } else {
          throw new Error("No authorization code received");
        }
      } else if (result.type === "cancel") {
        setConnecting(false);
        setStep("select");
        Alert.alert("Cancelled", "Bank connection cancelled");
      }
    } catch (error) {
      console.error("Bank connection error:", error);
      setConnecting(false);
      setStep("select");
      Alert.alert(
        "Connection Failed",
        error instanceof Error ? error.message : "Failed to connect bank account. Please try again."
      );
    }
  };

  const handleContinue = () => {
    router.replace("/(tabs)");
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  if (step === "connecting") {
    return (
      <View style={[styles.root, styles.centeredRoot]}>
        <LinearGradient colors={["#070D1A", "#0A1528", "#070D1A"]} style={StyleSheet.absoluteFill} />
        <View style={styles.connectingOrb} />
        <View style={styles.connectingWrap}>
          {selectedBank && (
            <BankLogo bank={selectedBank} size={72} />
          )}
          <View style={styles.connectingArrow}>
            <ActivityIndicator color="#00D9C0" size="small" />
          </View>
          <View style={[styles.zeniLogoSmall]}>
            <LinearGradient colors={["#00D9C0", "#7B5CF7"]} style={styles.zeniLogoGrad}>
              <Text style={styles.zeniLogoLetter}>Z</Text>
            </LinearGradient>
          </View>
        </View>
        <Text style={styles.connectingTitle}>Connecting securely...</Text>
        <Text style={styles.connectingSubtitle}>
          Establishing encrypted link to {selectedBank?.name}
        </Text>
        <View style={styles.secureRow}>
          {["256-bit encryption", "Read-only access", "Bank-grade security"].map((s) => (
            <View key={s} style={styles.secureBadge}>
              <Feather name="shield" size={10} color="#00D9C0" />
              <Text style={styles.secureBadgeText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={[styles.root, styles.centeredRoot]}>
        <LinearGradient colors={["#070D1A", "#0A1528", "#070D1A"]} style={StyleSheet.absoluteFill} />
        <View style={styles.successOrbGreen} />
        <View style={styles.successIconWrap}>
          <LinearGradient colors={["#00D9C0", "#00A896"]} style={styles.successIconGrad}>
            <Feather name="check" size={36} color="#070D1A" />
          </LinearGradient>
        </View>
        <Text style={styles.successTitle}>{selectedBank?.name} Connected!</Text>
        <Text style={styles.successSubtitle}>
          Your transactions are now syncing to Zeni. Zara will analyze your spending patterns automatically.
        </Text>
        <GlassCard style={styles.successCard}>
          <View style={styles.successRow}>
            <Feather name="check-circle" size={16} color="#00D9C0" />
            <Text style={styles.successRowText}>Account verified</Text>
          </View>
          <View style={styles.successRow}>
            <Feather name="check-circle" size={16} color="#00D9C0" />
            <Text style={styles.successRowText}>Read-only access granted</Text>
          </View>
          <View style={styles.successRow}>
            <Feather name="check-circle" size={16} color="#00D9C0" />
            <Text style={styles.successRowText}>AI analysis ready</Text>
          </View>
        </GlassCard>
        <TouchableOpacity style={[styles.continueBtn, { marginBottom: botPad + 16 }]} onPress={handleContinue}>
          <LinearGradient colors={["#00D9C0", "#00A896"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueBtnGrad}>
            <Text style={styles.continueBtnText}>Go to Dashboard</Text>
            <Feather name="arrow-right" size={18} color="#070D1A" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const popularBanks = BANKS.filter((b) => b.popular);
  const otherBanks = BANKS.filter((b) => !b.popular);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#070D1A", "#0A1528", "#070D1A"]} style={StyleSheet.absoluteFill} />
      <View style={styles.tealOrb} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Connect Your Bank</Text>
          <Text style={styles.subtitle}>
            Securely link your account so Zara can analyze your real transactions and give you personalized insights.
          </Text>
        </View>

        {/* Security Strip */}
        <View style={styles.securityStrip}>
          {[
            { icon: "lock" as const, label: "Bank-grade SSL" },
            { icon: "eye-off" as const, label: "Read-only" },
            { icon: "shield" as const, label: "Never stores passwords" },
          ].map((s) => (
            <View key={s.label} style={styles.securityItem}>
              <Feather name={s.icon} size={12} color="#00D9C0" />
              <Text style={styles.securityText}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Popular Banks */}
        <Text style={styles.sectionLabel}>Popular Banks</Text>
        {popularBanks.map((bank) => (
          <Pressable key={bank.id} onPress={() => handleConnect(bank)}>
            <GlassCard style={styles.bankCard} noPadding>
              <View style={styles.bankRow}>
                <BankLogo bank={bank} />
                <View style={styles.bankInfo}>
                  <View style={styles.bankNameRow}>
                    <Text style={styles.bankName}>{bank.name}</Text>
                    <View style={[styles.bankTypeBadge, { backgroundColor: bank.color + "22", borderColor: bank.color + "44" }]}>
                      <Text style={[styles.bankTypeText, { color: bank.accentColor }]}>{bank.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.bankDesc}>{bank.description}</Text>
                </View>
                <View style={[styles.connectBtn, { backgroundColor: bank.color + "15", borderColor: bank.color + "40" }]}>
                  <Text style={[styles.connectBtnText, { color: bank.accentColor }]}>Connect</Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}

        {/* Other Banks */}
        <Text style={styles.sectionLabel}>More Banks</Text>
        <GlassCard noPadding style={{ marginBottom: 24 }}>
          {otherBanks.map((bank, i) => (
            <Pressable key={bank.id} onPress={() => handleConnect(bank)}>
              <View style={[
                styles.bankRowFlat,
                i < otherBanks.length - 1 && styles.bankRowFlatBorder,
              ]}>
                <BankLogo bank={bank} size={38} />
                <View style={styles.bankInfoFlat}>
                  <Text style={styles.bankNameFlat}>{bank.name}</Text>
                  <Text style={styles.bankDescFlat}>{bank.description}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.2)" />
              </View>
            </Pressable>
          ))}
        </GlassCard>

        {/* Mono info */}
        <GlassCard noPadding style={{ marginBottom: 24 }}>
          <LinearGradient colors={["rgba(123,92,247,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
          <View style={{ padding: 16 }}>
            <View style={styles.monoRow}>
              <View style={styles.monoIcon}>
                <Feather name="link" size={16} color="#7B5CF7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.monoTitle}>Powered by Mono</Text>
                <Text style={styles.monoDesc}>
                  Bank connections are secured by Mono — Nigeria's leading open finance infrastructure. Your credentials are never stored by Zeni.
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now — I'll connect later</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070D1A" },
  centeredRoot: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  tealOrb: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "#00D9C008", top: -80, right: -80,
  },
  scroll: { paddingHorizontal: 20 },
  header: { alignItems: "center", marginBottom: 24, gap: 10 },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 21 },
  securityStrip: {
    flexDirection: "row", justifyContent: "center", gap: 16,
    marginBottom: 28,
  },
  securityItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  securityText: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  bankCard: { marginBottom: 10 },
  bankRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  bankLogo: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bankLogoText: { fontWeight: "800" },
  bankInfo: { flex: 1, gap: 3 },
  bankNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bankName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  bankTypeBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  bankTypeText: { fontSize: 10, fontWeight: "600" },
  bankDesc: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  connectBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  connectBtnText: { fontSize: 13, fontWeight: "700" },
  bankRowFlat: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  bankRowFlatBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  bankInfoFlat: { flex: 1, gap: 2 },
  bankNameFlat: { fontSize: 14, fontWeight: "600", color: "#fff" },
  bankDescFlat: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  monoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  monoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#7B5CF722", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  monoTitle: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 4 },
  monoDesc: { fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 18 },
  skipBtn: {
    paddingVertical: 16, alignItems: "center",
  },
  skipText: { fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
  // Connecting state
  connectingOrb: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "#00D9C010",
  },
  connectingWrap: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 32 },
  connectingArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,217,192,0.1)",
    borderWidth: 1, borderColor: "rgba(0,217,192,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  zeniLogoSmall: { width: 52, height: 52, borderRadius: 14, overflow: "hidden" },
  zeniLogoGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  zeniLogoLetter: { fontSize: 22, fontWeight: "800", color: "#fff" },
  connectingTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 8 },
  connectingSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 21, marginBottom: 28 },
  secureRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,217,192,0.08)", borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(0,217,192,0.2)",
  },
  secureBadgeText: { fontSize: 11, color: "#00D9C0" },
  // Success state
  successOrbGreen: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "#00D9C010",
  },
  successIconWrap: { width: 80, height: 80, borderRadius: 40, overflow: "hidden", marginBottom: 24 },
  successIconGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 12 },
  successSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 21, marginBottom: 24 },
  successCard: { width: "100%", marginBottom: 32, gap: 12 },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  successRowText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  continueBtn: { width: "100%", height: 54, borderRadius: 16, overflow: "hidden" },
  continueBtnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  continueBtnText: { fontSize: 16, fontWeight: "700", color: "#070D1A" },
});

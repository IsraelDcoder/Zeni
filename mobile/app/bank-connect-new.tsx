/**
 * Bank Connect Screen - Open Banking Integration
 * 
 * This screen implements STEP 1-5 of the architecture:
 * 1. User taps "Connect Bank"
 * 2. Mono/Okra SDK opens
 * 3. User logs into bank
 * 4. User grants permissions
 * 5. Backend receives access token
 * 6. App shows success
 * 
 * Architecture:
 * User → Mono/Okra SDK → Bank → OAuth callback → Backend stores token
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { zeniApi } from "@/lib/api-client";
import { useColors } from "@/hooks/useColors";

interface Bank {
  id: string;
  name: string;
  code: string;
  color: string;
  accentColor: string;
  logo: string;
}

// Supported Nigerian banks
const BANKS: Bank[] = [
  { id: "gtb", name: "GTBank", code: "058", color: "#F37021", accentColor: "#FF8A40", logo: "💳" },
  { id: "access", name: "Access Bank", code: "044", color: "#E31837", accentColor: "#FF2D4D", logo: "🏦" },
  { id: "zenith", name: "Zenith Bank", code: "057", color: "#00529B", accentColor: "#0070D8", logo: "🏛️" },
  { id: "firstbank", name: "First Bank", code: "011", color: "#0066A0", accentColor: "#0088CC", logo: "🏪" },
  { id: "uba", name: "UBA", code: "033", color: "#CC0000", accentColor: "#FF1A1A", logo: "🌐" },
  { id: "kuda", name: "Kuda Bank", code: "090267", color: "#7B5CF7", accentColor: "#9B7DFF", logo: "📱" },
  { id: "opay", name: "OPay", code: "100004", color: "#00A651", accentColor: "#00D966", logo: "💰" },
  { id: "palmpay", name: "PalmPay", code: "100033", color: "#1DA462", accentColor: "#25D079", logo: "🤚" },
];

function BankCard({ bank, onPress, isLoading }: { bank: Bank; onPress: () => void; isLoading: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={[styles.bankCard, { backgroundColor: bank.color + "15", borderColor: bank.color }]}
      activeOpacity={0.7}
    >
      <View style={styles.bankCardContent}>
        <Text style={styles.bankLogo}>{bank.logo}</Text>
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{bank.name}</Text>
          <Text style={styles.bankCode}>{bank.code}</Text>
        </View>
        <Feather name="arrow-right" size={20} color={bank.accentColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function BankConnectScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useColors();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [provider, setProvider] = useState<"mono" | "okra">("mono");
  const [step, setStep] = useState<"select" | "authorize" | "success">("select");
  const [connectedBanks, setConnectedBanks] = useState<any[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    fetchConnectedBanks();
  }, []);

  /**
   * Fetch already connected banks
   */
  const fetchConnectedBanks = async () => {
    try {
      const banks = await zeniApi.getConnectedBankAccounts();
      setConnectedBanks(banks || []);
    } catch (error) {
      console.error("Error fetching connected banks:", error);
    }
  };

  /**
   * STEP 1-5: Initiate bank connection via Mono/Okra
   */
  const handleConnectBank = async (bank: Bank) => {
    setSelectedBank(bank);
    setStep("authorize");
    setConnecting(true);

    try {
      // Get Mono/Okra authorization URL from backend
      const authData = await zeniApi.getBankAuthorizationUrl(provider);

      if (!authData.authUrl) {
        throw new Error("Failed to get authorization URL");
      }

      // Open SDK in WebBrowser
      // User logs into their bank here (Zeni NEVER sees password)
      const result = await WebBrowser.openAuthSessionAsync(
        authData.authUrl,
        "zeni://bank-connect-callback"
      );

      if (result.type === "success" && result.url) {
        // Extract authorization code from callback
        const url = new URL(result.url);
        const code = url.searchParams.get("code");

        if (code) {
          // STEP 5: Exchange code for access token
          // Backend stores token securely (encrypted)
          const connectionData = await zeniApi.handleBankCallback(code, provider);

          setConnecting(false);
          setStep("success");

          // Update connected banks list
          await fetchConnectedBanks();

          // Show success message
          Alert.alert(
            "✅ Bank Connected!",
            `${connectionData.bank?.bankName || bank.name} is now connected.\n\nYour balance and transactions are now accessible.`,
            [
              {
                text: "View Balance",
                onPress: () => router.push("/(tabs)"),
              },
              {
                text: "Add Another Bank",
                onPress: () => {
                  setStep("select");
                  setSelectedBank(null);
                },
              },
            ]
          );
        } else {
          throw new Error("No authorization code received");
        }
      } else if (result.type === "cancel") {
        setConnecting(false);
        setStep("select");
        console.log("Bank connection cancelled by user");
      } else {
        throw new Error("Authorization failed");
      }
    } catch (error) {
      console.error("Bank connection error:", error);
      setConnecting(false);
      setStep("select");

      Alert.alert(
        "Connection Failed",
        `Could not connect to ${selectedBank?.name}. Please try again.\n\n${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }]
      );
    }
  };

  /**
   * Provider selection (Mono vs Okra)
   */
  const renderProviderSelector = () => (
    <View style={styles.providerSelector}>
      <Text style={styles.sectionTitle}>Select Bank Connection Provider</Text>
      <View style={styles.providerButtons}>
        <TouchableOpacity
          style={[
            styles.providerButton,
            provider === "mono" && styles.providerButtonActive,
            { borderColor: provider === "mono" ? colors.accent : colors.border },
          ]}
          onPress={() => setProvider("mono")}
        >
          <Text style={styles.providerButtonText}>Mono</Text>
          <Text style={styles.providerDescription}>Fast & Reliable</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.providerButton,
            provider === "okra" && styles.providerButtonActive,
            { borderColor: provider === "okra" ? colors.accent : colors.border },
          ]}
          onPress={() => setProvider("okra")}
        >
          <Text style={styles.providerButtonText}>Okra</Text>
          <Text style={styles.providerDescription}>Alternative Option</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Connected banks display
   */
  const renderConnectedBanks = () => {
    if (connectedBanks.length === 0) return null;

    return (
      <View style={[styles.section, { marginBottom: 24 }]}>
        <Text style={styles.sectionTitle}>Connected Banks</Text>
        {connectedBanks.map((bank) => (
          <GlassCard key={bank.id} style={styles.connectedBankCard}>
            <View style={styles.connectedBankContent}>
              <View>
                <Text style={styles.connectedBankName}>{bank.bank_name}</Text>
                <Text style={styles.connectedBankAccount}>
                  {bank.account_number ? `••• ${bank.account_number.slice(-4)}` : bank.account_number}
                </Text>
                <Text style={styles.connectedBankHolder}>{bank.account_holder}</Text>
              </View>
              <View style={styles.connectedBankBadge}>
                <Feather name="check-circle" size={24} color={colors.success} />
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    );
  };

  /**
   * Bank selection grid
   */
  const renderBankSelection = () => (
    <View>
      {renderProviderSelector()}
      {renderConnectedBanks()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Your Bank</Text>
        <Text style={styles.sectionSubtitle}>
          Your login credentials are secure. Zeni never sees your password.
        </Text>

        <View style={styles.bankGrid}>
          {BANKS.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              onPress={() => handleConnectBank(bank)}
              isLoading={connecting && selectedBank?.id === bank.id}
            />
          ))}
        </View>
      </View>
    </View>
  );

  /**
   * Loading state
   */
  const renderAuthorizingState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.stateContent}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 16 }} />
        <Text style={styles.stateTitle}>Connecting to {selectedBank?.name}</Text>
        <Text style={styles.stateSubtitle}>
          Please complete authorization in the browser window.
        </Text>
        <View style={styles.securityBadge}>
          <Feather name="lock" size={16} color={colors.success} />
          <Text style={styles.securityText}>Your password stays private</Text>
        </View>
      </View>
    </View>
  );

  /**
   * Success state
   */
  const renderSuccessState = () => (
    <View style={styles.stateContainer}>
      <LinearGradient colors={["rgba(76, 175, 80, 0.1)", "rgba(76, 175, 80, 0)"]} style={styles.successBg}>
        <View style={styles.stateContent}>
          <View style={styles.successIcon}>
            <Feather name="check" size={48} color={colors.success} />
          </View>
          <Text style={styles.stateTitle}>✅ Bank Connected!</Text>
          <Text style={styles.stateSubtitle}>
            Your {selectedBank?.name} account is ready to use.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.buttonText}>View Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setStep("select")}
          >
            <Text style={styles.buttonSecondaryText}>Add Another Bank</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Feather name="arrow-left" size={24} color={colors.text} onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Connect Bank</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        {step === "select" && renderBankSelection()}
        {step === "authorize" && renderAuthorizingState()}
        {step === "success" && renderSuccessState()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  providerSelector: {
    marginBottom: 32,
  },
  providerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  providerButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  providerButtonActive: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  providerDescription: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  bankGrid: {
    flexDirection: "column",
    gap: 12,
  },
  bankCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bankCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bankLogo: {
    fontSize: 32,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  bankCode: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  connectedBankCard: {
    marginBottom: 12,
  },
  connectedBankContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  connectedBankName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  connectedBankAccount: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  connectedBankHolder: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  connectedBankBadge: {
    marginLeft: 12,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: Dimensions.get("window").height * 0.6,
  },
  stateContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  successBg: {
    width: "100%",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#ccc",
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
});

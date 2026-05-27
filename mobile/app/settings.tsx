import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { signOut, user, isConfigured } = useAuth();
  const { profile, setProfile } = useApp();

  const [notifications, setNotifications] = useState(true);
  const [spendingAlerts, setSpendingAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [editNameModal, setEditNameModal] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editIncomeModal, setEditIncomeModal] = useState(false);
  const [editIncome, setEditIncome] = useState((profile?.monthlyIncome ?? 280000).toString());
  const [loggingOut, setLoggingOut] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    if (profile) {
      await setProfile({ ...profile, name: editName.trim() });
    }
    setEditNameModal(false);
  };

  const handleSaveIncome = async () => {
    const val = parseInt(editIncome.replace(/\D/g, ""), 10);
    if (!val) return;
    if (profile) {
      await setProfile({ ...profile, monthlyIncome: val });
    }
    setEditIncomeModal(false);
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    router.replace("/auth");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {} },
      ]
    );
  };

  function SettingRow({
    icon,
    label,
    value,
    accent,
    iconBg,
    onPress,
    rightElement,
    danger,
  }: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value?: string;
    accent?: boolean;
    iconBg?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) {
    const iconColor = danger ? "#FF4757" : accent ? "#F5A623" : "rgba(255,255,255,0.6)";
    const labelColor = danger ? "#FF4757" : accent ? "#F5A623" : colors.foreground;
    const bg = danger ? "#FF475715" : iconBg ?? "rgba(255,255,255,0.06)";

    return (
      <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress}>
        <View style={[styles.settingIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.settingLabel, { color: labelColor }]}>{label}</Text>
        <View style={{ flex: 1 }} />
        {value ? <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
        {rightElement ?? (
          onPress ? <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.2)" /> : null
        )}
      </TouchableOpacity>
    );
  }

  function SectionHeader({ title }: { title: string }) {
    return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#070D1A", "#091220", "#070D1A"]} style={StyleSheet.absoluteFill} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        {user && (
          <GlassCard style={styles.accountCard} noPadding>
            <LinearGradient
              colors={["rgba(0,217,192,0.08)", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.accountPad}>
              <View style={styles.accountAvatar}>
                <LinearGradient colors={["#00D9C0", "#7B5CF7"]} style={styles.avatarGrad}>
                  <Text style={styles.avatarText}>
                    {(profile?.name ?? user.email ?? "U")[0].toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountName, { color: colors.foreground }]}>
                  {profile?.name ?? "Zeni User"}
                </Text>
                <Text style={[styles.accountEmail, { color: colors.mutedForeground }]}>
                  {user.email}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={14} color="#00D9C0" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Profile */}
        <SectionHeader title="PROFILE" />
        <GlassCard noPadding style={{ marginBottom: 16 }}>
          <SettingRow
            icon="user"
            label="Display Name"
            value={profile?.name ?? "Friend"}
            onPress={() => { setEditName(profile?.name ?? ""); setEditNameModal(true); }}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="dollar-sign"
            label="Monthly Income"
            value={"₦" + ((profile?.monthlyIncome ?? 280000) / 1000).toFixed(0) + "k"}
            onPress={() => { setEditIncome((profile?.monthlyIncome ?? 280000).toString()); setEditIncomeModal(true); }}
          />
          <View style={styles.rowDivider} />
          <SettingRow icon="globe" label="Region" value="Nigeria · NGN" />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="link"
            label="Connected Bank"
            value="Manage"
            onPress={() => router.push("/bank-connect")}
          />
        </GlassCard>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <GlassCard noPadding style={{ marginBottom: 16 }}>
          <SettingRow
            icon="bell"
            label="Push Notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,217,192,0.4)" }}
                thumbColor={notifications ? "#00D9C0" : "rgba(255,255,255,0.5)"}
              />
            }
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="activity"
            label="Spending Alerts"
            rightElement={
              <Switch
                value={spendingAlerts}
                onValueChange={setSpendingAlerts}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,217,192,0.4)" }}
                thumbColor={spendingAlerts ? "#00D9C0" : "rgba(255,255,255,0.5)"}
              />
            }
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="bar-chart-2"
            label="Weekly Report"
            rightElement={
              <Switch
                value={weeklyReport}
                onValueChange={setWeeklyReport}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,217,192,0.4)" }}
                thumbColor={weeklyReport ? "#00D9C0" : "rgba(255,255,255,0.5)"}
              />
            }
          />
        </GlassCard>

        {/* Privacy & Security */}
        <SectionHeader title="PRIVACY & SECURITY" />
        <GlassCard noPadding style={{ marginBottom: 16 }}>
          <SettingRow
            icon="lock"
            label="Change Password"
            onPress={() => router.push("/auth")}
          />
          <View style={styles.rowDivider} />
          <SettingRow icon="shield" label="Biometric Lock" value="Coming soon" />
          <View style={styles.rowDivider} />
          <SettingRow icon="eye-off" label="Privacy Policy" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="file-text" label="Terms of Service" onPress={() => {}} />
        </GlassCard>

        {/* App */}
        <SectionHeader title="APP" />
        <GlassCard noPadding style={{ marginBottom: 16 }}>
          <SettingRow
            icon="star"
            label="Premium Plan"
            value="Upgrade"
            accent
            iconBg="#F5A62322"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="message-square" label="Give Feedback" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="info" label="App Version" value="v1.0.0" />
        </GlassCard>

        {/* Danger Zone */}
        <SectionHeader title="ACCOUNT" />
        <GlassCard noPadding style={{ marginBottom: 16 }}>
          <SettingRow
            icon="log-out"
            label={loggingOut ? "Signing out..." : "Sign Out"}
            danger
            onPress={handleSignOut}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="trash-2"
            label="Delete Account"
            danger
            onPress={handleDeleteAccount}
          />
        </GlassCard>

        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
          Zeni AI Financial OS · v1.0.0{"\n"}
          {isConfigured ? "Connected to Zeni Cloud" : "Running in local mode"}
        </Text>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={editNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
            <LinearGradient colors={["#0D1525", "#070D1A"]} style={StyleSheet.absoluteFill} />
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Display Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setEditNameModal(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveName}>
                <LinearGradient colors={["#00D9C0", "#00A896"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveGrad}>
                  <Text style={{ color: "#070D1A", fontWeight: "700" }}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Income Modal */}
      <Modal visible={editIncomeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
            <LinearGradient colors={["#0D1525", "#070D1A"]} style={StyleSheet.absoluteFill} />
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Monthly Income</Text>
            <View style={styles.incomeInputRow}>
              <Text style={styles.incomeCurrency}>₦</Text>
              <TextInput
                value={editIncome}
                onChangeText={setEditIncome}
                style={[styles.incomeInput, { color: colors.foreground }]}
                placeholder="280000"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setEditIncomeModal(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveIncome}>
                <LinearGradient colors={["#00D9C0", "#00A896"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveGrad}>
                  <Text style={{ color: "#070D1A", fontWeight: "700" }}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  accountCard: { marginBottom: 24 },
  accountPad: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  accountAvatar: { width: 50, height: 50, borderRadius: 25, overflow: "hidden" },
  avatarGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  accountName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  accountEmail: { fontSize: 13 },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,217,192,0.1)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(0,217,192,0.25)",
  },
  verifiedText: { fontSize: 11, color: "#00D9C0", fontWeight: "600" },
  sectionHeader: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 8, marginTop: 4,
  },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  settingIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  settingValue: { fontSize: 13, marginRight: 6 },
  rowDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginLeft: 62 },
  footerNote: { fontSize: 12, textAlign: "center", lineHeight: 20, marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, overflow: "hidden",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8,
  },
  incomeInputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8,
  },
  incomeCurrency: { fontSize: 22, color: "#00D9C0", fontWeight: "700", marginRight: 6 },
  incomeInput: { flex: 1, fontSize: 20, paddingVertical: 14 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1, height: 50, borderRadius: 14,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  modalSave: { flex: 2, height: 50, borderRadius: 14, overflow: "hidden" },
  modalSaveGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});

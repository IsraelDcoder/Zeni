import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
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

import { MascotWidget } from "@/components/MascotWidget";
import type { TransactionCategory } from "@/context/AppContext";
import { CATEGORIES, type CategoryMeta, type ClassificationResult, getConfidenceLevel } from "@/lib/categorization";

interface Props {
  visible: boolean;
  transaction: {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
  } | null;
  classification: ClassificationResult | null;
  onConfirm: (txId: string, category: TransactionCategory) => void;
  onDismiss: () => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 80 ? "#00D9C0" : confidence >= 55 ? "#F5A623" : "#FF4757";
  return (
    <View style={[styles.confBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <View style={[styles.confDot, { backgroundColor: color }]} />
      <Text style={[styles.confText, { color }]}>{confidence}% confident</Text>
    </View>
  );
}

export function CategoryModal({ visible, transaction, classification, onConfirm, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [customText, setCustomText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const level = classification ? getConfidenceLevel(classification.confidence) : "low";
  const suggested = classification?.category ?? "other";
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (visible) {
      setHasBeenVisible(true);
      setSelectedCategory(null);
      setCustomText("");
      setShowFullPicker(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, overlayAnim, slideAnim]);

  const handleConfirm = (cat: TransactionCategory) => {
    if (!transaction) return;
    onConfirm(transaction.id, cat);
  };

  const getMascotMessage = () => {
    if (!transaction) return "";
    const amt = "₦" + transaction.amount.toLocaleString("en-NG");
    if (level === "high") return `Got it! This ${amt} looks like ${suggested}. Confirming...`;
    if (level === "medium") return `This ${amt} — is this ${suggested}? Just want to make sure.`;
    return `Hey! What was this ${amt} used for? I want to learn your habits.`;
  };

  const suggestedMeta = CATEGORIES.find((c) => c.id === suggested);

  if (!visible && !hasBeenVisible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: botPad + 24 }]}
      >
        <LinearGradient colors={["#0D1828", "#070D1A"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.sheetBorder, { borderColor: "rgba(0,217,192,0.15)" }]} />

        {/* Handle */}
        <View style={styles.handle} />

        {/* Mascot + message */}
        <View style={styles.mascotRow}>
          <MascotWidget mood={level === "high" ? "happy" : level === "medium" ? "playful" : "calm"} size={52} />
          <View style={styles.mascotBubble}>
            <Text style={styles.mascotText}>{getMascotMessage()}</Text>
          </View>
        </View>

        {/* Transaction info */}
        <View style={styles.txInfo}>
          <Text style={styles.txAmount} numberOfLines={1}>
            {transaction?.type === "income" ? "+" : "–"}₦{transaction?.amount.toLocaleString("en-NG")}
          </Text>
          <Text style={styles.txDesc} numberOfLines={1}>{transaction?.description}</Text>
          {classification && <ConfidenceBadge confidence={classification.confidence} />}
        </View>

        {/* HIGH confidence — auto confirm with quick actions */}
        {level === "high" && !showFullPicker && suggestedMeta && (
          <View style={styles.highConfSection}>
            <View style={[styles.bigCategoryChip, { backgroundColor: suggestedMeta.color + "22", borderColor: suggestedMeta.color + "44" }]}>
              <Text style={styles.bigCategoryEmoji}>{suggestedMeta.emoji}</Text>
              <Text style={[styles.bigCategoryLabel, { color: suggestedMeta.color }]}>{suggestedMeta.label}</Text>
            </View>
            <View style={styles.highConfButtons}>
              <TouchableOpacity
                style={[styles.confirmBtn]}
                onPress={() => handleConfirm(suggested)}
              >
                <LinearGradient colors={["#00D9C0", "#00A896"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmBtnGrad}>
                  <Feather name="check" size={16} color="#070D1A" />
                  <Text style={styles.confirmBtnText}>Yes, that's right</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.changeBtn} onPress={() => setShowFullPicker(true)}>
                <Text style={styles.changeBtnText}>Change category</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MEDIUM confidence — confirm or change */}
        {level === "medium" && !showFullPicker && suggestedMeta && (
          <View style={styles.mediumConfSection}>
            <TouchableOpacity
              style={[styles.mediumChip, { backgroundColor: suggestedMeta.color + "15", borderColor: suggestedMeta.color + "40" }]}
              onPress={() => handleConfirm(suggested)}
            >
              <Text style={styles.mediumEmoji}>{suggestedMeta.emoji}</Text>
              <View>
                <Text style={[styles.mediumChipLabel, { color: suggestedMeta.color }]}>{suggestedMeta.label}</Text>
                <Text style={styles.mediumChipSub}>Tap to confirm</Text>
              </View>
              <Feather name="check-circle" size={20} color={suggestedMeta.color} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
            <View style={styles.altRow}>
              {classification?.alternatives.slice(0, 2).map((alt) => {
                const meta = CATEGORIES.find((c) => c.id === alt.category);
                if (!meta) return null;
                return (
                  <TouchableOpacity
                    key={alt.category}
                    style={[styles.altChip, { backgroundColor: meta.color + "12", borderColor: meta.color + "30" }]}
                    onPress={() => handleConfirm(alt.category)}
                  >
                    <Text style={styles.altEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.altLabel, { color: meta.color }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.altChip} onPress={() => setShowFullPicker(true)}>
                <Text style={styles.altEmoji}>➕</Text>
                <Text style={[styles.altLabel, { color: "rgba(255,255,255,0.5)" }]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LOW confidence OR full picker — show grid */}
        {(level === "low" || showFullPicker) && (
          <View style={styles.fullPickerSection}>
            <Text style={styles.pickerTitle}>Pick a category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.filter((c) => c.id !== "income" || transaction?.type === "income").map((meta) => (
                <CategoryPill
                  key={meta.id}
                  meta={meta}
                  selected={selectedCategory === meta.id}
                  onPress={() => setSelectedCategory(meta.id)}
                />
              ))}
            </View>
            {selectedCategory === "other" && (
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="Describe the expense..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.customInput}
                autoFocus
              />
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedCategory && styles.confirmBtnDisabled]}
              disabled={!selectedCategory}
              onPress={() => selectedCategory && handleConfirm(selectedCategory)}
            >
              <LinearGradient
                colors={selectedCategory ? ["#00D9C0", "#00A896"] : ["#333", "#222"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGrad}
              >
                <Text style={[styles.confirmBtnText, !selectedCategory && { color: "rgba(255,255,255,0.4)" }]}>
                  Confirm
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Skip */}
        <TouchableOpacity onPress={onDismiss} style={styles.skipRow}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

function CategoryPill({
  meta, selected, onPress,
}: { meta: CategoryMeta; selected: boolean; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, damping: 15, stiffness: 400 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.categoryPill,
          {
            backgroundColor: selected ? meta.color + "25" : "rgba(255,255,255,0.05)",
            borderColor: selected ? meta.color : "rgba(255,255,255,0.1)",
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={styles.pillEmoji}>{meta.emoji}</Text>
        <Text style={[styles.pillLabel, { color: selected ? meta.color : "rgba(255,255,255,0.7)" }]}>
          {meta.label}
        </Text>
        {selected && (
          <View style={[styles.pillCheck, { backgroundColor: meta.color }]}>
            <Feather name="check" size={8} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  sheetBorder: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginTop: 12, marginBottom: 20,
  },
  mascotRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16,
  },
  mascotBubble: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16, borderTopLeftRadius: 4,
    padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  mascotText: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  txInfo: { alignItems: "center", marginBottom: 20, gap: 4 },
  txAmount: { fontSize: 32, fontWeight: "800", color: "#fff" },
  txDesc: { fontSize: 14, color: "rgba(255,255,255,0.55)" },
  confBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, marginTop: 4,
  },
  confDot: { width: 5, height: 5, borderRadius: 3 },
  confText: { fontSize: 11, fontWeight: "600" },
  // High confidence
  highConfSection: { alignItems: "center", gap: 16, marginBottom: 8 },
  bigCategoryChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18, borderWidth: 1.5,
  },
  bigCategoryEmoji: { fontSize: 28 },
  bigCategoryLabel: { fontSize: 22, fontWeight: "700" },
  highConfButtons: { width: "100%", gap: 10 },
  // Medium confidence
  mediumConfSection: { gap: 12, marginBottom: 8 },
  mediumChip: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1.5,
  },
  mediumEmoji: { fontSize: 24 },
  mediumChipLabel: { fontSize: 16, fontWeight: "700" },
  mediumChipSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  altRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  altChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  altEmoji: { fontSize: 16 },
  altLabel: { fontSize: 13, fontWeight: "600" },
  // Full picker
  fullPickerSection: { gap: 14, marginBottom: 8 },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.7)", textAlign: "center" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
    minWidth: "30%", flex: 1,
  },
  pillEmoji: { fontSize: 16 },
  pillLabel: { fontSize: 12, fontWeight: "600", flex: 1 },
  pillCheck: {
    width: 14, height: 14, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  customInput: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff", backgroundColor: "rgba(255,255,255,0.05)",
  },
  // Shared
  confirmBtn: { height: 52, borderRadius: 16, overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmBtnText: { fontSize: 16, fontWeight: "700", color: "#070D1A" },
  changeBtn: { paddingVertical: 12, alignItems: "center" },
  changeBtnText: { fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
  skipRow: { paddingVertical: 10, alignItems: "center" },
  skipText: { fontSize: 13, color: "rgba(255,255,255,0.25)" },
});

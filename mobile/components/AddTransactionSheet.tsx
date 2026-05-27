import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { TransactionCategory } from "@/context/AppContext";
import { CATEGORIES, classifyTransaction } from "@/lib/categorization";

interface Props {
  visible: boolean;
  merchantMemory: Record<string, TransactionCategory>;
  onAdd: (data: {
    amount: number;
    description: string;
    category: TransactionCategory;
    type: "income" | "expense";
    date: string;
    isImpulse?: boolean;
    hour?: number;
  }) => void;
  onClose: () => void;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const DISPLAY_CATEGORIES = CATEGORIES.filter((c) => c.id !== "other");

export function AddTransactionSheet({ visible, merchantMemory, onAdd, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(700)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("food");
  const [isImpulse, setIsImpulse] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (visible) {
      setHasBeenVisible(true);
      setAmount("");
      setDescription("");
      setCategory("food");
      setIsImpulse(false);
      setAiSuggested(false);
      setType("expense");
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 700, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, overlayAnim, slideAnim]);

  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
    if (text.length >= 3) {
      const result = classifyTransaction(text, merchantMemory);
      if (result.confidence >= 50 && result.category !== "other") {
        setCategory(result.category);
        setAiSuggested(true);
      }
    }
  }, [merchantMemory]);

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleAdd = () => {
    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (!numAmount || numAmount <= 0 || !description.trim()) return;
    onAdd({
      amount: numAmount,
      description: description.trim(),
      category,
      type,
      date: new Date().toISOString().split("T")[0],
      isImpulse: isImpulse && type === "expense",
      hour: new Date().getHours(),
    });
    onClose();
  };

  const isValid = parseFloat(amount.replace(/,/g, "")) > 0 && description.trim().length > 0;
  const selectedCatMeta = CATEGORIES.find((c) => c.id === category);

  if (!visible && !hasBeenVisible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.kavWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: botPad + 16 }]}
        >
          <LinearGradient colors={["#0D1828", "#070D1A"]} style={StyleSheet.absoluteFill} />
          <View style={styles.sheetBorder} />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Transaction</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, type === "expense" && styles.typeBtnActive]}
              onPress={() => setType("expense")}
            >
              <LinearGradient
                colors={type === "expense" ? ["rgba(255,71,87,0.3)", "rgba(255,71,87,0.1)"] : ["transparent", "transparent"]}
                style={styles.typeBtnGrad}
              >
                <Feather name="trending-down" size={14} color={type === "expense" ? "#FF4757" : "rgba(255,255,255,0.4)"} />
                <Text style={[styles.typeBtnText, { color: type === "expense" ? "#FF4757" : "rgba(255,255,255,0.4)" }]}>
                  Expense
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === "income" && styles.typeBtnActive]}
              onPress={() => { setType("income"); setCategory("income"); }}
            >
              <LinearGradient
                colors={type === "income" ? ["rgba(0,217,192,0.3)", "rgba(0,217,192,0.1)"] : ["transparent", "transparent"]}
                style={styles.typeBtnGrad}
              >
                <Feather name="trending-up" size={14} color={type === "income" ? "#00D9C0" : "rgba(255,255,255,0.4)"} />
                <Text style={[styles.typeBtnText, { color: type === "income" ? "#00D9C0" : "rgba(255,255,255,0.4)" }]}>
                  Income
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountRow}>
            <Text style={[styles.amountCurrency, { color: type === "expense" ? "#FF4757" : "#00D9C0" }]}>₦</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              style={[styles.amountInput, { color: type === "expense" ? "#FF4757" : "#00D9C0" }]}
              keyboardType="numeric"
              autoFocus={false}
            />
          </View>

          {/* Quick amounts */}
          {type === "expense" && (
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((q) => (
                <Pressable key={q} onPress={() => handleQuickAmount(q)} style={styles.quickChip}>
                  <Text style={styles.quickChipText}>
                    {q >= 1000 ? "₦" + (q / 1000) + "k" : "₦" + q}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Description */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Description</Text>
            <View style={styles.inputRow}>
              <Feather name="edit-3" size={15} color="rgba(255,255,255,0.3)" />
              <TextInput
                value={description}
                onChangeText={handleDescriptionChange}
                placeholder="e.g. Chicken Republic, Uber ride..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.descInput}
                returnKeyType="done"
              />
              {aiSuggested && (
                <View style={styles.aiHint}>
                  <Feather name="cpu" size={10} color="#00D9C0" />
                  <Text style={styles.aiHintText}>AI</Text>
                </View>
              )}
            </View>
          </View>

          {/* Category */}
          {type === "expense" && (
            <View style={styles.fieldWrap}>
              <View style={styles.catHeader}>
                <Text style={styles.fieldLabel}>Category</Text>
                {aiSuggested && (
                  <Text style={styles.aiSuggestedText}>
                    AI suggested · {selectedCatMeta?.label}
                  </Text>
                )}
              </View>
              <View style={styles.catGrid}>
                {DISPLAY_CATEGORIES.filter((c) => c.id !== "income").slice(0, 9).map((meta) => (
                  <TouchableOpacity
                    key={meta.id}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: category === meta.id ? meta.color + "22" : "rgba(255,255,255,0.04)",
                        borderColor: category === meta.id ? meta.color + "60" : "rgba(255,255,255,0.08)",
                      },
                    ]}
                    onPress={() => { setCategory(meta.id); setAiSuggested(false); }}
                  >
                    <Text style={styles.catEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.catLabel, { color: category === meta.id ? meta.color : "rgba(255,255,255,0.6)" }]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Impulse toggle */}
          {type === "expense" && (
            <TouchableOpacity
              style={[styles.impulseToggle, isImpulse && styles.impulseToggleActive]}
              onPress={() => setIsImpulse((v) => !v)}
            >
              <Feather name="zap" size={14} color={isImpulse ? "#EC4899" : "rgba(255,255,255,0.4)"} />
              <Text style={[styles.impulseText, { color: isImpulse ? "#EC4899" : "rgba(255,255,255,0.4)" }]}>
                Mark as impulse purchase
              </Text>
              <View style={[styles.impulseDot, { backgroundColor: isImpulse ? "#EC4899" : "rgba(255,255,255,0.1)" }]} />
            </TouchableOpacity>
          )}

          {/* Add button */}
          <TouchableOpacity
            style={[styles.addBtn, !isValid && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!isValid}
          >
            <LinearGradient
              colors={isValid ? (type === "expense" ? ["#FF6B7A", "#FF4757"] : ["#00D9C0", "#00A896"]) : ["#333", "#222"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.addBtnGrad}
            >
              <Feather name={type === "expense" ? "minus-circle" : "plus-circle"} size={18} color={isValid ? "#fff" : "rgba(255,255,255,0.3)"} />
              <Text style={[styles.addBtnText, !isValid && { color: "rgba(255,255,255,0.3)" }]}>
                Add {type === "expense" ? "Expense" : "Income"}
                {amount ? " · ₦" + parseFloat(amount.replace(/,/g, "")).toLocaleString("en-NG") : ""}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  kavWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingHorizontal: 20,
  },
  sheetBorder: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.1)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  typeToggle: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14, padding: 4, marginBottom: 16, gap: 4,
  },
  typeBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  typeBtnActive: {},
  typeBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
  },
  typeBtnText: { fontSize: 14, fontWeight: "600" },
  amountRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginBottom: 12,
  },
  amountCurrency: { fontSize: 30, fontWeight: "700" },
  amountInput: { fontSize: 42, fontWeight: "800", minWidth: 80, textAlign: "center" },
  quickAmounts: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  quickChipText: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  fieldWrap: { gap: 8, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 0.8, textTransform: "uppercase" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 12,
  },
  descInput: { flex: 1, fontSize: 15, color: "#fff" },
  aiHint: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,217,192,0.15)", borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(0,217,192,0.3)",
  },
  aiHintText: { fontSize: 9, color: "#00D9C0", fontWeight: "700" },
  catHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  aiSuggestedText: { fontSize: 11, color: "#00D9C0", fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: "600" },
  impulseToggle: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  impulseToggleActive: { backgroundColor: "rgba(236,72,153,0.08)", borderColor: "rgba(236,72,153,0.3)" },
  impulseText: { flex: 1, fontSize: 13, fontWeight: "500" },
  impulseDot: { width: 12, height: 12, borderRadius: 6 },
  addBtn: { height: 54, borderRadius: 16, overflow: "hidden" },
  addBtnDisabled: { opacity: 0.5 },
  addBtnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  addBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});

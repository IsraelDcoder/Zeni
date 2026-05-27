import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotWidget } from "@/components/MascotWidget";
import { useApp } from "@/context/AppContext";
import type { CoachMessage } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const SUGGESTIONS = [
  "Where does my money go?",
  "How can I save more?",
  "Am I spending too much?",
  "What's my financial score?",
  "Help me stop impulse spending",
  "How do I start investing?",
];

function Bubble({ msg }: { msg: CoachMessage }) {
  const colors = useColors();
  const isAI = msg.role === "ai";
  return (
    <View style={[styles.bubble, isAI ? styles.bubbleLeft : styles.bubbleRight]}>
      {isAI && (
        <View style={styles.bubbleAvatar}>
          <LinearGradient
            colors={["#00D9C0", "#7B5CF7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>Z</Text>
        </View>
      )}
      <View
        style={[
          styles.bubbleBody,
          isAI
            ? [styles.bubbleBodyAI, { borderColor: "rgba(255,255,255,0.08)" }]
            : styles.bubbleBodyUser,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isAI ? colors.foreground : "#070D1A" },
          ]}
        >
          {msg.text}
        </Text>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { coachMessages, sendCoachMessage, mascotMood } = useApp();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const reversed = [...coachMessages].reverse();

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    await sendCoachMessage(msg);
    setSending(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#070D1A", "#091220", "#070D1A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <MascotWidget mood={mascotMood} size={42} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Zara
            </Text>
            <Text style={[styles.headerSub, { color: colors.primary }]}>
              AI Money Coach · Online
            </Text>
          </View>
        </View>
        <View style={[styles.onlineDot]} />
      </View>

      {/* Suggestions */}
      {coachMessages.length <= 1 && (
        <View style={styles.suggestionsWrap}>
          <FlatList
            horizontal
            data={SUGGESTIONS}
            keyExtractor={(i) => i}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestionChip}
                onPress={() => handleSend(item)}
              >
                <Text style={[styles.suggestionText, { color: colors.primary }]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={reversed}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <Bubble msg={item} />}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: "rgba(7,13,26,0.95)",
              paddingBottom: botPad + 8,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Zara anything about money..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={[
              styles.input,
              { backgroundColor: colors.input, color: colors.foreground },
            ]}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { opacity: input.trim().length > 0 && !sending ? 1 : 0.4 },
            ]}
            onPress={() => handleSend()}
            disabled={input.trim().length === 0 || sending}
          >
            <LinearGradient
              colors={["#00D9C0", "#00A896"]}
              style={styles.sendGrad}
            >
              <Feather
                name={sending ? "loader" : "send"}
                size={16}
                color="#070D1A"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D9C0",
  },
  suggestionsWrap: { paddingVertical: 12 },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: "rgba(0,217,192,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,217,192,0.25)",
  },
  suggestionText: { fontSize: 13, fontWeight: "500" },
  messagesList: { paddingHorizontal: 16, paddingTop: 8 },
  bubble: { marginBottom: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleLeft: { justifyContent: "flex-start" },
  bubbleRight: { justifyContent: "flex-end" },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  bubbleBody: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: 13,
  },
  bubbleBodyAI: {
    backgroundColor: "rgba(16,24,42,0.9)",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleBodyUser: {
    backgroundColor: "#00D9C0",
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42 },
  sendGrad: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});

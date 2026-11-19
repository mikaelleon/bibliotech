import { useRouter } from "expo-router";
import { Check, History, MessagesSquare, Send, Square, SquarePen, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssistantHistory } from "@/components/AssistantHistory";
import { AssistantText } from "@/components/AssistantText";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import {
  deleteChat,
  errorText,
  HISTORY_TURNS,
  loadChat,
  loadChats,
  loadQuota,
  MAX_CHARS,
  newChatId,
  streamAnswer,
  type ActionProposal,
  type ApiError,
  type ChatSummary,
  type Quota,
} from "@/lib/assistant";
import { createGroup, saveCollectionChoices } from "@/lib/collections";
import { useSession } from "@/lib/session";
import { colors, font, radius } from "@/theme/tokens";

const prompts = [
  "What is in the Science category?",
  "What books do you have by Charles Darwin?",
  "Suggest a Fiction book from the library",
];

type Message = {
  id: number;
  role: "user" | "model";
  text: string;
  error?: boolean;
  suggestions?: string[];
  actions?: ActionProposal[];
};

type ActionState = "running" | "done" | "failed" | "dismissed";

/**
 * Ask AI. A floating button opens a bottom sheet that streams answers from the web API
 * (POST /api/assistant). The app holds no Gemini key: it only sends the Supabase access token.
 * Visitors see a log-in prompt; verified accounts also get saved chats.
 */
export function AIAssistant() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const router = useRouter();
  const { session, setFavorite, setInLibrary } = useSession();

  const signedIn = session.kind === "user";
  const unverified = session.kind === "user" && !session.verified;
  // Saved chats are for verified accounts. Unverified accounts chat without saving.
  const canSave = session.kind === "user" && session.verified;
  const userId = session.kind === "user" ? session.id : null;

  const sheetHeight = Math.min(640, Math.round(height * 0.85));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const [view, setView] = useState<"chat" | "history">("chat");
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [translate] = useState(() => new Animated.Value(700));

  const chatRef = useRef<string | null>(null);
  // Which send owns the screen. Switching chats clears it, so a late answer can't touch the new chat.
  const activeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const stick = useRef(true);

  function close() {
    if (reduce) {
      setOpen(false);
      return;
    }
    Animated.timing(translate, {
      toValue: 700,
      duration: 200,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  }

  useEffect(() => {
    if (!open) return;
    if (reduce) {
      translate.setValue(0);
      return;
    }
    translate.setValue(700);
    Animated.timing(translate, {
      toValue: 0,
      duration: 250,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [open, reduce, translate]);

  // An answer still streaming when the sheet unmounts (leaving the tab) is stopped.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Remaining questions, loaded the first time the sheet opens.
  useEffect(() => {
    if (!open || !signedIn || quota) return;
    let cancelled = false;
    void loadQuota().then((next) => {
      if (!cancelled && next) setQuota(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, quota]);

  function setChat(id: string | null) {
    chatRef.current = id;
    setChatId(id);
  }

  /** Stops whatever is streaming and detaches it from the screen. */
  function detach() {
    activeRef.current = 0;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }

  function startNewChat() {
    detach();
    setMessages([]);
    setDraft("");
    setChat(null);
    setView("chat");
  }

  async function openHistory() {
    if (view === "history") {
      setView("chat");
      return;
    }
    setView("history");
    setChatsError(null);
    const list = await loadChats();
    if (list) setChats(list);
    else {
      setChats([]);
      setChatsError("We could not load your chats. Try again.");
    }
  }

  async function openChat(id: string) {
    detach();
    const stored = await loadChat(id);
    if (!stored) {
      setChatsError("We could not open that chat. Try again.");
      return;
    }
    setMessages(stored.map((m) => ({ id: nextId.current++, role: m.role, text: m.text })));
    setChat(id);
    setDraft("");
    stick.current = true;
    setView("chat");
  }

  async function deleteChats(id: string | "all") {
    const before = chats;
    setChatsError(null);
    setChats((list) => (list ? (id === "all" ? [] : list.filter((c) => c.id !== id)) : list));
    if (id === "all" || id === chatRef.current) {
      detach();
      setMessages([]);
      setChat(null);
    }
    if (!(await deleteChat(id))) {
      setChats(before);
      setChatsError("We could not delete that. Try again.");
    }
  }

  /**
   * Runs a change the reader confirmed. It goes through the same session and Supabase calls as the
   * heart and Library buttons, so row level security applies. The model never calls anything: it
   * only proposed this card.
   */
  async function runAction(action: ActionProposal) {
    if (!userId) return;
    setActionState((state) => ({ ...state, [action.id]: "running" }));
    let ok = false;
    try {
      const slug = action.slug ?? "";
      if (action.type === "add_library") ok = await setInLibrary(slug, true);
      else if (action.type === "remove_library") ok = await setInLibrary(slug, false);
      else if (action.type === "favorite") {
        setFavorite(slug, true);
        ok = true;
      } else if (action.type === "unfavorite") {
        setFavorite(slug, false);
        ok = true;
      } else if (action.type === "add_to_collection") {
        const result = await saveCollectionChoices(
          [slug],
          action.collectionId ? [action.collectionId] : [],
          action.collectionId ? "" : (action.collectionName ?? ""),
          userId,
          false,
        );
        ok = "ok" in result;
      } else if (action.type === "create_collection") {
        const result = await createGroup(userId, action.collectionName ?? "");
        ok = !("error" in result);
      }
    } catch {
      ok = false;
    }
    setActionState((state) => ({ ...state, [action.id]: ok ? "done" : "failed" }));
  }

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || streaming) return;

      const history = messages
        .filter((m, i) => !m.error && m.text && !messages[i + 1]?.error)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));
      const userMessageId = nextId.current++;
      const replyId = nextId.current++;
      // A new chat gets its id here, so a stopped first question still lands in the right chat.
      let sendChatId: string | null = null;
      if (canSave) {
        sendChatId = chatRef.current ?? newChatId();
        setChat(sendChatId);
      }
      activeRef.current = replyId;
      const alive = () => activeRef.current === replyId;
      setMessages((list) => [...list, { id: userMessageId, role: "user", text: message }, { id: replyId, role: "model", text: "" }]);
      setDraft("");
      stick.current = true;
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const patch = (change: (m: Message) => Message) =>
        setMessages((list) => list.map((m) => (m.id === replyId ? change(m) : m)));
      // A failed or stopped question goes back into the box, so nothing the reader typed is lost.
      const restore = () => {
        if (alive()) setDraft((current) => current || message);
      };
      const fail = (error: ApiError, status: number) => {
        patch((m) => ({ ...m, text: errorText(error, status), error: true }));
        if (status !== 401) restore();
      };

      try {
        const result = await streamAnswer(
          { message, history, chatId: sendChatId },
          (event) => {
            if (!alive()) return;
            if (event.event === "meta" || event.event === "done") {
              if (event.quota) setQuota(event.quota);
            } else if (event.event === "chat") {
              const saved: ChatSummary = { id: event.id, title: event.title, updatedAt: new Date().toISOString() };
              setChats((list) => (list ? [saved, ...list.filter((c) => c.id !== saved.id)] : list));
            } else if (event.event === "actions") {
              patch((m) => ({ ...m, actions: event.actions }));
            } else if (event.event === "suggestions") {
              patch((m) => ({ ...m, suggestions: event.suggestions }));
            } else if (event.event === "delta") {
              patch((m) => ({ ...m, text: m.text + event.text }));
            } else if (event.event === "error") {
              patch((m) => ({
                ...m,
                text: m.text ? `${m.text}\n\n${errorText(event.error, 500)}` : errorText(event.error, 500),
                error: !m.text,
              }));
            }
          },
          controller.signal,
        );
        if (!alive()) return;
        if (!result.ok) {
          fail(result.error, result.status);
        } else {
          patch((m) => (m.text ? m : { ...m, text: "I couldn't come up with an answer. Try asking another way.", error: true }));
          restore();
        }
      } catch (error) {
        if (!alive()) return;
        if ((error as { name?: string }).name !== "AbortError" && !controller.signal.aborted) {
          fail({ code: "upstream_error" }, 502);
        } else {
          patch((m) => (m.text ? m : { ...m, text: "Stopped.", error: true }));
          restore();
        }
      } finally {
        if (alive()) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [messages, streaming, canSave],
  );

  const left = quota ? Math.max(0, quota.limitToday - quota.usedToday) : null;
  const lastIndex = messages.length - 1;

  return (
    <>
      {open ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask AI"
          onPress={() => setOpen(true)}
          style={[styles.fab, { bottom: 64 + insets.bottom + 16 }]}
        >
          <MessagesSquare color={colors.ink} size={16} strokeWidth={1.5} />
          <Text style={styles.fabLabel}>Ask AI</Text>
        </Pressable>
      )}
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <KeyboardAvoidingView behavior="padding" style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close AI assistant"
            onPress={close}
            style={styles.scrim}
          />
          <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY: translate }] }]}>
            <View accessibilityElementsHidden style={styles.handle} />
            <View style={styles.sheetHead}>
              <View style={styles.titleRow}>
                <MessagesSquare color={colors.ink} size={20} strokeWidth={1.5} />
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  AI assistant
                </Text>
              </View>
              <View style={styles.headActions}>
                {canSave ? (
                  <>
                    <Pressable accessibilityRole="button" accessibilityLabel="New chat" onPress={startNewChat} style={styles.iconButton}>
                      <SquarePen color={colors.ink} size={18} strokeWidth={1.5} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Chat history"
                      accessibilityState={{ selected: view === "history" }}
                      onPress={() => void openHistory()}
                      style={styles.iconButton}
                    >
                      <History color={view === "history" ? colors.atext : colors.ink} size={18} strokeWidth={1.5} />
                    </Pressable>
                  </>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel="Close AI assistant" onPress={close} style={styles.iconButton}>
                  <X color={colors.ink} size={20} strokeWidth={1.5} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={64}
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                stick.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
              }}
              // Follow the answer only while the reader is at the bottom. Scrolling up stops the pull.
              onContentSizeChange={() => {
                if (stick.current) scrollRef.current?.scrollToEnd({ animated: false });
              }}
            >
              {view === "history" ? (
                <AssistantHistory
                  chats={chats}
                  error={chatsError}
                  activeId={chatId}
                  onOpen={(id) => void openChat(id)}
                  onDelete={(id) => void deleteChats(id)}
                  onDeleteAll={() => void deleteChats("all")}
                />
              ) : messages.length === 0 ? (
                <>
                  <Text style={styles.note}>
                    Ask about books, authors and what this library has, or for a pick for your next read.
                  </Text>
                  {signedIn ? (
                    <>
                      <Text style={styles.try}>Try asking</Text>
                      {prompts.map((prompt) => (
                        <Pressable
                          key={prompt}
                          accessibilityRole="button"
                          accessibilityLabel={prompt}
                          onPress={() => setDraft(prompt)}
                          style={styles.prompt}
                        >
                          <Text style={styles.promptLabel}>{prompt}</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : null}
                </>
              ) : (
                <View style={styles.thread}>
                  {messages.map((m, index) => {
                    const last = index === lastIndex;
                    const visibleActions = m.actions?.filter((a) => actionState[a.id] !== "dismissed") ?? [];
                    return (
                      <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleModel]}>
                        {m.role === "user" ? (
                          <Text style={[styles.bubbleText, { color: colors.onPrimary }]}>{m.text}</Text>
                        ) : m.error ? (
                          <Text style={[styles.bubbleText, styles.errorText]}>{m.text}</Text>
                        ) : (
                          <AssistantText text={m.text} caret={streaming && last ? "▍" : null} />
                        )}
                        {visibleActions.length > 0 && !(last && streaming) ? (
                          <View style={styles.cards}>
                            {visibleActions.map((action) => {
                              const state = actionState[action.id];
                              return (
                                <View key={action.id} style={styles.card}>
                                  <Text style={styles.cardLabel}>{action.label}</Text>
                                  {state === "done" ? (
                                    <View style={styles.doneRow}>
                                      <Check color={colors.muted} size={14} strokeWidth={1.5} />
                                      <Text style={styles.cardMuted}>Done</Text>
                                    </View>
                                  ) : (
                                    <>
                                      {state === "failed" ? <Text style={[styles.cardMuted, { marginTop: 4 }]}>That didn’t work. Try again.</Text> : null}
                                      <View style={styles.cardButtons}>
                                        <Pressable
                                          accessibilityRole="button"
                                          disabled={state === "running"}
                                          onPress={() => void runAction(action)}
                                          style={[styles.cardPrimary, state === "running" && { opacity: 0.5 }]}
                                        >
                                          <Text style={styles.cardPrimaryLabel}>
                                            {state === "running" ? "Working…" : state === "failed" ? "Try again" : "Confirm"}
                                          </Text>
                                        </Pressable>
                                        <Pressable
                                          accessibilityRole="button"
                                          disabled={state === "running"}
                                          onPress={() => setActionState((current) => ({ ...current, [action.id]: "dismissed" }))}
                                          style={styles.cardOutline}
                                        >
                                          <Text style={styles.cardOutlineLabel}>Not now</Text>
                                        </Pressable>
                                      </View>
                                    </>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                        {last && !streaming && m.suggestions?.length ? (
                          <View style={styles.pills}>
                            {m.suggestions.map((item) => (
                              <Pressable
                                key={item}
                                accessibilityRole="button"
                                onPress={() => void send(item)}
                                style={styles.pill}
                              >
                                <Text style={styles.pillLabel}>{item}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <Text accessibilityLiveRegion="polite" style={styles.srOnly}>
              {streaming ? "The assistant is answering." : messages.at(-1)?.role === "model" && messages.at(-1)?.text ? "Answer ready." : ""}
            </Text>

            {signedIn && view === "chat" ? (
              <View style={[styles.composer, { paddingBottom: 16 + insets.bottom }]}>
                <View style={styles.composerRow}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Ask about a book"
                    placeholderTextColor={colors.muted}
                    accessibilityLabel="Message the assistant"
                    maxLength={MAX_CHARS}
                    returnKeyType="send"
                    submitBehavior="submit"
                    onSubmitEditing={() => void send(draft)}
                    style={styles.message}
                  />
                  {streaming ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Stop answer"
                      onPress={() => abortRef.current?.abort()}
                      style={styles.send}
                    >
                      <Square color={colors.onPrimary} size={16} strokeWidth={1.5} />
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Send message"
                      accessibilityState={{ disabled: !draft.trim() }}
                      disabled={!draft.trim()}
                      onPress={() => void send(draft)}
                      style={[styles.send, !draft.trim() && { opacity: 0.5 }]}
                    >
                      <Send color={colors.onPrimary} size={16} strokeWidth={1.5} />
                    </Pressable>
                  )}
                </View>
                <Text style={styles.hint}>
                  {left !== null && quota ? `${left} of ${quota.limitToday} questions left today. ` : ""}
                  Don’t share personal info. Answers may be inaccurate.
                </Text>
                {unverified ? (
                  <Text style={styles.hint}>Verify your email to save your chats and get 20 questions a day.</Text>
                ) : null}
              </View>
            ) : !signedIn ? (
              <View style={[styles.composer, { paddingBottom: 16 + insets.bottom }]}>
                <Text style={styles.note}>
                  <Text
                    accessibilityRole="link"
                    onPress={() => {
                      close();
                      router.push("/login");
                    }}
                    style={styles.link}
                  >
                    Log in
                  </Text>{" "}
                  to ask the assistant.
                </Text>
              </View>
            ) : (
              <View style={{ height: insets.bottom }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 8,
  },
  fabLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  modal: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  handle: { width: 48, height: 4, borderRadius: radius.pill, backgroundColor: colors.line, alignSelf: "center", marginTop: 8 },
  sheetHead: {
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontFamily: font.medium, fontSize: 20, lineHeight: 28, color: colors.ink },
  headActions: { flexDirection: "row", alignItems: "center" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetBody: { flex: 1 },
  sheetBodyContent: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  link: { color: colors.atext, textDecorationLine: "underline" },
  try: { marginTop: 16, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  prompt: { minHeight: 44, justifyContent: "center" },
  promptLabel: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  thread: { gap: 12 },
  bubble: { maxWidth: "85%", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleModel: { alignSelf: "flex-start", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  bubbleText: { fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  errorText: { color: colors.muted, fontStyle: "italic" },
  cards: { marginTop: 12, gap: 8 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 12 },
  cardLabel: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.ink },
  cardMuted: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  doneRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  cardButtons: { marginTop: 8, flexDirection: "row", gap: 8 },
  cardPrimary: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPrimaryLabel: { fontFamily: font.medium, fontSize: 12, color: colors.onPrimary },
  cardOutline: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cardOutlineLabel: { fontFamily: font.medium, fontSize: 12, color: colors.ink },
  pills: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  pillLabel: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.ink },
  srOnly: { position: "absolute", width: 1, height: 1, opacity: 0 },
  composer: { padding: 16 },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  message: {
    flex: 1,
    height: 44,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    fontFamily: font.sans,
    fontSize: 14,
    color: colors.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { marginTop: 8, fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
});

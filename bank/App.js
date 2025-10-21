import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { v4 as uuidv4 } from "uuid";

/* CONFIG: reemplaza esto por la IP de tu máquina en la red local
   macOS / Linux: run `ip addr` o `ifconfig` para obtener algo como 192.168.x.y
   Windows: run `ipconfig`
*/
const SERVER_HOST = "192.168.1.42"; // <- cambia esto por tu IP local
const API_HOST = Platform.OS === "web" ? "http://localhost:3002" : `http://${SERVER_HOST}:3002`;
const WS_URL = Platform.OS === "web" ? "ws://localhost:4001" : `ws://${SERVER_HOST}:4001`;

export default function App() {
  const [fromAccount, setFromAccount] = useState("alice-001");
  const [toAccount, setToAccount] = useState("bob-001");
  const [amount, setAmount] = useState("10.00");
  const [currency, setCurrency] = useState("USD");
  const [userId, setUserId] = useState("user-1");
  const [eventsByTxn, setEventsByTxn] = useState({}); // { txnId: [envelope,...] }

  const wsRef = useRef(null);
  const connectedRef = useRef(false);
  const retryRef = useRef(0);

  const startWs = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
        retryRef.current = 0;
        // Al conectar (o reconectar), suscríbete al usuario y a todas las transacciones existentes en la UI
        const subscriptions = [
          { type: "subscribe", userId },
          ...Object.keys(eventsByTxn).map(transactionId => ({ type: "subscribe", transactionId }))
        ];
        for (const msg of subscriptions) {
          try { ws.send(JSON.stringify(msg)); } catch {}
        }
        console.log("WS open ->", WS_URL);
      };

      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed?.type === "event" && parsed.data?.transactionId) {
            const envelope = parsed.data;
            const txnId = envelope.transactionId;
            setEventsByTxn((prev) => {
              const arr = prev[txnId] ? [...prev[txnId]] : [];
              if (!arr.find((e) => e.id === envelope.id)) {
                arr.push(envelope);
                arr.sort((a, b) => a.ts - b.ts);
              }
              return { ...prev, [txnId]: arr };
            });
          } else {
            console.log("WS msg:", parsed);
          }
        } catch (e) {
          console.warn("Invalid WS message", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("WS error", err);
      };

      ws.onclose = () => {
        connectedRef.current = false;
        const next = Math.min(30000, 1000 * 2 ** (retryRef.current || 0));
        retryRef.current += 1;
        console.log(`WS closed — reconnect in ${next}ms`);
        setTimeout(() => startWs(), next);
      };
    } catch (e) {
      console.warn("Failed to start WS", e);
      setTimeout(() => startWs(), 2000);
    }
  }, [userId, eventsByTxn]); // Ahora también depende de las transacciones existentes

  useEffect(() => {
    startWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWs]); // Ahora depende de la función memoizada

  async function submitTransaction() {
    const transactionId = uuidv4();
    const payload = {
      transactionId,
      fromAccount,
      toAccount,
      amount: parseFloat(amount),
      currency,
      userId,
    };

    try {
      const res = await fetch(`${API_HOST}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        Alert.alert("Error creating transaction", `${res.status} ${text}`);
        return;
      }

      // --- CAMBIO CLAVE ---
      // Añade la transacción a la lista de forma optimista para que aparezca en la UI.
      // El timeline aparecerá con "(sin eventos aún)" hasta que lleguen por WebSocket.
      setEventsByTxn((prev) => ({ ...prev, [transactionId]: [] }));

      if (connectedRef.current && wsRef.current) {
        try { wsRef.current.send(JSON.stringify({ type: "subscribe", transactionId })); } catch {}
      }

      Alert.alert("Transaction sent", `transactionId: ${transactionId}`);
    } catch (e) {
      Alert.alert("Network error", String(e));
    }
  }

  const header = useMemo(
    () => (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.header}>Iniciar Transacción</Text>

        <Text>userId</Text>
        <TextInput value={userId} onChangeText={setUserId} style={styles.input} />

        <Text>From Account</Text>
        <TextInput value={fromAccount} onChangeText={setFromAccount} style={styles.input} />

        <Text>To Account</Text>
        <TextInput value={toAccount} onChangeText={setToAccount} style={styles.input} />

        <Text>Amount</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />

        <Text>Currency</Text>
        <TextInput value={currency} onChangeText={setCurrency} style={styles.input} />

        <View style={styles.button}>
          <Button title="Iniciar Transacción" onPress={submitTransaction} />
        </View>

        <Text style={styles.header}>Timelines</Text>
      </KeyboardAvoidingView>
    ),
    [userId, fromAccount, toAccount, amount, currency]
  );

  const renderTimeline = ({ item: txnId }) => {
    const events = eventsByTxn[txnId] || [];
    return (
      <View style={styles.txnCard}>
        <Text style={styles.txnTitle}>Txn: {txnId}</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>(sin eventos aún)</Text>
        ) : (
          events.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventType}>{ev.type}</Text>
              <Text style={styles.eventTs}>{new Date(ev.ts).toLocaleTimeString()}</Text>
              <Text style={styles.eventPayload}>{JSON.stringify(ev.payload)}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={Object.keys(eventsByTxn).sort()}
        renderItem={renderTimeline}
        keyExtractor={(k) => k}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 12 }}>(sin transacciones aún)</Text>}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { fontSize: 18, fontWeight: "700", marginVertical: 10, paddingHorizontal: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 8, marginBottom: 8, borderRadius: 4, marginHorizontal: 16 },
  button: { marginVertical: 12, marginHorizontal: 16 },
  txnCard: { padding: 10, borderWidth: 1, borderColor: "#eee", borderRadius: 6, marginBottom: 10, marginHorizontal: 16 },
  txnTitle: { fontWeight: "700" },
  eventRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f3f3f3" },
  eventType: { fontWeight: "600" },
  eventTs: { color: "#666", fontSize: 11 },
  eventPayload: { fontSize: 12, color: "#111" },
  noEvents: { color: "#999", fontStyle: "italic" },
});

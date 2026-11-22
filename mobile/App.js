import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  ActivityIndicator,
  Text,
  StatusBar,
  Platform,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { registerRootComponent } from "expo";

// Replace with your local machine's Wi-Fi IP address if it changes
const DEFAULT_URL = "http://192.168.1.9:5173";

export default function App() {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleReload = () => {
    setError(null);
    setLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="auto" />
      <View style={styles.content}>
        <WebView
          ref={webViewRef}
          source={{ uri: DEFAULT_URL }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            setError(
              nativeEvent.description || "Could not connect to the Echoes server."
            );
            setLoading(false);
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#16845B" />
              <Text style={styles.loadingText}>Opening Echoes...</Text>
            </View>
          )}
        />

        {error && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Cannot Reach Echoes</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Text style={styles.errorHint}>
                Target URL: {DEFAULT_URL}{"\n\n"}
                Please ensure your phone and computer are on the same Wi-Fi network and Vite is running.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleReload}
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#66706A",
    fontWeight: "500",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 20,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#DC4C3E",
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: "#18201C",
    marginBottom: 8,
    lineHeight: 18,
  },
  errorHint: {
    fontSize: 12,
    color: "#66706A",
    lineHeight: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#16845B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

registerRootComponent(App);

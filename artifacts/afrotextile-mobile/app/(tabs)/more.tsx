import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SIDE_PADDING = 16;

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : 0;

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields before sending.");
      return;
    }
    Alert.alert(
      "Message sent!",
      "Thank you for reaching out. We'll get back to you within 24 hours.",
      [{ text: "OK", onPress: () => { setContactName(""); setContactEmail(""); setContactMessage(""); } }]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gold }]}>About Afrotextile</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.aboutText, { color: colors.foreground }]}>
            Afrotextile is a global marketplace celebrating the richness of African fashion — from hand-woven Kente and vibrant Ankara to artisanal Mudcloth and natural Adire.
          </Text>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            We connect independent African designers and artisans with fashion lovers worldwide, preserving cultural heritage while elevating it to the global stage.
          </Text>
        </View>

        <InfoRow icon="location-outline" label="Founded" value="Lagos, Nigeria · 2022" />
        <InfoRow icon="globe-outline" label="Reach" value="40+ African designers across 15 countries" />
        <InfoRow icon="shirt-outline" label="Fabrics" value="Ankara, Kente, Mudcloth, Aso-Oke, Adire & more" />
      </View>

      {/* Vendor CTA */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gold }]}>Sell with Us</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            Are you an African designer or artisan? Join our growing community and reach customers worldwide.
          </Text>
          <Pressable
            style={[styles.vendorBtn, { backgroundColor: colors.terracotta, borderRadius: colors.radius }]}
            onPress={() => router.push("/vendor-onboard")}
          >
            <Ionicons name="storefront-outline" size={18} color={colors.accentForeground} />
            <Text style={[styles.vendorBtnText, { color: colors.accentForeground }]}>
              Apply as a Vendor
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gold }]}>Contact Us</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <InfoRow icon="mail-outline" label="Email" value="hello@afrotextile.com" />
          <InfoRow icon="call-outline" label="Phone" value="+234 800 AFROTEX" />
          <InfoRow icon="time-outline" label="Hours" value="Mon–Fri, 9am–6pm WAT" />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Send a message</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            value={contactName}
            onChangeText={setContactName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            placeholder="Your message..."
            placeholderTextColor={colors.mutedForeground}
            value={contactMessage}
            onChangeText={setContactMessage}
            multiline
            numberOfLines={4}
          />
          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={handleContactSubmit}
          >
            <Ionicons name="send-outline" size={16} color={colors.primaryForeground} />
            <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Send Message</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SIDE_PADDING, gap: 8 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: "500" as const },
  vendorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  vendorBtnText: { fontSize: 15, fontWeight: "700" as const },
  divider: { height: 1, marginVertical: 4 },
  formTitle: { fontSize: 16, fontWeight: "600" as const },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textarea: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    height: 100,
    textAlignVertical: "top" as const,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700" as const },
});

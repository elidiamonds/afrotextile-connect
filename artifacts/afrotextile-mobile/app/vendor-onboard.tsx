import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

const fabricOptions = ["Ankara", "Kente", "Mudcloth", "Aso-Oke", "Adire", "Kitenge", "Shweshwe", "Other"];

export default function VendorOnboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    country: "",
    city: "",
    description: "",
    website: "",
    instagram: "",
  });
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);

  const update = (key: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFabric = (fabric: string) => {
    setSelectedFabrics((prev) =>
      prev.includes(fabric) ? prev.filter((f) => f !== fabric) : [...prev, fabric]
    );
  };

  const handleSubmit = () => {
    if (!form.businessName || !form.ownerName || !form.email || !form.country) {
      Alert.alert("Required fields", "Please fill in Business Name, Your Name, Email, and Country.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Application Submitted!",
      "Thank you for applying to Afrotextile. Our team will review your application and reach out within 3–5 business days.",
      [{ text: "Done", onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Vendor Application</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Join our community of African designers and reach customers worldwide. Tell us about your brand.
        </Text>

        {/* Business Info */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>BUSINESS INFORMATION</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Business Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="e.g. Adunni Couture"
              placeholderTextColor={colors.mutedForeground}
              value={form.businessName}
              onChangeText={update("businessName")}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Your Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="Full name"
              placeholderTextColor={colors.mutedForeground}
              value={form.ownerName}
              onChangeText={update("ownerName")}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email Address *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="you@brand.com"
              placeholderTextColor={colors.mutedForeground}
              value={form.email}
              onChangeText={update("email")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Country *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
                placeholder="Nigeria"
                placeholderTextColor={colors.mutedForeground}
                value={form.country}
                onChangeText={update("country")}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>City</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
                placeholder="Lagos"
                placeholderTextColor={colors.mutedForeground}
                value={form.city}
                onChangeText={update("city")}
              />
            </View>
          </View>
        </View>

        {/* Fabrics */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>FABRIC SPECIALTIES</Text>
          <View style={styles.fabricGrid}>
            {fabricOptions.map((fabric) => {
              const selected = selectedFabrics.includes(fabric);
              return (
                <Pressable
                  key={fabric}
                  style={[
                    styles.fabricChip,
                    {
                      backgroundColor: selected ? colors.gold : colors.muted,
                      borderColor: selected ? colors.gold : colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={() => toggleFabric(fabric)}
                >
                  <Text style={[styles.fabricText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                    {fabric}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Brand Story */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>YOUR BRAND STORY</Text>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Describe your brand</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="Tell us about your designs, inspiration, and craftsmanship..."
              placeholderTextColor={colors.mutedForeground}
              value={form.description}
              onChangeText={update("description")}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Social / Web */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>ONLINE PRESENCE</Text>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Website</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="https://yourbrand.com"
              placeholderTextColor={colors.mutedForeground}
              value={form.website}
              onChangeText={update("website")}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Instagram</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="@yourbrand"
              placeholderTextColor={colors.mutedForeground}
              value={form.instagram}
              onChangeText={update("instagram")}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
          onPress={handleSubmit}
        >
          <Ionicons name="storefront-outline" size={20} color={colors.primaryForeground} />
          <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
            Submit Application
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" as const },
  content: { padding: SIDE_PADDING, gap: 24 },
  intro: { fontSize: 15, lineHeight: 22 },
  formSection: { gap: 14 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
  },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500" as const },
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
    height: 110,
    textAlignVertical: "top" as const,
  },
  row: { flexDirection: "row", gap: 10 },
  fabricGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  fabricChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  fabricText: { fontSize: 13, fontWeight: "500" as const },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
    marginTop: 8,
  },
  submitBtnText: { fontSize: 17, fontWeight: "700" as const },
});

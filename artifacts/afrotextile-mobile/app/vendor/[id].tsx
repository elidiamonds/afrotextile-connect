import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { products, vendorImages, vendors } from "@/constants/mockData";
import { ProductCard } from "@/components/ProductCard";

const CARD_GAP = 12;

export default function VendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const vendor = vendors.find((v) => v.id === id);
  const vendorProducts = products.filter((p) => p.vendorId === id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!vendor) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Vendor not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        key="vendor-2col"
        data={vendorProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={vendorProducts.length > 0}
        ListHeaderComponent={
          <View style={styles.vendorHeader}>
            {/* Back */}
            <Pressable style={[styles.backBtn, { top: topPad + 8 }]} onPress={() => router.back()}>
              <View style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </View>
            </Pressable>

            <Image
              source={vendorImages[vendor.logoKey]}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={[styles.vendorInfo, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[styles.vendorName, { color: colors.foreground }]}>{vendor.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.location, { color: colors.mutedForeground }]}>{vendor.location}</Text>
              </View>
              <Text style={[styles.vendorDesc, { color: colors.mutedForeground }]}>{vendor.description}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{vendor.rating}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rating</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Ionicons name="shirt-outline" size={14} color={colors.gold} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{vendor.productCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Products</Text>
                </View>
              </View>
            </View>
            {vendorProducts.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Collection ({vendorProducts.length})
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shirt-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard product={item} width={(CARD_GAP * 2 + 32 - CARD_GAP) / 2} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: 220 },
  vendorHeader: { position: "relative", marginBottom: 16 },
  vendorInfo: {
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
  },
  vendorName: { fontSize: 22, fontWeight: "700" as const },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  location: { fontSize: 13 },
  vendorDesc: { fontSize: 14, lineHeight: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 15, fontWeight: "700" as const },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600" as const, marginBottom: 4, paddingHorizontal: 0 },
  row: { gap: CARD_GAP, justifyContent: "space-between" },
  empty: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 15 },
});

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { useColors } from "@/hooks/useColors";
import { useWishlist } from "@/contexts/WishlistContext";

const CARD_GAP = 12;
const SIDE_PADDING = 16;

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items } = useWishlist();
  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Wishlist</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </Text>
      </View>

      <FlatList
        key="wishlist-2col"
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={items.length > 0}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nothing saved yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Tap the heart on any piece to save it here
            </Text>
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
  header: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  count: {
    fontSize: 14,
    marginTop: 2,
  },
  grid: {
    padding: SIDE_PADDING,
  },
  row: {
    gap: CARD_GAP,
    justifyContent: "space-between",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
  },
});

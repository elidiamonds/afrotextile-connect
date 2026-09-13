import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { categories, products } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

const CARD_GAP = 12;
const SIDE_PADDING = 16;

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        search.length === 0 ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.vendor.toLowerCase().includes(search.toLowerCase()) ||
        p.fabricType.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [search, selectedCategory]);

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.brandLockup} accessibilityLabel="Afrotextile">
          <Image
            source={require("@/assets/brand/threaded-a-compact.png")}
            style={styles.brandMark}
            accessibilityLabel="Afrotextile Threaded A mark"
          />
          <Text style={[styles.logo, { color: colors.foreground }]}>AFROTEXTILE</Text>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search styles, fabrics, designers..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        {categories.map((cat) => {
          const active = cat === selectedCategory;
          return (
            <Pressable
              key={cat}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? colors.gold : colors.muted,
                  borderColor: active ? colors.gold : colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.catText,
                  { color: active ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Product Grid */}
      <FlatList
        key="grid-2col"
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No items found
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProductCard product={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: 2.6,
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 32,
  },
  brandMark: {
    width: 32,
    height: 32,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  categories: {
    paddingHorizontal: SIDE_PADDING,
    paddingVertical: 10,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  catText: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  grid: {
    padding: SIDE_PADDING,
  },
  row: {
    gap: CARD_GAP,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});

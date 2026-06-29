import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { productImages, products } from "@/constants/mockData";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.foreground }]}>Product not found</Text>
      </View>
    );
  }

  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (!selectedSize) {
      Alert.alert("Select a size", "Please choose your size before adding to cart.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart(product, selectedSize);
    Alert.alert("Added to cart!", `${product.name} (${selectedSize}) is in your cart.`);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button overlay */}
      <View style={[styles.backBtn, { top: topPad + 8 }]}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleWishlist(product);
          }}
        >
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={22}
            color={wishlisted ? colors.terracotta : "#fff"}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }}
      >
        {/* Product Image */}
        <Image
          source={productImages[product.imageKey]}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Product Info */}
        <View style={styles.infoSection}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {product.isNew && (
              <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>NEW</Text>
              </View>
            )}
            {product.isTrending && (
              <View style={[styles.badge, { backgroundColor: colors.terracotta }]}>
                <Text style={[styles.badgeText, { color: colors.accentForeground }]}>TRENDING</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{product.fabricType}</Text>
            </View>
          </View>

          {/* Vendor */}
          <Pressable onPress={() => router.push(`/vendor/${product.vendorId}`)}>
            <Text style={[styles.vendorLink, { color: colors.gold }]}>
              {product.vendor} ›
            </Text>
          </Pressable>

          <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= Math.floor(product.rating) ? "star" : "star-outline"}
                size={14}
                color={colors.gold}
              />
            ))}
            <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
              {product.rating} · {product.reviews} reviews
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.gold }]}>${product.price}</Text>
            {product.originalPrice && (
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                ${product.originalPrice}
              </Text>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Size Selector */}
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            Select Size {selectedSize ? `· ${selectedSize}` : ""}
          </Text>
          <View style={styles.sizes}>
            {product.sizes.map((size) => {
              const active = selectedSize === size;
              return (
                <Pressable
                  key={size}
                  style={[
                    styles.sizeChip,
                    {
                      backgroundColor: active ? colors.gold : colors.muted,
                      borderColor: active ? colors.gold : colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text style={[styles.sizeText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                    {size}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>About this piece</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {product.description}
          </Text>

          {/* Category */}
          <View style={styles.metaRow}>
            <Ionicons name="pricetag-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{product.category}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
      >
        <Pressable
          style={[
            styles.addToCartBtn,
            { backgroundColor: selectedSize ? colors.gold : colors.muted, borderRadius: colors.radius },
          ]}
          onPress={handleAddToCart}
        >
          <Ionicons name="bag-add-outline" size={20} color={selectedSize ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[styles.addToCartText, { color: selectedSize ? colors.primaryForeground : colors.mutedForeground }]}>
            {selectedSize ? `Add to Cart · $${product.price}` : "Select a Size"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 18 },
  backBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: { width: "100%", aspectRatio: 3 / 4 },
  infoSection: { padding: 16, gap: 10 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" as const },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 0.5 },
  vendorLink: { fontSize: 14, fontWeight: "600" as const },
  productName: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, marginLeft: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontSize: 28, fontWeight: "800" as const },
  originalPrice: { fontSize: 18, textDecorationLine: "line-through" as const },
  divider: { height: 1, marginVertical: 4 },
  sectionLabel: { fontSize: 16, fontWeight: "600" as const },
  sizes: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 50,
    alignItems: "center",
  },
  sizeText: { fontSize: 13, fontWeight: "600" as const },
  description: { fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  addToCartText: { fontSize: 16, fontWeight: "700" as const },
});

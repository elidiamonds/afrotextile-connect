import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Product, productImages } from "@/constants/mockData";
import { useWishlist } from "@/contexts/WishlistContext";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const colors = useColors();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const handleWishlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleWishlist(product);
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={[styles.imageContainer, { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius }]}>
        <Image
          source={productImages[product.imageKey]}
          style={styles.image}
          resizeMode="cover"
        />
        {(product.isNew || product.isTrending) && (
          <View style={[styles.badge, { backgroundColor: product.isNew ? colors.gold : colors.terracotta }]}>
            <Text style={[styles.badgeText, { color: product.isNew ? colors.primaryForeground : colors.accentForeground }]}>
              {product.isNew ? "NEW" : "HOT"}
            </Text>
          </View>
        )}
        <Pressable style={styles.wishlistBtn} onPress={handleWishlist} hitSlop={8}>
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={20}
            color={wishlisted ? colors.terracotta : colors.ivory}
          />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={[styles.vendorText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {product.vendor}
        </Text>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.gold }]}>${product.price}</Text>
          {product.originalPrice && (
            <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
              ${product.originalPrice}
            </Text>
          )}
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.gold} />
          <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
            {product.rating} ({product.reviews})
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  wishlistBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 10,
    gap: 3,
  },
  vendorText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  name: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: "line-through" as const,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
  },
});

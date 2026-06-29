import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
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
import { useCart } from "@/contexts/CartContext";
import { productImages } from "@/constants/mockData";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const topPad = Platform.OS === "web" ? 67 : 0;

  const handleCheckout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Order Placed!",
      `Thank you! Your order of ${totalItems} item${totalItems !== 1 ? "s" : ""} for $${totalPrice.toFixed(2)} has been placed.`,
      [{ text: "OK", onPress: clearCart }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        {items.length > 0 && (
          <Pressable onPress={clearCart}>
            <Text style={[styles.clearBtn, { color: colors.mutedForeground }]}>Clear all</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Browse the shop and add pieces you love
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.list,
              { paddingBottom: insets.bottom + 160 + (Platform.OS === "web" ? 34 : 0) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <View
                key={`${item.product.id}-${item.size}`}
                style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <Image
                  source={productImages[item.product.imageKey]}
                  style={[styles.itemImage, { borderRadius: colors.radius - 2 }]}
                  resizeMode="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemVendor, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.product.vendor}
                  </Text>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.itemSize, { color: colors.mutedForeground }]}>
                    Size: {item.size}
                  </Text>
                  <View style={styles.itemBottom}>
                    <Text style={[styles.itemPrice, { color: colors.gold }]}>
                      ${(item.product.price * item.quantity).toFixed(0)}
                    </Text>
                    <View style={styles.qtyRow}>
                      <Pressable
                        style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 6 }]}
                        onPress={() => updateQuantity(item.product.id, item.size, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={16} color={colors.foreground} />
                      </Pressable>
                      <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                      <Pressable
                        style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 6 }]}
                        onPress={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>
                </View>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removeFromCart(item.product.id, item.size)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Checkout Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 16),
              },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Text>
              <Text style={[styles.totalPrice, { color: colors.foreground }]}>
                ${totalPrice.toFixed(2)}
              </Text>
            </View>
            <Pressable
              style={[styles.checkoutBtn, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
              onPress={handleCheckout}
            >
              <Text style={[styles.checkoutText, { color: colors.primaryForeground }]}>
                Checkout · ${totalPrice.toFixed(2)}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { fontSize: 28, fontWeight: "700" as const },
  clearBtn: { fontSize: 14 },
  list: { padding: 16, gap: 12 },
  cartItem: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  itemImage: { width: 80, height: 100 },
  itemInfo: { flex: 1, gap: 3 },
  itemVendor: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  itemName: { fontSize: 14, fontWeight: "600" as const, lineHeight: 18 },
  itemSize: { fontSize: 12 },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: "700" as const },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 15, fontWeight: "600" as const, minWidth: 20, textAlign: "center" as const },
  removeBtn: { padding: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14 },
  totalPrice: { fontSize: 20, fontWeight: "700" as const },
  checkoutBtn: { paddingVertical: 16, alignItems: "center" },
  checkoutText: { fontSize: 16, fontWeight: "700" as const },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: { fontSize: 20, fontWeight: "600" as const, textAlign: "center" as const },
  emptySubtitle: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
});

// Cart disimpan di localStorage per session customer
const KEY = "sibvet_cart";

export const getCart = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
};

export const addToCart = (service) => {
  const cart = getCart();
  if (!cart.find(i => i.id === service.id)) {
    cart.push(service);
    localStorage.setItem(KEY, JSON.stringify(cart));
  }
  return cart;
};

export const removeFromCart = (id) => {
  const cart = getCart().filter(i => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
};

export const clearCart = () => localStorage.removeItem(KEY);

export const isInCart = (id) => getCart().some(i => i.id === id);

export const getCartCount = () => getCart().length;
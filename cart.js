const WHATSAPP_NUMBER = "16465381517";
const CART_KEY = "sweet_girl_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function findProduct(id) {
  for (const category of Object.keys(PRODUCTS)) {
    const product = PRODUCTS[category].find((item) => item.id === id);
    if (product) return product;
  }

  return null;
}

function addToCart(id, size = null) {
  const cart = getCart();
  const lineId = size ? `${id}__${size}` : id;
  const line = cart.find((item) => item.lineId === lineId);

  if (line) {
    line.quantity += 1;
  } else {
    cart.push({
      id,
      size,
      lineId,
      quantity: 1,
    });
  }

  saveCart(cart);
  flashAddedButton(id);
  openCart();
}

function changeQuantity(lineId, amount) {
  const cart = getCart();
  const line = cart.find((item) => item.lineId === lineId);

  if (!line) return;

  line.quantity += amount;

  if (line.quantity <= 0) {
    removeFromCart(lineId);
    return;
  }

  saveCart(cart);
}

function removeFromCart(lineId) {
  saveCart(getCart().filter((line) => line.lineId !== lineId));
}

function cartCount(cart) {
  return cart.reduce((total, line) => total + line.quantity, 0);
}

function cartTotal(cart) {
  return cart.reduce((total, line) => {
    const product = findProduct(line.id);
    return total + (product ? product.price * line.quantity : 0);
  }, 0);
}

function flashAddedButton(id) {
  const button = document.querySelector(
    `.add-btn[data-id="${CSS.escape(id)}"]`,
  );

  if (!button) return;

  const text = button.textContent;
  button.textContent = "Agregado ✓";
  button.classList.add("added");

  setTimeout(() => {
    button.textContent = text;
    button.classList.remove("added");
  }, 1200);
}

function renderCart() {
  const cart = getCart();
  const itemsElement = document.getElementById("cartItems");
  const totalElement = document.getElementById("cartTotal");
  const sendButton = document.getElementById("cartSendBtn");

  document.querySelectorAll(".cart-count").forEach((element) => {
    const items = cartCount(cart);
    element.textContent = items;
    element.style.display = items ? "flex" : "none";
  });

  if (!itemsElement) return;

  const validLines = cart.filter((line) => findProduct(line.id));

  if (!validLines.length) {
    itemsElement.innerHTML = `
      <div class="cart-empty">
        <p class="brand">Sweet <span>Girl</span></p>
        <p>Tu carrito está vacío.<br>Agrega tus productos favoritos.</p>
      </div>
    `;

    totalElement.textContent = "$0.00";
    sendButton.disabled = true;
    return;
  }

  itemsElement.innerHTML = validLines
    .map((line) => {
      const product = findProduct(line.id);

      const image = product.img
        ? `<img src="${product.img}" alt="${product.name}">`
        : `<span>${product.name.charAt(0)}</span>`;

      return `
        <div class="cart-line">
          <div class="line-media">${image}</div>

          <div class="line-info">
            <h5>
              ${product.name}
              ${line.size ? `<small> · ${line.size}</small>` : ""}
            </h5>

            <div class="line-qty">
              <button class="qty-btn" onclick="changeQuantity('${line.lineId}', -1)">−</button>
              <span>${line.quantity}</span>
              <button class="qty-btn" onclick="changeQuantity('${line.lineId}', 1)">+</button>
            </div>

            <button class="line-remove" onclick="removeFromCart('${line.lineId}')">
              Quitar
            </button>
          </div>

          <strong class="line-price">
            $${(product.price * line.quantity).toFixed(2)}
          </strong>
        </div>
      `;
    })
    .join("");

  totalElement.textContent = `$${cartTotal(validLines).toFixed(2)}`;
  sendButton.disabled = false;
}

function openCart() {
  document.getElementById("cartOverlay")?.classList.add("open");
  document.getElementById("cartDrawer")?.classList.add("open");
}

function closeCart() {
  document.getElementById("cartOverlay")?.classList.remove("open");
  document.getElementById("cartDrawer")?.classList.remove("open");
}

function sendCartToWhatsApp() {
  const cart = getCart().filter((line) => findProduct(line.id));

  if (!cart.length) return;

  let message = "Hola Sweet Girl ✨ quiero consultar por este pedido:\n\n";

  cart.forEach((line) => {
    const product = findProduct(line.id);
    const size = line.size ? ` (${line.size})` : "";

    message += `• ${product.name}${size} x${line.quantity} — $${(
      product.price * line.quantity
    ).toFixed(2)}\n`;
  });

  message += `\nTotal: $${cartTotal(cart).toFixed(2)}\n\n`;
  message +=
    "Estoy en: \n\n¿Me confirmas disponibilidad, precio final y forma de envío?";

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener",
  );
}

function injectCart() {
  const overlay = document.createElement("div");
  overlay.id = "cartOverlay";
  overlay.className = "cart-overlay";
  overlay.addEventListener("click", closeCart);

  const drawer = document.createElement("aside");
  drawer.id = "cartDrawer";
  drawer.className = "cart-drawer";

  drawer.innerHTML = `
    <div class="cart-head">
      <h3>Tu carrito</h3>
      <button class="cart-close" aria-label="Cerrar carrito" onclick="closeCart()">×</button>
    </div>

    <div class="cart-items" id="cartItems"></div>

    <div class="cart-foot">
      <div class="cart-total-row">
        <span>Total</span>
        <span id="cartTotal">$0.00</span>
      </div>

      <button class="btn btn-wa btn-block" id="cartSendBtn" onclick="sendCartToWhatsApp()">
        Enviar consulta por WhatsApp
      </button>

      <p class="cart-note">
        Confirmamos disponibilidad, precio final y envío por WhatsApp.
      </p>
    </div>
  `;

  document.body.append(overlay, drawer);

  document.querySelectorAll("[data-cart-toggle]").forEach((button) => {
    button.addEventListener("click", openCart);
  });

  const menuToggle = document.getElementById("menuToggle");
  const navigation = document.querySelector(".main-nav");

  menuToggle?.addEventListener("click", () => {
    navigation?.classList.toggle("open");
  });

  navigation?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
    });
  });

  const whatsappButton = document.createElement("a");
  whatsappButton.className = "fab-wa";
  whatsappButton.href = `https://wa.me/${WHATSAPP_NUMBER}`;
  whatsappButton.target = "_blank";
  whatsappButton.rel = "noopener";
  whatsappButton.setAttribute("aria-label", "Escríbenos por WhatsApp");
  whatsappButton.innerHTML = `
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path fill="#ffffff" d="M16.02 3.2A12.8 12.8 0 0 0 5.1 22.67L3.2 28.8l6.3-1.84A12.8 12.8 0 1 0 16.02 3.2Zm0 23.25a10.42 10.42 0 0 1-5.3-1.45l-.38-.23-3.74 1.09 1.1-3.65-.25-.38a10.42 10.42 0 1 1 8.57 4.62Zm5.7-7.82c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.69.16-.2.3-.79 1-.96 1.2-.18.21-.35.24-.66.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.31-.02-.48.13-.63.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.16-.69-1.66-.95-2.28-.25-.6-.5-.51-.69-.52h-.59c-.2 0-.52.08-.8.38-.27.3-1.05 1.03-1.05 2.52 0 1.48 1.08 2.92 1.23 3.12.15.2 2.12 3.23 5.13 4.53.72.3 1.28.49 1.72.62.72.23 1.37.2 1.89-.12.58-.36 1.82-1.08 2.08-2.12.26-1.04.26-1.93.18-2.12-.07-.2-.27-.3-.58-.45Z"/>
  </svg>
`;

  document.body.appendChild(whatsappButton);
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.PRODUCTS_READY;
  injectCart();
});

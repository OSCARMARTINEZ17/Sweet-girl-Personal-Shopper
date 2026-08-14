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
  whatsappButton.textContent = "💬";

  document.body.appendChild(whatsappButton);
  renderCart();
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.PRODUCTS_READY;
  injectCart();
});
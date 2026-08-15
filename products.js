/*
  Google Sheet opcional:
  id,name,desc,price,img,category,stock,sizes,active

  Categorías disponibles:
  ropa, calzado, accesorios, belleza, perfumes, vitaminas,
  entrega-inmediata, promociones

  Para que un producto aparezca en más de una categoría,
  sepáralas con coma:
  ropa,promociones
*/

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9S3kboBuiC1c3iwKAU8qm54v-JXU7xGwxNiGrKnPoz5et9m6PzcdkhDXUGY3oRcJi_rDziF-GvPnQ/pub?gid=1668225206&single=true&output=csv";
let PRODUCTS = {
  ropa: [],
  calzado: [],
  accesorios: [],
  belleza: [],
  vitaminas: [],
  perfumes: [],
  "entrega-inmediata": [],
  promociones: [],
};

let currentSearch = "";
let currentSort = "default";

const DEMO_PRODUCTS = [
  {
    id: "ropa-001",
    name: "Prenda original",
    desc: "Agrega tus productos desde Google Sheets.",
    price: 0,
    img: "",
    category: "ropa",
    stock: true,
    sizes: ["S", "M", "L"],
  },
  {
    id: "inmediata-001",
    name: "Producto disponible",
    desc: "Producto listo para entrega inmediata.",
    price: 0,
    img: "",
    category: "entrega-inmediata",
    stock: true,
    sizes: [],
  },
  {
    id: "promo-001",
    name: "Oferta especial",
    desc: "Agrega aquí los productos que estén en promoción.",
    price: 0,
    img: "",
    category: "promociones",
    stock: true,
    sizes: [],
  },
];

function formatCOP(value) {
  const rounded = Math.round(Number(value) || 0);
  return `$${rounded.toLocaleString("es-CO")}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());

      if (row.some((item) => item !== "")) {
        rows.push(row);
      }

      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

function addProduct(product) {
  const categories = String(product.category || "")
    .toLowerCase()
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);

  const item = {
    id: String(product.id),
    name: product.name || "Producto Sweet Girl",
    desc: product.desc || "",
    price: Number(product.price) || 0,
    img: product.img || "",
    stock: String(product.stock || "").toLowerCase() !== "no",
    sizes: product.sizes
      ? String(product.sizes)
          .split(",")
          .map((size) => size.trim())
          .filter(Boolean)
      : [],
  };

  categories.forEach((category) => {
    if (!PRODUCTS[category]) return;
    PRODUCTS[category].push({ ...item, category });
  });
}

async function loadProducts(options = {}) {
  const { silent = false } = options;

  PRODUCTS = {
    ropa: [],
    calzado: [],
    accesorios: [],
    belleza: [],
    vitaminas: [],
    perfumes: [],
    "entrega-inmediata": [],
    promociones: [],
  };

  if (!SHEET_CSV_URL.trim()) {
    DEMO_PRODUCTS.forEach(addProduct);
    return;
  }

  try {
    // Se agrega un parámetro con la hora actual para evitar que el
    // navegador (o algún proxy) devuelva una copia vieja en caché.
    const cacheBustedUrl = `${SHEET_CSV_URL}&_=${Date.now()}`;
    const response = await fetch(cacheBustedUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("No se pudo cargar el catálogo.");
    }

    const rows = parseCSV(await response.text());

    if (rows.length < 2) return;

    const headers = rows[0].map((header) =>
      header.trim().toLowerCase().replace(/\s+/g, ""),
    );

    rows.slice(1).forEach((columns) => {
      const product = {};

      headers.forEach((header, index) => {
        product[header] = (columns[index] || "").trim();
      });

      if (!product.id || !product.category) return;
      if (String(product.active).toLowerCase() === "no") return;

      addProduct(product);
    });
  } catch (error) {
    console.error("Error cargando productos:", error);
  }
}

function getCurrentProducts() {
  const category = document.body.dataset.category;
  let items = [...(PRODUCTS[category] || [])];

  if (currentSearch.trim()) {
    const search = currentSearch.toLowerCase();

    items = items.filter((product) =>
      `${product.name} ${product.desc}`.toLowerCase().includes(search),
    );
  }

  if (currentSort === "price-asc") {
    items.sort((a, b) => a.price - b.price);
  }

  if (currentSort === "price-desc") {
    items.sort((a, b) => b.price - a.price);
  }

  return items;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");

  if (!grid) return;

  const products = getCurrentProducts();

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-message">
        <h3>Próximamente</h3>
        <p>Aún no tenemos productos disponibles en esta categoría.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const id = escapeHtml(product.id);
      const name = escapeHtml(product.name);
      const desc = escapeHtml(product.desc);

      const image = product.img
        ? `<img src="${escapeHtml(product.img)}" alt="${name}">`
        : `<span class="initial">${name.charAt(0)}</span>`;

      const sizeSelect = product.sizes.length
        ? `
          <select class="size-select" data-size-for="${id}">
            <option value="">Selecciona talla</option>
            ${product.sizes
              .map(
                (size) =>
                  `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`,
              )
              .join("")}
          </select>
        `
        : "";

      return `
        <article class="product-card">
          <div class="product-media">
            ${image}
            ${product.stock ? "" : '<span class="stock-badge">Agotado</span>'}
          </div>

          <div class="product-body">
            <h3>${name}</h3>
            <p class="desc">${desc}</p>
            ${sizeSelect}

            <div class="product-foot">
              <span class="price">${formatCOP(product.price)}</span>
              <button
                class="add-btn"
                data-id="${id}"
                ${product.stock ? "" : "disabled"}
                onclick="addProductFromCard('${id}')"
              >
                ${product.stock ? "Agregar" : "Agotado"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function addProductFromCard(id) {
  const sizeElement = document.querySelector(
    `[data-size-for="${CSS.escape(id)}"]`,
  );

  const size = sizeElement ? sizeElement.value : "";

  if (sizeElement && !size) {
    alert("Por favor selecciona una talla.");
    return;
  }

  addToCart(id, size || null);
}

async function refreshProductsNow() {
  const button = document.getElementById("refreshBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Actualizando...";
  }

  await loadProducts({ silent: true });
  renderProducts();

  if (typeof renderCart === "function") {
    renderCart();
  }

  if (button) {
    button.disabled = false;
    button.textContent = "Actualizar";
  }
}

function setupCatalog() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  searchInput?.addEventListener("input", (event) => {
    currentSearch = event.target.value;
    renderProducts();
  });

  sortSelect?.addEventListener("change", (event) => {
    currentSort = event.target.value;
    renderProducts();
  });

  renderProducts();
}

window.PRODUCTS_READY = loadProducts();

document.addEventListener("DOMContentLoaded", async () => {
  await window.PRODUCTS_READY;
  setupCatalog();
});

setInterval(async () => {
  if (document.hidden) return;

  await loadProducts({ silent: true });
  renderProducts();

  if (typeof renderCart === "function") {
    renderCart();
  }
}, 10000);
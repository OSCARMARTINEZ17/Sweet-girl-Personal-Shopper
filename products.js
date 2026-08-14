/*
  Google Sheet opcional:
  id,name,desc,price,img,category,stock,sizes,active

  category: ropa, calzado, accesorios o belleza
  stock: "no" para marcar agotado
  active: "no" para ocultar el producto
*/
const SHEET_CSV_URL = "";

let PRODUCTS = {
  ropa: [],
  calzado: [],
  accesorios: [],
  belleza: [],
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
];

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
      if (row.some((item) => item !== "")) rows.push(row);
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
  const category = String(product.category || "")
    .trim()
    .toLowerCase();

  if (!PRODUCTS[category]) return;

  PRODUCTS[category].push({
    id: product.id,
    name: product.name || "Producto Sweet Girl",
    desc: product.desc || "",
    price: Number(product.price) || 0,
    img: product.img || "",
    category,
    stock: String(product.stock || "").toLowerCase() !== "no",
    sizes: product.sizes
      ? String(product.sizes)
          .split(",")
          .map((size) => size.trim())
          .filter(Boolean)
      : [],
  });
}

async function loadProducts() {
  PRODUCTS = {
    ropa: [],
    calzado: [],
    accesorios: [],
    belleza: [],
  };

  if (!SHEET_CSV_URL.trim()) {
    DEMO_PRODUCTS.forEach(addProduct);
    return;
  }

  try {
    const response = await fetch(SHEET_CSV_URL);

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
              <span class="price">$${product.price.toFixed(2)}</span>
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
  const selector = `[data-size-for="${CSS.escape(id)}"]`;
  const sizeElement = document.querySelector(selector);
  const size = sizeElement ? sizeElement.value : "";

  if (sizeElement && !size) {
    alert("Por favor selecciona una talla.");
    return;
  }

  addToCart(id, size || null);
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

/* =========================================
   DATA (browser-er localStorage-e save hoy)
   ========================================= */
const STORAGE_KEY = "salesDashboardData";
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { customers: [], sales: [] };

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* =========================================
   HELPERS
   ========================================= */
const $ = id => document.getElementById(id);
const money = n => "৳ " + Number(n).toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// User input HTML-e safe rakhar jonno
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// Aj-er date (YYYY-MM-DD), local time onujayi
const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const thisMonth = () => todayStr().slice(0, 7);

const customerName = id => (data.customers.find(c => c.id === id) || {}).name || "Unknown";

/* =========================================
   TABS
   ========================================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn, .tab").forEach(el => el.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
    renderAll();
  });
});

/* =========================================
   CUSTOMERS
   ========================================= */
$("customerForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = $("customerId").value || Date.now().toString();
  const customer = {
    id,
    name: $("custName").value.trim(),
    phone: $("custPhone").value.trim(),
    email: $("custEmail").value.trim(),
    address: $("custAddress").value.trim()
  };

  if ($("customerId").value) {
    // Edit mode
    data.customers = data.customers.map(c => (c.id === id ? customer : c));
  } else {
    // Notun customer
    data.customers.push(customer);
  }

  save();
  resetCustomerForm();
  renderAll();
});

function resetCustomerForm() {
  $("customerForm").reset();
  $("customerId").value = "";
  $("customerFormTitle").textContent = "Add Customer";
}

$("cancelCustomerEdit").addEventListener("click", resetCustomerForm);

function editCustomer(id) {
  const c = data.customers.find(c => c.id === id);
  if (!c) return;
  $("customerId").value = c.id;
  $("custName").value = c.name;
  $("custPhone").value = c.phone;
  $("custEmail").value = c.email;
  $("custAddress").value = c.address;
  $("customerFormTitle").textContent = "Edit Customer";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteCustomer(id) {
  if (!confirm("Ei customer ke delete korben? (Tar sales record thakbe)")) return;
  data.customers = data.customers.filter(c => c.id !== id);
  save();
  renderAll();
}

function renderCustomers() {
  const q = $("customerSearch").value.toLowerCase();

  const list = data.customers.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone.includes(q)
  );

  $("customerTable").innerHTML = list.length
    ? list.map(c => {
        const purchases = data.sales
          .filter(s => s.customerId === c.id)
          .reduce((sum, s) => sum + s.total, 0);

        return `
          <tr>
            <td>${esc(c.name)}</td>
            <td>${esc(c.phone)}</td>
            <td>${esc(c.email)}</td>
            <td>${esc(c.address)}</td>
            <td>${money(purchases)}</td>
            <td>
              <button class="btn small" onclick="editCustomer('${c.id}')">Edit</button>
              <button class="btn danger small" onclick="deleteCustomer('${c.id}')">Delete</button>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="6" class="empty">No customers found</td></tr>`;
}

$("customerSearch").addEventListener("input", renderCustomers);

/* =========================================
   SALES ENTRY
   ========================================= */
function updateSaleTotal() {
  const total = ($("saleQty").value || 0) * ($("salePrice").value || 0);
  $("saleTotal").textContent = money(total);
}
$("saleQty").addEventListener("input", updateSaleTotal);
$("salePrice").addEventListener("input", updateSaleTotal);

$("saleForm").addEventListener("submit", e => {
  e.preventDefault();

  const qty = Number($("saleQty").value);
  const price = Number($("salePrice").value);

  data.sales.push({
    id: Date.now().toString(),
    date: $("saleDate").value,
    customerId: $("saleCustomer").value,
    product: $("saleProduct").value.trim(),
    qty,
    price,
    total: qty * price
  });

  save();
  $("saleForm").reset();
  $("saleDate").value = todayStr();
  $("saleQty").value = 1;
  updateSaleTotal();
  renderAll();
});

function deleteSale(id) {
  if (!confirm("Ei sale ta delete korben?")) return;
  data.sales = data.sales.filter(s => s.id !== id);
  save();
  renderAll();
}

/* =========================================
   SALES FILTER + SEARCH
   ========================================= */
const FILTER_IDS = ["salesSearch", "filterMonth", "filterProduct", "filterCustomer"];

function getFilteredSales() {
  const q = $("salesSearch").value.toLowerCase();
  const month = $("filterMonth").value;        // "2026-11"
  const product = $("filterProduct").value;
  const customer = $("filterCustomer").value;

  return data.sales
    .filter(s =>
      (!q || s.product.toLowerCase().includes(q) || customerName(s.customerId).toLowerCase().includes(q)) &&
      (!month || s.date.startsWith(month)) &&
      (!product || s.product === product) &&
      (!customer || s.customerId === customer)
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

FILTER_IDS.forEach(id => $(id).addEventListener("input", renderSales));

$("clearFilters").addEventListener("click", () => {
  FILTER_IDS.forEach(id => ($(id).value = ""));
  renderSales();
});

function renderSales() {
  const list = getFilteredSales();

  $("salesTable").innerHTML = list.length
    ? list.map(s => `
        <tr>
          <td>${esc(s.date)}</td>
          <td>${esc(customerName(s.customerId))}</td>
          <td>${esc(s.product)}</td>
          <td>${s.qty}</td>
          <td>${money(s.price)}</td>
          <td>${money(s.total)}</td>
          <td><button class="btn danger small" onclick="deleteSale('${s.id}')">Delete</button></td>
        </tr>`).join("")
    : `<tr><td colspan="7" class="empty">No sales found</td></tr>`;

  $("filteredTotal").textContent = money(list.reduce((sum, s) => sum + s.total, 0));
}

// Customer dropdown (sale form + filter)
function renderCustomerOptions() {
  const sel = $("saleCustomer");
  const prev = sel.value;

  sel.innerHTML = data.customers.length
    ? data.customers.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.phone)})</option>`).join("")
    : `<option value="">Age customer add korun</option>`;

  sel.value = prev;
}

// Product + customer filter dropdown
function renderFilterOptions() {
  const pf = $("filterProduct");
  const cf = $("filterCustomer");
  const pVal = pf.value;
  const cVal = cf.value;

  const products = [...new Set(data.sales.map(s => s.product))].sort();

  pf.innerHTML = `<option value="">All products</option>` +
    products.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");

  cf.innerHTML = `<option value="">All customers</option>` +
    data.customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

  pf.value = pVal;
  cf.value = cVal;
}

/* =========================================
   DASHBOARD
   ========================================= */
function renderDashboard() {
  // Overall stats
  $("totalRevenue").textContent = money(data.sales.reduce((s, x) => s + x.total, 0));
  $("totalSales").textContent = data.sales.length;
  $("totalCustomers").textContent = data.customers.length;
  $("totalQty").textContent = data.sales.reduce((s, x) => s + x.qty, 0);

  // Monthly summary
  const month = $("summaryMonth").value || thisMonth();
  $("summaryMonth").value = month;

  const monthSales = data.sales.filter(s => s.date.startsWith(month));
  $("monthRevenue").textContent = money(monthSales.reduce((s, x) => s + x.total, 0));
  $("monthCount").textContent = monthSales.length;
  $("monthCustomers").textContent = new Set(monthSales.map(s => s.customerId)).size;

  renderMonthlyChart();
  renderTopProducts();
}

$("summaryMonth").addEventListener("input", renderDashboard);
$("chartYear").addEventListener("input", renderDashboard);

// Monthly revenue bar chart (selected year)
function renderMonthlyChart() {
  const year = String($("chartYear").value || new Date().getFullYear());
  $("chartYear").value = year;

  const totals = Array(12).fill(0);
  data.sales.forEach(s => {
    if (s.date.startsWith(year)) {
      totals[Number(s.date.slice(5, 7)) - 1] += s.total;
    }
  });

  const max = Math.max(...totals, 1);

  $("monthlyChart").innerHTML = totals.map((t, i) => `
    <div class="bar-col" title="${MONTHS[i]}: ${money(t)}">
      <div class="bar" style="height:${(t / max) * 200}px"></div>
      <span class="bar-label">${MONTHS[i]}</span>
    </div>`).join("");
}

// Top 5 products (quantity onujayi)
function renderTopProducts() {
  const map = {};
  data.sales.forEach(s => {
    if (!map[s.product]) map[s.product] = { qty: 0, revenue: 0 };
    map[s.product].qty += s.qty;
    map[s.product].revenue += s.total;
  });

  const top = Object.entries(map)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  const maxQty = top.length ? top[0][1].qty : 1;

  $("topProducts").innerHTML = top.length
    ? top.map(([name, v], i) => `
        <div class="bar-row">
          <div class="bar-name">
            ${i + 1}. ${esc(name)} <small>(${v.qty} pcs · ${money(v.revenue)})</small>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(v.qty / maxQty) * 100}%"></div>
          </div>
        </div>`).join("")
    : `<p class="empty">Ekhono kono sales nai</p>`;
}

/* =========================================
   SAMPLE DATA (test korar jonno)
   ========================================= */
$("loadSample").addEventListener("click", () => {
  if (data.customers.length && !confirm("Ager data muche sample data boshabe. Continue?")) return;
  loadSample();
});

function loadSample() {
  const names = ["Rahim Uddin", "Karim Ahmed", "Fatema Begum", "Shamima Akter", "Jamal Hossain"];
  const products = [
    ["Rice (5kg)", 350],
    ["Cooking Oil (1L)", 180],
    ["Sugar (1kg)", 120],
    ["Lentil (1kg)", 140],
    ["Soap (pack)", 60]
  ];
  const year = new Date().getFullYear();

  data.customers = names.map((name, i) => ({
    id: "c" + (i + 1),
    name,
    phone: "0170000001" + i,
    email: "",
    address: "Rajshahi"
  }));

  data.sales = [];
  for (let i = 0; i < 40; i++) {
    const month = String(Math.floor(Math.random() * 11) + 1).padStart(2, "0");
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
    const [product, price] = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 5) + 1;
    const customer = data.customers[Math.floor(Math.random() * data.customers.length)];

    data.sales.push({
      id: "s" + i,
      date: `${year}-${month}-${day}`,
      customerId: customer.id,
      product,
      qty,
      price,
      total: qty * price
    });
  }

  save();
  renderAll();
}

/* =========================================
   INIT
   ========================================= */
function renderAll() {
  renderCustomerOptions();
  renderFilterOptions();
  renderCustomers();
  renderSales();
  renderDashboard();
}

$("saleDate").value = todayStr();
updateSaleTotal();
renderAll();

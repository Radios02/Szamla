document.getElementById("load-invoices").onclick = loadInvoices;
const form = document.getElementById("invoice-form");
const customerSelect = form.customer_id;

function calcVatAmount() {
    const total = parseFloat(form.total_amount.value) || 0;
    const vat = parseInt(form.vat_percent.value) || 0;
    const vatAmount = Math.round(total * vat / 100);
    document.getElementById("vat-amount-info").textContent =
        vat ? `ÁFA összege: ${vatAmount} Ft` : '';
}

form.total_amount.oninput = calcVatAmount;
form.vat_percent.onchange = calcVatAmount;

async function loadCustomers() {
    const res = await fetch("/customers");
    const customers = await res.json();
    customerSelect.innerHTML = customers.map(c =>
        `<option value="${c.id}">${c.name} (${c.address}, ${c.tax_number})</option>`
    ).join("");
}
loadCustomers();

async function loadInvoices() {
    const res = await fetch("/invoices");
    const invoices = await res.json();
    document.getElementById("invoices").innerHTML = invoices.map(inv => `
        <div class="invoice-card">
            <div><b>Számla száma:</b> ${inv.invoice_number}</div>
            <div><b>Kiállító neve:</b> ${inv.issuer_name}</div>
            <div><b>Kiállító címe:</b> ${inv.issuer_address}</div>
            <div><b>Kiállító adószáma:</b> ${inv.issuer_tax_number}</div>
            <div><b>Vevő neve:</b> ${inv.customer_name}</div>
            <div><b>Vevő címe:</b> ${inv.customer_address}</div>
            <div><b>Vevő adószáma:</b> ${inv.customer_tax_number}</div>
            <div><b>Számla kelte:</b> ${inv.issue_date}</div>
            <div><b>Teljesítés dátuma:</b> ${inv.fulfillment_date}</div>
            <div><b>Fizetési határidő:</b> ${inv.payment_deadline}</div>
            <div><b>Végösszeg:</b> ${inv.total_amount} Ft</div>
            <div><b>ÁFA kulcs:</b> ${inv.vat_percent}%</div>
            <div><b>ÁFA nagysága:</b> ${inv.vat_amount} Ft</div>
            <button onclick="editInvoice(${inv.id})">Szerkesztés</button>
            <button onclick="deleteInvoice(${inv.id})">Törlés</button>
        </div>
    `).join("");
}

form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch("/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        form.reset();
        document.getElementById("vat-amount-info").textContent = '';
        loadInvoices();
    } else {
        alert("Hiba a mentéskor!");
    }
};

window.deleteInvoice = async (id) => {
    if (!confirm("Biztos törlöd?")) return;
    await fetch(`/invoices/${id}`, { method: "DELETE" });
    loadInvoices();
};

window.editInvoice = async (id) => {
    const res = await fetch(`/invoices/${id}`);
    const inv = await res.json();
    form.dataset.editId = id;
    form.issuer_name.value = inv.issuer_name;
    form.issuer_address.value = inv.issuer_address;
    form.issuer_tax_number.value = inv.issuer_tax_number;
    form.customer_name.value = inv.customer_name;
    form.customer_address.value = inv.customer_address;
    form.customer_tax_number.value = inv.customer_tax_number;
    form.fulfillment_date.value = inv.fulfillment_date;
    form.total_amount.value = inv.total_amount;
    form.vat_percent.value = inv.vat_percent;
    calcVatAmount();
};


// Oldal betöltésekor automatikusan betöltjük a számlákat
loadInvoices();
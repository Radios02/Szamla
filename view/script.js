document.getElementById("load-invoices").onclick = loadInvoices;
const form = document.getElementById("invoice-form");
const customerSelect = form.customer_id;

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
        <div>
            <b>${inv.invoice_number}</b> - ${inv.customer_name} - ${inv.total_amount} Ft (ÁFA: ${inv.vat_amount} Ft)
            <button onclick="deleteInvoice(${inv.id})">Törlés</button>
        </div>
    `).join("");
}

form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.total_amount = parseFloat(data.total_amount);
    data.vat_amount = parseFloat(data.vat_amount);
    const res = await fetch("/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        form.reset();
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
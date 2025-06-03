import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../data/szamla.sqlite");
const db = new Database(dbPath);

// Vevők tábla
db.exec(`
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    tax_number TEXT NOT NULL
);
`);

// Számlák tábla
db.exec(`
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_name TEXT NOT NULL,
    issuer_address TEXT NOT NULL,
    issuer_tax_number TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    issue_date TEXT NOT NULL,
    fulfillment_date TEXT NOT NULL,
    payment_deadline TEXT NOT NULL,
    total_amount REAL NOT NULL,
    vat_percent INTEGER NOT NULL,
    vat_amount REAL NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`);

// Egyedi, 5 számjegyű számlaszám generálása
function generateInvoiceNumber() {
    let num;
    let exists;
    do {
        num = Math.floor(10000 + Math.random() * 90000).toString();
        exists = db.prepare("SELECT 1 FROM invoices WHERE invoice_number = ?").get(num);
    } while (exists);
    return num;
}

// Alap vevők feltöltése, ha üres
const customerCount = db.prepare("SELECT COUNT(*) as cnt FROM customers").get().cnt;
if (customerCount === 0) {
    const insertCustomer = db.prepare("INSERT INTO customers (name, address, tax_number) VALUES (?, ?, ?)");
    insertCustomer.run("Vevő 1", "1111 Budapest, Fő utca 1.", "12345678-1-11");
    insertCustomer.run("Vevő 2", "2222 Debrecen, Kossuth tér 2.", "23456789-2-22");
    insertCustomer.run("Vevő 3", "3333 Szeged, Dóm tér 3.", "34567890-3-33");
}

// Alap számlák feltöltése, ha üres
const invoiceCount = db.prepare("SELECT COUNT(*) as cnt FROM invoices").get().cnt;
if (invoiceCount === 0) {
    const insertInvoice = db.prepare(`
        INSERT INTO invoices (
            issuer_name, issuer_address, issuer_tax_number,
            customer_id, invoice_number, issue_date, fulfillment_date, payment_deadline,
            total_amount, vat_percent, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const customers = db.prepare("SELECT * FROM customers").all();
    const today = new Date().toISOString().slice(0, 10);
    const deadline = new Date(new Date(today).setMonth(new Date(today).getMonth() + 6)).toISOString().slice(0, 10);
    for (const c of customers) {
        for (let i = 1; i <= 3; i++) {
            const total = 10000 * i;
            const vat_percent = [5, 18, 27][(i - 1) % 3];
            const vat_amount = Math.round(total * vat_percent / 100);
            insertInvoice.run(
                "Cég Kft.", "1000 Budapest, Céges út 10.", "87654321-1-00",
                c.id, generateInvoiceNumber(), today, today, deadline,
                total, vat_percent, vat_amount
            );
        }
    }
}

// Vevők lekérdezése
export function getCustomers() {
    return db.prepare("SELECT * FROM customers").all();
}

// Számlák lekérdezése
export function getInvoices() {
    return db.prepare(`
        SELECT invoices.*, customers.name as customer_name, customers.address as customer_address, customers.tax_number as customer_tax_number
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        ORDER BY invoices.id DESC
    `).all();
}

// Egy számla lekérdezése
export function getInvoice(id) {
    return db.prepare(`
        SELECT invoices.*, customers.name as customer_name, customers.address as customer_address, customers.tax_number as customer_tax_number
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE invoices.id = ?
    `).get(id);
}

// Számla hozzáadása
export function addInvoice(data) {
    const invoice_number = generateInvoiceNumber();
    const issue_date = new Date().toISOString().slice(0, 10);
    const payment_deadline = new Date(new Date(issue_date).setMonth(new Date(issue_date).getMonth() + 6))
        .toISOString().slice(0, 10);
    const vat_percent = parseInt(data.vat_percent, 10);
    const total_amount = parseFloat(data.total_amount);
    const vat_amount = Math.round(total_amount * vat_percent / 100);

    return db.prepare(`
        INSERT INTO invoices (
            issuer_name, issuer_address, issuer_tax_number,
            customer_id, invoice_number, issue_date, fulfillment_date, payment_deadline,
            total_amount, vat_percent, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.issuer_name, data.issuer_address, data.issuer_tax_number,
        data.customer_id, invoice_number, issue_date, data.fulfillment_date, payment_deadline,
        total_amount, vat_percent, vat_amount
    );
}
// Számla törlése
export function deleteInvoice(id) {
    return db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
}
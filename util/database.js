import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../data/szamla.sqlite");
const db = new Database(dbPath);

// Egyetlen számlák tábla, minden adat egy helyen
db.exec(`
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_name TEXT NOT NULL,
    issuer_address TEXT NOT NULL,
    issuer_tax_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_tax_number TEXT NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    issue_date TEXT NOT NULL,
    fulfillment_date TEXT NOT NULL,
    payment_deadline TEXT NOT NULL,
    total_amount REAL NOT NULL,
    vat_percent INTEGER NOT NULL,
    vat_amount REAL NOT NULL
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

// Alap számlák feltöltése, ha üres
const invoiceCount = db.prepare("SELECT COUNT(*) as cnt FROM invoices").get().cnt;
if (invoiceCount === 0) {
    const insertInvoice = db.prepare(`
        INSERT INTO invoices (
            issuer_name, issuer_address, issuer_tax_number,
            customer_name, customer_address, customer_tax_number,
            invoice_number, issue_date, fulfillment_date, payment_deadline,
            total_amount, vat_percent, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const today = new Date();
    for (let c = 1; c <= 3; c++) {
        for (let i = 1; i <= 3; i++) {
            const issueDate = new Date(today.getTime() + (c - 1) * 24 * 60 * 60 * 1000);
            const issue_date = issueDate.toISOString().slice(0, 10);
            const fulfillment_date = new Date(issueDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const payment_deadline = new Date(new Date(issue_date).setMonth(issueDate.getMonth() + 6)).toISOString().slice(0, 10);
            const total_amount = 10000 * i;
            const vat_percent = [5, 18, 27][(i - 1) % 3];
            const vat_amount = Math.round(total_amount * vat_percent / 100);

            insertInvoice.run(
                "Cég Kft.", "1000 Budapest, Céges út 10.", "87654321-1-00",
                `Vevő ${c}`, `${c}000 ${c} Budapest, Vevő utca ${c}.`, `1234567${c}-1-1${c}`,
                generateInvoiceNumber(), issue_date, fulfillment_date, payment_deadline,
                total_amount, vat_percent, vat_amount
            );
        }
    }
}

// Számlák lekérdezése
export function getInvoices() {
    return db.prepare("SELECT * FROM invoices ORDER BY id DESC").all();
}

// Egy számla lekérdezése
export function getInvoice(id) {
    return db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
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
            customer_name, customer_address, customer_tax_number,
            invoice_number, issue_date, fulfillment_date, payment_deadline,
            total_amount, vat_percent, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.issuer_name, data.issuer_address, data.issuer_tax_number,
        data.customer_name, data.customer_address, data.customer_tax_number,
        invoice_number, issue_date, data.fulfillment_date, payment_deadline,
        total_amount, vat_percent, vat_amount
    );
}

// Számla törlése
export function deleteInvoice(id) {
    return db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
}

export function updateInvoice(id, data) {
    const vat_percent = parseInt(data.vat_percent, 10);
    const total_amount = parseFloat(data.total_amount);
    const vat_amount = Math.round(total_amount * vat_percent / 100);
    const payment_deadline = new Date(new Date(data.issue_date).setMonth(new Date(data.issue_date).getMonth() + 6))
        .toISOString().slice(0, 10);

    return db.prepare(`
        UPDATE invoices SET
            issuer_name = ?,
            issuer_address = ?,
            issuer_tax_number = ?,
            customer_name = ?,
            customer_address = ?,
            customer_tax_number = ?,
            fulfillment_date = ?,
            payment_deadline = ?,
            total_amount = ?,
            vat_percent = ?,
            vat_amount = ?
        WHERE id = ?
    `).run(
        data.issuer_name, data.issuer_address, data.issuer_tax_number,
        data.customer_name, data.customer_address, data.customer_tax_number,
        data.fulfillment_date, payment_deadline,
        total_amount, vat_percent, vat_amount,
        id
    );
}
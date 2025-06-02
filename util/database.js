import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../data/szamla.sqlite");
const db = new Database(dbPath);

// TÁBLÁK LÉTREHOZÁSA
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

// ALAP ADATOK FELTÖLTÉSE (ha üres)
const customerCount = db.prepare("SELECT COUNT(*) as cnt FROM customers").get().cnt;
if (customerCount === 0) {
    const insertCustomer = db.prepare("INSERT INTO customers (name, address, tax_number) VALUES (?, ?, ?)");
    insertCustomer.run("Vevő 1", "1111 Budapest, Fő utca 1.", "12345678-1-11");
    insertCustomer.run("Vevő 2", "2222 Debrecen, Kossuth tér 2.", "23456789-2-22");
    insertCustomer.run("Vevő 3", "3333 Szeged, Dóm tér 3.", "34567890-3-33");
}

const invoiceCount = db.prepare("SELECT COUNT(*) as cnt FROM invoices").get().cnt;
if (invoiceCount === 0) {
    const customers = db.prepare("SELECT * FROM customers").all();
    const insertInvoice = db.prepare(`
        INSERT INTO invoices (
            issuer_name, issuer_address, issuer_tax_number,
            customer_id, invoice_number, issue_date, fulfillment_date, payment_deadline,
            total_amount, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    customers.forEach((c, idx) => {
        for (let i = 1; i <= 3; i++) {
            insertInvoice.run(
                "Cég Kft.", "1000 Budapest, Céges út 10.", "87654321-1-00",
                c.id, `SZML${c.id}${i}`, "2024-06-01", "2024-06-02", "2024-06-15",
                10000 * i, 2700 * i
            );
        }
    });
}

// LEKÉRDEZŐ FÜGGVÉNYEK
export function getCustomers() {
    return db.prepare("SELECT * FROM customers").all();
}

export function getInvoices() {
    return db.prepare(`
        SELECT invoices.*, customers.name as customer_name
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
    `).all();
}

export function getInvoice(id) {
    return db.prepare(`
        SELECT invoices.*, customers.name as customer_name
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE invoices.id = ?
    `).get(id);
}

export function addInvoice(data) {
    return db.prepare(`
        INSERT INTO invoices (
            issuer_name, issuer_address, issuer_tax_number,
            customer_id, invoice_number, issue_date, fulfillment_date, payment_deadline,
            total_amount, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.issuer_name, data.issuer_address, data.issuer_tax_number,
        data.customer_id, data.invoice_number, data.issue_date, data.fulfillment_date, data.payment_deadline,
        data.total_amount, data.vat_amount
    );
}

export function deleteInvoice(id) {
    return db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
}
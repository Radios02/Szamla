import express from "express";
import * as db from './util/database.js';
import path from "path";

const PORT = 8081;
const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'view')));

// Vevők listázása
app.get("/customers", (req, res) => {
    try {
        res.json(db.getCustomers());
    } catch (err) {
        res.status(500).json({ message: `${err}` });
    }
});

// Számlák listázása
app.get("/invoices", (req, res) => {
    try {
        res.json(db.getInvoices());
    } catch (err) {
        res.status(500).json({ message: `${err}` });
    }
});

// Egy számla lekérdezése
app.get("/invoices/:id", (req, res) => {
    try {
        const invoice = db.getInvoice(req.params.id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ message: `${err}` });
    }
});

// Számla létrehozása
app.post("/invoices", (req, res) => {
    try {
        const result = db.addInvoice(req.body);
        res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(400).json({ message: `${err}` });
    }
});

// Számla módosítása
app.put("/invoices/:id", (req, res) => {
    try {
        db.updateInvoice(req.params.id, req.body);
        res.status(200).json({ message: "Sikeres módosítás" });
    } catch (err) {
        res.status(400).json({ message: `${err}` });
    }
});

// Számla törlése
app.delete("/invoices/:id", (req, res) => {
    try {
        db.deleteInvoice(req.params.id);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ message: `${err}` });
    }
});

// Számlák automatikus törlése, ha a fizetési határidő + 5 év eltelt jogszabály miatt
function deleteOldInvoices() {
    const now = new Date();
    // ISO stringből csak a dátum kell
    const fiveYearsAgo = new Date(now.setFullYear(now.getFullYear() - 5)).toISOString().slice(0, 10);
    // Töröljük azokat, ahol a fizetési határidő 5 évnél régebbi
    const deleted = db.deleteInvoicesBeforeDeadline(fiveYearsAgo);
    if (deleted.changes > 0) {
        console.log(`Törölt számlák száma: ${deleted.changes}`);
    }
}

// Indításkor és utána naponta egyszer futtatjuk
deleteOldInvoices();
setInterval(deleteOldInvoices, 24 * 60 * 60 * 1000); // 24 óra

app.listen(PORT, () => {
    console.log(`Server runs on port ${PORT}`);
});
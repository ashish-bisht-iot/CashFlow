# 🤖 Prompts.md

This file documents the AI prompts used for the complex parts of the CashFlow — Salary & Expense Tracker project.

---

## 📌 Prompt 1: localStorage Data Persistence
Prompt:
I have a JavaScript array of expense objects. How do I save it to localStorage so the data does not disappear on page refresh? Also show me how to load it back when the page opens.

---

## 📌 Prompt 2: Chart.js Expense Breakdown
Prompt:
I am using Chart.js doughnut chart. Instead of showing just two slices for total expenses and remaining balance, I want each individual expense to have its own coloured slice with a label. How do I build the labels and data arrays dynamically from a JavaScript array of expense objects?

---

## 📌 Prompt 3: PDF Export with jsPDF
Prompt:
How do I use the jsPDF library loaded from a CDN to generate and download a PDF file that contains a summary table and a list of items from a JavaScript array? The PDF should have a title, a summary section, and a styled table with rows.

---

## 📌 Prompt 4: Budget Alert at 10 Percent
Prompt:
How do I check in JavaScript if the remaining balance has dropped below 10 percent of the salary and then dynamically add a CSS class to turn the balance text red and show a hidden warning banner on the page?

---

## 📌 Prompt 5: Prevent Chart Duplication on Re-render
Prompt:
Every time I add a new expense, my Chart.js chart duplicates instead of updating. How do I properly destroy the old chart instance before creating a new one in vanilla JavaScript?


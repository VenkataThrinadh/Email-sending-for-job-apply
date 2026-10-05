// utils/csvParser.js - Parse CSV files for recipient import
const fs = require('fs');
const csv = require('csv-parser');

/**
 * Parse a CSV file from disk.
 * Expected columns: email (required), name (optional), + any extra fields as variables
 * Returns array of objects: [{ email, name, ...otherFields }]
 */
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error('CSV file not found.'));
    }

    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({ trim: true }))
      .on('data', (row) => {
        // Normalize keys to lowercase
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          normalized[key.toLowerCase().trim()] = value?.trim() || '';
        }

        // Must have email
        if (!normalized.email || !isValidEmail(normalized.email)) return;

        results.push(normalized);
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

/**
 * Parse CSV string content directly (for API use)
 */
const parseCSVString = (csvString) => {
  return new Promise((resolve, reject) => {
    const { Readable } = require('stream');
    const results = [];
    const stream = Readable.from(csvString);
    stream
      .pipe(csv({ trim: true }))
      .on('data', (row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          normalized[key.toLowerCase().trim()] = value?.trim() || '';
        }
        if (!normalized.email || !isValidEmail(normalized.email)) return;
        results.push(normalized);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

module.exports = { parseCSVFile, parseCSVString, isValidEmail };

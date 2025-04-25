'use server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

/**
 * The ID of the Google Sheet where the data will be written.
 */
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

/**
 * Represents data to be written to a Google Sheet.
 */
export interface SheetData {
  A1?: string;
  B1?: string;
  C1?: string;
  D1?: string;
  E1?: string;
  F1?: string;
  H1?: string;
  I1?: string;
  G1?: string;
}

async function getServiceAccountAuth() {
  try {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error(
        'Missing Google Sheets credentials. Ensure GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY are set in your environment variables.'
      );
    }
        // Sanitize the private key by replacing escaped newline characters with actual line breaks
    if (typeof privateKey === 'string') {
          privateKey = privateKey.replace(/\\n/g, '\n');
    }
    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth;
  } catch (error: any) {
    console.error('Error getting service account auth:', error);
    throw error;
  }
}

export async function writeToSheet(spreadsheetId: string, data: SheetData, sheetName: string): Promise<void> {
  try {
    const auth = await getServiceAccountAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Check if the sheet exists, create it if it doesn't
    await createSheet(sheetName);

    // Determine the next available row
    const nextRow = await getNextAvailableRow(sheets, spreadsheetId, sheetName);
    let range;
    let values;

    if (data.G1 !== undefined) {
      range = `${sheetName}!G${nextRow}:I${nextRow}`;
      values = [
        [
          data.G1 || '',
          data.H1 || '',
          data.I1 || '',
        ],
      ];
    }
    else {
      range = `${sheetName}!A${nextRow}:E${nextRow}`;
      values = [
        [
          data.A1 || '',
          data.B1 || '',
          data.C1 || '',
          data.D1 || '',
          data.E1 || '',
        ],
      ];
    }


    const resource = {
      values,
    };

    // Append data to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    });

    console.log('New row added to sheet:', data);
  } catch (error: any) {
    console.error('Error writing to sheet:', error);
    throw error;
  }
}


async function getNextAvailableRow(sheets: any, spreadsheetId: string, sheetName: string): Promise<number> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });

  const values = result.data.values;
  if (!values) {
    return 1;
  }

  return values.length + 1;
}

async function checkIfDateEntryExists(sheets: any, spreadsheetId: string, sheetName: string, date: string, entryType: string): Promise<boolean> {
  let range;
  if (entryType === "refueling") {
    range = `${sheetName}!G:G`;  // Different range for refueling
  } else {
    range = `${sheetName}!A:A`;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: range,
  });

  const values = response.data.values;
  if (values && values.length > 0) {
    // Check if the date already exists in the sheet for the specified entry type
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === date) {
        return true; // Date entry already exists
      }
    }
  }
  return false; // Date entry does not exist
}

export async function createSheet(username: string): Promise<void> {
  try {
    const auth = await getServiceAccountAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID environment variable not set.');
    }

    // Check if the sheet already exists
    let metadata;
    try {
      metadata = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
    } catch (error: any) {
      console.error('Error getting spreadsheet metadata:', error);
      throw new Error(`Failed to get spreadsheet metadata: ${error.message}`);
    }

    const sheetExists = metadata.data.sheets?.some(sheet => sheet.properties?.title === username);

    if (!sheetExists) {
      // Add a new sheet
      const addSheetRequest = {
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          properties: {
            title: username,
          },
        },
      };

      let batchUpdateResponse;
      try {
        batchUpdateResponse = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: addSheetRequest.resource,
              },
            ],
          },
        });
      } catch (error: any) {
        console.error('Error creating sheet:', error);
        throw new Error(`Failed to create sheet: ${error.message}`);
      }

      const newSheetId = batchUpdateResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;

      // Write headers to the new sheet
      const headerValues = [
        ["Дата", "Одометр", "Время отметки медика", "Время карты вставил-вытащил", "Гос номер автобуса", , "Дата", "Одометр", "Литры"],
      ];

      const headerResource = {
        values: headerValues,
      };

      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${username}!A1:I1`,
          valueInputOption: "USER_ENTERED",
          requestBody: headerResource,
        });
      } catch (error: any) {
        console.error('Error writing headers to sheet:', error);
        throw new Error(`Failed to write headers to sheet: ${error.message}`);
      }

      console.log(`Sheet "${username}" created successfully.`);
    } else {
      console.log(`Sheet "${username}" already exists.`);
    }
  } catch (error: any) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}

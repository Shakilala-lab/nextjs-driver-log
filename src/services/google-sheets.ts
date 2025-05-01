'use server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SERVICE_ACCOUNT_KEY_FILE_PATH = './service_account_key.json';

const SPREADSHEET_ID = process.env['1CVuIvwFjknaO_2Ajb4ZSo0GDj5vxZu7VsXqvHnrFjzQ'];

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

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

async function getGoogleSheetsAuth() {
    try {
        let clientEmail: string | undefined = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
        let privateKey: string | undefined = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

        if (!clientEmail || !privateKey) {
            throw new Error(
                'Missing Google Sheets credentials. Ensure GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY are set in your environment variables.'
            );
        }
    
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\\\n/g, '\n');
        
    }
    
    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return auth;
    } catch (error) {
        console.error('Error creating JWT client:', error);
        throw new Error(`Failed to create JWT client: ${error.message}`);
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

export async function writeToSheet(spreadsheetId: string | undefined, data: SheetData, sheetName: string): Promise<void> {
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID is not defined in environment variables.');
  }
  try {
    const auth = await getGoogleSheetsAuth();
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


export async function createSheet(username: string): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID is not defined in environment variables.');
  }

  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({ version: 'v4', auth });

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

      const batchUpdateResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: addSheetRequest.resource,
            },
          ],
        },
      });

      const newSheetId = batchUpdateResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;

      // Write headers to the new sheet
      const headerValues = [
        ["Дата", "Одометр", "Время отметки медика", "Время карты вставил-вытащил", "Гос номер автобуса", , "Дата", "Одометр", "Литры"],
      ];

      const headerResource = {
        values: headerValues,
      };

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${username}!A1:I1`,
        valueInputOption: "USER_ENTERED",
        requestBody: headerResource,
      });

      console.log(`Sheet "${username}" created successfully.`);
    } else {
      console.log(`Sheet "${username}" already exists.`);
    }
  } catch (error: any) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}

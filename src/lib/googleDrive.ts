// Google Drive Integration for Military Tycoon Services (MTS)
// Handles Google OAuth 2.0 Token Authorization, Backup Folder Management,
// and Direct JSON Backup Uploads / Synchronization to Google Drive.

import firebaseConfigData from '../../firebase-applet-config.json';
import { SiteBackup } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              expires_in?: number;
            }) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_CLIENT_ID = (firebaseConfigData as any).oAuthClientId || '903099188173-ai0kl91s4709ia2qdm8qit4ouvqc4qda.apps.googleusercontent.com';

const STORAGE_KEYS = {
  TOKEN: 'mts_gdrive_access_token_v1',
  EXPIRES_AT: 'mts_gdrive_token_expires_at_v1',
  FOLDER_ID: 'mts_gdrive_backup_folder_id_v1',
  FOLDER_NAME: 'mts_gdrive_backup_folder_name_v1',
  AUTO_SYNC: 'mts_gdrive_auto_backup_enabled_v1',
  CONNECTED_EMAIL: 'mts_gdrive_connected_email_v1',
  LAST_SYNC: 'mts_gdrive_last_sync_time_v1'
};

export const DEFAULT_DRIVE_FOLDER_NAME = 'Military Tycoon Value List Backups';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  sizeBytes?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Token & Session Management
// ---------------------------------------------------------------------------

export function getStoredDriveToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const expiresAtStr = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
    if (!token || !expiresAtStr) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    // Give 60 seconds buffer before true expiry
    if (Date.now() >= expiresAt - 60000) {
      return null;
    }
    return token;
  } catch (e) {
    return null;
  }
}

export function saveDriveToken(token: string, expiresInSeconds: number = 3599, email?: string): void {
  try {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
    if (email) {
      localStorage.setItem(STORAGE_KEYS.CONNECTED_EMAIL, email);
    }
  } catch (e) {
    console.error('Failed to save Google Drive token to storage:', e);
  }
}

export function disconnectGoogleDrive(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.CONNECTED_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.FOLDER_ID);
    localStorage.removeItem(STORAGE_KEYS.AUTO_SYNC);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  } catch (e) {
    console.error('Failed to disconnect Google Drive:', e);
  }
}

export function isGoogleDriveConnected(): boolean {
  return !!getStoredDriveToken();
}

export function getGoogleDriveConnectedEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.CONNECTED_EMAIL);
  } catch {
    return null;
  }
}

export function getGoogleDriveAutoSync(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';
  } catch {
    return false;
  }
}

export function setGoogleDriveAutoSync(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save auto-sync setting:', e);
  }
}

export function getGoogleDriveLastSyncTime(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

export function setGoogleDriveLastSyncTime(timestamp: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  } catch (e) {
    console.error('Failed to save last sync timestamp:', e);
  }
}

export function getSavedDriveFolderId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.FOLDER_ID);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Google Identity Services OAuth Flow
// ---------------------------------------------------------------------------

export async function requestGoogleDriveAuth(promptConsent: boolean = false): Promise<{
  success: boolean;
  accessToken?: string;
  email?: string;
  message: string;
}> {
  return new Promise((resolve) => {
    // Check if GIS script loaded
    if (!window.google?.accounts?.oauth2) {
      resolve({
        success: false,
        message: 'Google Identity Services library is still loading. Please check your internet connection and try again in a few seconds.'
      });
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        prompt: promptConsent ? 'consent' : '',
        callback: async (response) => {
          if (response.error) {
            console.error('Google OAuth Error:', response);
            resolve({
              success: false,
              message: response.error_description || response.error || 'Google Authorization was cancelled or failed.'
            });
            return;
          }

          if (response.access_token) {
            const token = response.access_token;
            const expiresIn = response.expires_in || 3599;

            // Attempt to fetch user profile info for account badge display
            let userEmail = '';
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (userInfoRes.ok) {
                const userData = await userInfoRes.json();
                userEmail = userData.email || '';
              }
            } catch (e) {
              console.warn('Could not retrieve user email from userinfo endpoint:', e);
            }

            saveDriveToken(token, expiresIn, userEmail || undefined);

            resolve({
              success: true,
              accessToken: token,
              email: userEmail,
              message: userEmail 
                ? `Connected to Google Drive as ${userEmail}!`
                : 'Successfully connected to Google Drive!'
            });
          } else {
            resolve({
              success: false,
              message: 'No access token returned from Google.'
            });
          }
        },
        error_callback: (err: any) => {
          const errType = err?.type || err?.message || String(err);
          if (errType.includes('popup_closed') || errType.includes('closed') || errType.includes('user_cancel')) {
            console.log('Google OAuth prompt dismissed by user.');
            resolve({
              success: false,
              message: 'Google Sign-in was cancelled.'
            });
            return;
          }
          console.warn('Google OAuth Token Client Info:', err);
          resolve({
            success: false,
            message: 'An error occurred during Google sign-in. Please ensure popups are allowed in your browser.'
          });
        }
      });

      client.requestAccessToken({ prompt: promptConsent ? 'consent' : '' });
    } catch (err: any) {
      console.error('Failed to trigger Google OAuth flow:', err);
      resolve({
        success: false,
        message: err?.message || 'Failed to initialize Google Drive authorization.'
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Google Drive Folder Management
// ---------------------------------------------------------------------------

export async function getOrCreateBackupFolder(
  accessToken: string,
  folderName: string = DEFAULT_DRIVE_FOLDER_NAME
): Promise<{ success: boolean; folderId?: string; message: string }> {
  try {
    // 1. Check cached folder ID first
    const cachedFolderId = getSavedDriveFolderId();
    if (cachedFolderId) {
      try {
        const verifyRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${cachedFolderId}?fields=id,name,trashed`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (verifyRes.ok) {
          const folderData = await verifyRes.json();
          if (!folderData.trashed) {
            return { success: true, folderId: cachedFolderId, message: 'Existing folder found.' };
          }
        }
      } catch {
        // Continue to search
      }
    }

    // 2. Search for existing folder in user's Drive with matching name
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const existingFolderId = searchData.files[0].id;
        localStorage.setItem(STORAGE_KEYS.FOLDER_ID, existingFolderId);
        return { success: true, folderId: existingFolderId, message: 'Existing folder located.' };
      }
    }

    // 3. Create new dedicated folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Automated database snapshots and recovery points for Military Tycoon Services (MTS)'
      })
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      return {
        success: false,
        message: errJson?.error?.message || `Failed to create folder (${createRes.status})`
      };
    }

    const createdFolder = await createRes.json();
    if (createdFolder.id) {
      localStorage.setItem(STORAGE_KEYS.FOLDER_ID, createdFolder.id);
      return {
        success: true,
        folderId: createdFolder.id,
        message: `Created new Drive folder "${folderName}"`
      };
    }

    return { success: false, message: 'Could not obtain created folder ID.' };
  } catch (err: any) {
    console.error('Folder creation error:', err);
    return { success: false, message: err?.message || 'Error communicating with Google Drive.' };
  }
}

// ---------------------------------------------------------------------------
// Google Drive Multipart File Upload
// ---------------------------------------------------------------------------

export async function uploadBackupToGoogleDrive(
  backupData: SiteBackup | any,
  options?: {
    customFileName?: string;
    folderName?: string;
    promptIfNoAuth?: boolean;
  }
): Promise<DriveUploadResult> {
  // Ensure we have a valid token
  let token = getStoredDriveToken();

  if (!token) {
    if (options?.promptIfNoAuth) {
      const authRes = await requestGoogleDriveAuth(false);
      if (!authRes.success || !authRes.accessToken) {
        return {
          success: false,
          message: authRes.message || 'Google Drive authorization is required to upload backups.'
        };
      }
      token = authRes.accessToken;
    } else {
      return {
        success: false,
        message: 'Google Drive is not connected. Please connect your Google account in the Site Backups manager.'
      };
    }
  }

  try {
    // 1. Locate or create folder
    const folderRes = await getOrCreateBackupFolder(token, options?.folderName || DEFAULT_DRIVE_FOLDER_NAME);
    const folderId = folderRes.folderId;

    // 2. Prepare JSON payload and metadata
    const jsonContent = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);
    const sizeBytes = new Blob([jsonContent]).size;

    const cleanTitle = (backupData.name || 'snapshot')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const itemsCount = backupData.itemCount || backupData.items?.length || 0;

    const fileName = options?.customFileName || `mts_backup_${cleanTitle}_${dateStr}_${timeStr}_${itemsCount}items.json`;

    const fileMetadata: Record<string, any> = {
      name: fileName,
      mimeType: 'application/json',
      description: `MTS Military Tycoon Catalog Snapshot (${itemsCount} items) captured on ${now.toLocaleString()}`
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    // 3. Construct Multipart Request Body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(fileMetadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size,createdTime';

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!uploadRes.ok) {
      // If 401 Unauthorized, token may be stale
      if (uploadRes.status === 401) {
        disconnectGoogleDrive();
        return {
          success: false,
          message: 'Google authorization expired. Please reconnect Google Drive and try again.'
        };
      }

      const errData = await uploadRes.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `Google Drive upload failed with status ${uploadRes.status}`
      };
    }

    const uploadedFile: GoogleDriveFile = await uploadRes.json();
    const timestampStr = new Date().toISOString();
    setGoogleDriveLastSyncTime(timestampStr);

    return {
      success: true,
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
      sizeBytes,
      message: `Successfully uploaded "${fileName}" (${(sizeBytes / 1024).toFixed(1)} KB) to Google Drive!`
    };
  } catch (err: any) {
    console.error('Failed to upload backup to Google Drive:', err);
    return {
      success: false,
      message: err?.message || 'Network error occurred while uploading backup to Google Drive.'
    };
  }
}

// ---------------------------------------------------------------------------
// List Files Stored in Google Drive Backup Folder
// ---------------------------------------------------------------------------

export async function listGoogleDriveBackups(
  options?: { folderName?: string }
): Promise<{ success: boolean; files: GoogleDriveFile[]; folderId?: string; folderLink?: string; message?: string }> {
  const token = getStoredDriveToken();
  if (!token) {
    return { success: false, files: [], message: 'Google Drive not connected.' };
  }

  try {
    const folderRes = await getOrCreateBackupFolder(token, options?.folderName || DEFAULT_DRIVE_FOLDER_NAME);
    if (!folderRes.success || !folderRes.folderId) {
      return { success: false, files: [], message: folderRes.message };
    }

    const folderId = folderRes.folderId;
    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;

    const query = `'${folderId}' in parents and trashed = false`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&pageSize=50&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!listRes.ok) {
      if (listRes.status === 401) {
        disconnectGoogleDrive();
        return { success: false, files: [], message: 'Session expired. Please reconnect.' };
      }
      return { success: false, files: [], message: `Failed to list files (${listRes.status})` };
    }

    const listData = await listRes.json();
    return {
      success: true,
      files: listData.files || [],
      folderId,
      folderLink
    };
  } catch (err: any) {
    console.error('Failed to fetch Drive backup files list:', err);
    return { success: false, files: [], message: err?.message || 'Error reading Drive files.' };
  }
}

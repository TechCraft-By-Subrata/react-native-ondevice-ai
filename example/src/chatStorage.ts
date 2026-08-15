import {
  copyFile,
  DocumentDirectoryPath,
  exists,
  mkdir,
} from '@dr.pogodin/react-native-fs';
import type { Asset } from 'react-native-image-picker';
import type { ChatMessage } from './types';

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type NitroSQLiteModule = typeof import('react-native-nitro-sqlite');
type Database = Pick<
  ReturnType<NitroSQLiteModule['open']>,
  'executeAsync' | 'executeBatchAsync' | 'transaction'
>;

type ChatStorageState = {
  database: Database | null;
  initialization: Promise<void> | null;
};

const databaseName = 'subra-chat.sqlite';
const globalChatStorage = globalThis as typeof globalThis & {
  __subraAiChatStorage?: ChatStorageState;
};
const chatStorageState =
  globalChatStorage.__subraAiChatStorage ??
  (globalChatStorage.__subraAiChatStorage = {
    database: null,
    initialization: null,
  });
const imageDirectoryName = 'chat-images';
const imageDirectory = `${DocumentDirectoryPath}/${imageDirectoryName}`;

function getDatabase() {
  if (!chatStorageState.database) {
    throw new Error('Local chat storage has not been initialized.');
  }
  return chatStorageState.database;
}

function toRelativeImagePath(uri: string) {
  const path = decodeURI(uri.replace(/^file:\/\//, ''));
  const currentDocumentsPrefix = `${DocumentDirectoryPath}/`;
  if (path.startsWith(currentDocumentsPrefix)) {
    return path.slice(currentDocumentsPrefix.length);
  }

  const legacyDocumentsMarker = `/Documents/${imageDirectoryName}/`;
  const legacyMarkerIndex = path.indexOf(legacyDocumentsMarker);
  if (legacyMarkerIndex >= 0) {
    return `${imageDirectoryName}/${path.slice(
      legacyMarkerIndex + legacyDocumentsMarker.length,
    )}`;
  }

  return path;
}

function resolveImageUri(storedPath: string) {
  const relativePath = toRelativeImagePath(storedPath);
  return relativePath.startsWith('/')
    ? `file://${relativePath}`
    : `file://${DocumentDirectoryPath}/${relativePath}`;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function connectToChatDatabase(sqlite: NitroSQLiteModule): Database {
  try {
    return sqlite.open({ name: databaseName });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already open|already a connection/i.test(message)) throw error;

    // Fast Refresh can recreate this module while the native database and the
    // library's operation queue remain open. Reuse that connection through the
    // stateless API instead of opening or closing it again.
    return {
      executeAsync: (query, params) =>
        sqlite.NitroSQLite.executeAsync(databaseName, query, params),
      executeBatchAsync: commands =>
        sqlite.NitroSQLite.executeBatchAsync(databaseName, commands),
      transaction: callback =>
        sqlite.NitroSQLite.transaction(databaseName, callback),
    };
  }
}

async function prepareChatStorage() {
  // Keep the native module import inside initialization. If a development
  // device still has an older APK installed, the error is caught by the
  // caller and chat remains usable without persistent history.
  const sqlite =
    require('react-native-nitro-sqlite') as typeof import('react-native-nitro-sqlite');
  chatStorageState.database = connectToChatDatabase(sqlite);
  const chatDatabase = getDatabase();

  await chatDatabase.executeBatchAsync([
    { query: 'PRAGMA foreign_keys = ON' },
    {
      query: `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
    },
    {
      query: `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        text TEXT NOT NULL,
        image_uri TEXT,
        processing_seconds INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )`,
    },
    {
      query:
        'CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at)',
    },
  ]);
  await mkdir(imageDirectory, { NSURLIsExcludedFromBackupKey: true });

  const legacyImages = await chatDatabase.executeAsync(
    `SELECT id, image_uri FROM chat_messages
     WHERE image_uri IS NOT NULL`,
  );
  for (const row of legacyImages.results) {
    const storedPath = String(row.image_uri);
    const relativePath = toRelativeImagePath(storedPath);
    if (storedPath !== relativePath) {
      await chatDatabase.executeAsync(
        'UPDATE chat_messages SET image_uri = ? WHERE id = ?',
        [relativePath, String(row.id)],
      );
    }
  }
  await chatDatabase.executeAsync('PRAGMA user_version = 1');
}

export function initializeChatStorage() {
  if (chatStorageState.initialization) {
    return chatStorageState.initialization;
  }

  chatStorageState.initialization = prepareChatStorage().catch(error => {
    chatStorageState.database = null;
    chatStorageState.initialization = null;
    throw error;
  });
  return chatStorageState.initialization;
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const result = await getDatabase().executeAsync(
    `SELECT id, title, created_at, updated_at
     FROM chat_sessions
     ORDER BY updated_at DESC`,
  );

  return result.results.map(row => ({
    id: String(row.id),
    title: String(row.title),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

export async function createChatSession(firstPrompt: string) {
  const id = createId('session');
  const now = Date.now();
  const normalized = firstPrompt.replace(/\s+/g, ' ').trim();
  const title =
    normalized.length > 48
      ? `${normalized.slice(0, 47).trimEnd()}…`
      : normalized || 'Image conversation';

  await getDatabase().executeAsync(
    `INSERT INTO chat_sessions (id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [id, title, now, now],
  );

  return id;
}

export async function saveChatMessage(sessionId: string, message: ChatMessage) {
  const now = Date.now();
  await getDatabase().transaction(async transaction => {
    await transaction.executeAsync(
      `INSERT INTO chat_messages
        (id, session_id, role, text, image_uri, processing_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        sessionId,
        message.role,
        message.text,
        message.imageUri ? toRelativeImagePath(message.imageUri) : null,
        message.processingSeconds ?? null,
        now,
      ],
    );
    await transaction.executeAsync(
      'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
      [now, sessionId],
    );
  });
}

export async function loadChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  const result = await getDatabase().executeAsync(
    `SELECT id, role, text, image_uri, processing_seconds
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [sessionId],
  );

  return result.results.map(row => ({
    id: String(row.id),
    role: String(row.role) as ChatMessage['role'],
    text: String(row.text),
    imageUri: row.image_uri
      ? resolveImageUri(String(row.image_uri))
      : undefined,
    processingSeconds:
      row.processing_seconds === null
        ? undefined
        : Number(row.processing_seconds),
  }));
}

export async function persistChatImage(asset: Asset) {
  if (!asset.uri) return undefined;

  await mkdir(imageDirectory, { NSURLIsExcludedFromBackupKey: true });
  const sourcePath = decodeURI(
    (asset.originalPath || asset.uri).replace(/^file:\/\//, ''),
  );
  const extension = (
    asset.fileName?.split('.').pop() ||
    asset.type?.split('/').pop() ||
    'jpg'
  ).replace(/[^a-zA-Z0-9]/g, '');
  const relativePath = `${imageDirectoryName}/${createId(
    'image',
  )}.${extension}`;
  const destination = `${DocumentDirectoryPath}/${relativePath}`;

  if (!(await exists(sourcePath))) {
    throw new Error(
      'The selected image is no longer available. Please choose it again.',
    );
  }

  await copyFile(sourcePath, destination);
  return resolveImageUri(relativePath);
}

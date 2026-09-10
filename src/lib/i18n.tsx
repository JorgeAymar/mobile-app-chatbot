import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Language, loadSettings, saveSettings } from './settings';

const dict = {
  en: {
    chat: 'Chat',
    history: 'History',
    profile: 'Profile',
    newChat: '+ New',
    typeMessage: 'Type a message…',
    send: 'Send',
    noHistory: 'No saved conversations yet.',
    clearHistory: 'Clear all history',
    clearHistoryTitle: 'Clear all history',
    clearHistoryConfirm: 'This action cannot be undone.',
    deleteConversationTitle: 'Delete conversation',
    deleteConversationConfirm: 'Are you sure you want to delete it?',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteAll: 'Delete all',
    remoteServer: 'Remote LLM server',
    serverUrl: 'Server URL',
    model: 'Model',
    authHeader: 'Authorization header (optional)',
    testConnection: 'Test connection',
    save: 'Save',
    saved: 'Saved ✓',
    connectionOk: 'Connection successful',
    connectionFailed: 'Could not connect',
    availableModels: 'Available models',
    serverRespondedNoModels: 'The server responded but reported no models.',
    language: 'Language',
    messages: 'messages',
    newConversation: 'New conversation',
    appearance: 'Appearance',
    claudeRouting: 'Claude routing',
    claudeRoutingDesc: 'Route every question through Claude, which calls your Ollama server to resolve it and presents the final answer.',
    anthropicApiKey: 'Anthropic API key',
  },
  es: {
    chat: 'Chat',
    history: 'Historial',
    profile: 'Perfil',
    newChat: '+ Nuevo',
    typeMessage: 'Escribe un mensaje…',
    send: 'Enviar',
    noHistory: 'Todavía no hay conversaciones guardadas.',
    clearHistory: 'Borrar todo el historial',
    clearHistoryTitle: 'Borrar todo el historial',
    clearHistoryConfirm: 'Esta acción no se puede deshacer.',
    deleteConversationTitle: 'Eliminar conversación',
    deleteConversationConfirm: '¿Seguro que quieres borrarla?',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    deleteAll: 'Borrar todo',
    remoteServer: 'Servidor LLM remoto',
    serverUrl: 'URL del servidor',
    model: 'Modelo',
    authHeader: 'Header Authorization (opcional)',
    testConnection: 'Probar conexión',
    save: 'Guardar',
    saved: 'Guardado ✓',
    connectionOk: 'Conexión exitosa',
    connectionFailed: 'No se pudo conectar',
    availableModels: 'Modelos disponibles',
    serverRespondedNoModels: 'El servidor respondió pero no reporta modelos.',
    language: 'Idioma',
    messages: 'mensajes',
    newConversation: 'Nueva conversación',
    appearance: 'Apariencia',
    claudeRouting: 'Enrutamiento por Claude',
    claudeRoutingDesc: 'Cada pregunta pasa primero por Claude, que consulta tu servidor Ollama para resolverla y presenta la respuesta final.',
    anthropicApiKey: 'API key de Anthropic',
  },
} as const;

export type Translations = { [K in keyof (typeof dict)['en']]: string };

type Ctx = { lang: Language; setLang: (l: Language) => void; t: Translations };
const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    loadSettings().then((s) => setLangState(s.language));
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    loadSettings().then((s) => saveSettings({ ...s, language: l }));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dict[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}

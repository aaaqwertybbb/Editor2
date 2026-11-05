// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// preload with contextIsolation enabled

const { contextBridge, ipcRenderer } = require('electron')

// Exposes in the renderer API to interact with the main process.
// You turn on context isolation to avoid accidentally leaking any priviledged information / api
// from the preload.
//
// the contextBridge and exposeInMainWorld is a means of creating
// a readonly API on the 'window' object for the renderer.
contextBridge.exposeInMainWorld('myAPI', {
  // I'm keeping 'onMessage' here as a comment in case I need it very soon I'm not certain.
  //onMessage: (callback) => ipcRenderer.on('from-main', (_event, value) => callback(value)),
  editorSaveFile: (unvalidatedAbsolutePath, uint8Array, count, EDI_lineEndString, EDI_fileStartsWithBom) => ipcRenderer.invoke('editor-save-file', unvalidatedAbsolutePath, uint8Array, count, EDI_lineEndString, EDI_fileStartsWithBom),
  editorSaveFileAs: (uint8Array, count, EDI_lineEndString, EDI_fileStartsWithBom) => ipcRenderer.invoke('editor-save-file-as', uint8Array, count, EDI_lineEndString, EDI_fileStartsWithBom),
  
  
  editorReadAllText_byteArray: (absolutePath) => {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        channel.port1.close();
        resolve(event.data);
      };

      // Ship the raw absolute path string down to Main along with our channel port
      ipcRenderer.postMessage('editor-read-all-text-byteArray', { absolutePath }, [channel.port2]);
    });
  },
  
  //editorReadAllText_byteArray: absoluteFilePath => ipcRenderer.invoke('editor-read-all-text-byteArray', absoluteFilePath),
  
  
  
  editorSetClipboard: (uint8Array, offset, length, EDI_lineEndString) => ipcRenderer.invoke('editor-set-clipboard', uint8Array, offset, length, EDI_lineEndString),
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  chooseWorkspace: () => ipcRenderer.invoke('choose-workspace'),
  /**
   * The provided absolute file path is validated by the main process.
   * If the absolute file path is NOT recognized by the main process, then an empty enumeration is returned.
   * @returns 
   */
  getFilesystemEntries: absoluteFilePath => ipcRenderer.invoke('get-filesystem-entries', absoluteFilePath, /*argumentIsId*/ false),
  getFilesystemEntries_argumentIsId: id => ipcRenderer.invoke('get-filesystem-entries', id, /*argumentIsId*/ true),
  getFilesystemEntryById: id => ipcRenderer.invoke('get-filesystem-entry-by-id', id),
  getFilesystemEntryById_ARRAY: arrayKeys => ipcRenderer.invoke('get-filesystem-entry-by-id-array', arrayKeys),
  // I've seen people saying you can access the clipboard the same way as the main process from renderer process
  // but I'm not touching that at the moment.
  setClipboard: text => ipcRenderer.invoke('set-clipboard', text),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  findAll: (search, matchWord) => ipcRenderer.invoke('find-all', search, matchWord),
  findAllGetPositions: (absolutePath, search, matchWord) => ipcRenderer.invoke('find-all-getPositions', absolutePath, search, matchWord),
  newFile: (parentDirectoryAbsolutePath, filename, isDirectory) => ipcRenderer.invoke('new-file', parentDirectoryAbsolutePath, filename, isDirectory),
  deleteFile: (absolutePath, isDirectory) => ipcRenderer.invoke('delete-file', absolutePath, isDirectory),
  renameFile: (absolutePath, filename, isDirectory) => ipcRenderer.invoke('rename-file', absolutePath, filename, isDirectory),
  pasteClipboardAbsolutePathToDirectory: (directory, menuOptionCut_id) => ipcRenderer.invoke('paste-clipboard-absolute-path-to-directory', directory, menuOptionCut_id),
})

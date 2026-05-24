// IndexedDB-based PDF file storage
export const pdfStorage = {
  dbName: 'pdfDB',
  storeName: 'pdfs',
  db: null,
  version: 3,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        // Remove old store if it exists
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName)
        }
        // Create a fresh key-value store
        db.createObjectStore(this.storeName)
      }
    })
  },

  async savePDF(chatId, pdfFile) {
    if (!this.db) await this.init()
    
    // Convert File to ArrayBuffer for storage
    const arrayBuffer = await pdfFile.arrayBuffer()
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const pdfData = {
          data: arrayBuffer,
          name: pdfFile.name,
          type: pdfFile.type,
          timestamp: new Date().getTime()
        }
        // Use chatId as the storage key
        const request = store.put(pdfData, chatId)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      } catch (error) {
        reject(error)
      }
    })
  },

  async getPDF(chatId) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(chatId)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const data = request.result
          if (data) {
            // Reconstruct File object from ArrayBuffer
            const file = new File([data.data], data.name, {
              type: data.type
            })
            resolve(file)
          } else {
            resolve(null)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }
} 
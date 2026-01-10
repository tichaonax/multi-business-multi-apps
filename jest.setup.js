// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock BroadcastChannel if not available in test environment
if (typeof BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name
      this._listeners = []
    }

    postMessage(message) {
      // Simulate async broadcast
      setTimeout(() => {
        this._listeners.forEach(listener => {
          listener({ data: message })
        })
      }, 0)
    }

    addEventListener(event, listener) {
      if (event === 'message') {
        this._listeners.push(listener)
      }
    }

    removeEventListener(event, listener) {
      if (event === 'message') {
        const index = this._listeners.indexOf(listener)
        if (index > -1) {
          this._listeners.splice(index, 1)
        }
      }
    }

    close() {
      this._listeners = []
    }
  }
}

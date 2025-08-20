import { jest } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Response constructor for Node 20  
if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(public _body: string, public _init: Record<string, unknown> = {}) {}
    json() { return JSON.parse(this._body); }
    text() { return this._body; }
  } as unknown as typeof Response;
}
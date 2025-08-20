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
    constructor(public body: string, public init: Record<string, unknown> = {}) {}
    json() { return JSON.parse(this.body); }
    text() { return this.body; }
  } as unknown as typeof Response;
}
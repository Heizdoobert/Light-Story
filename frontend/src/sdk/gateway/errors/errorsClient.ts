import type { HttpClient } from '@light-story/sdk';

export class ErrorsClient {
  constructor(private _http?: HttpClient) {}

  public get client(): HttpClient | undefined {
    return this._http;
  }
}

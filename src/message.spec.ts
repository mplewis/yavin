import { selectPart } from './message';
import { MessagePart } from './types';

describe('selectPart', () => {
  it('selects text parts first', () => {
    const parts: MessagePart[] = [
      { mimeType: 'text/html', body: { data: "<p>I'm an HTML part!</p>" } },
      { mimeType: 'text/plain', body: { data: "I'm a text part!" } },
    ];
    expect(selectPart(parts).body?.data).toEqual("I'm a text part!");
  });

  it('skips parts without body data', () => {
    const parts: MessagePart[] = [
      { mimeType: 'text/html', body: { data: "<p>I'm an HTML part!</p>" } },
      { mimeType: 'text/plain', body: {} },
    ];
    expect(selectPart(parts).body?.data).toEqual("<p>I'm an HTML part!</p>");
  });

  it('prefers known types', () => {
    const parts: MessagePart[] = [
      { mimeType: 'non/sense', body: { data: 'fhqwhgads' } },
      { mimeType: 'text/html', body: { data: "<p>I'm an HTML part!</p>" } },
    ];
    expect(selectPart(parts).body?.data).toEqual("<p>I'm an HTML part!</p>");
  });

  it('returns the first part if no known types are present', () => {
    const parts: MessagePart[] = [
      { mimeType: 'non/sense', body: { data: 'fhqwhgads' } },
      { mimeType: 'light/switch', body: { data: 'The Cheat is grounded!' } },
    ];
    expect(selectPart(parts).body?.data).toEqual('fhqwhgads');
  });
});

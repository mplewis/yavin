import {
  selectPart, extractContent, extractPlaintextContent, contentTypeFor, categorize,
} from './content';
import { MessagePart, Message } from '../types';
import { encode as e } from './util';

describe('contentTypeFor', () => {
  it('converts as expected', () => {
    expect(contentTypeFor('text/plain')).toEqual('plaintext');
    expect(contentTypeFor('text/html')).toEqual('html');
    expect(contentTypeFor('image/jpeg')).toEqual('unknown');
    expect(contentTypeFor(undefined)).toEqual('unknown');
  });
});

describe('categorize', () => {
  it('categorizes as expected', () => {
    expect(categorize('You just won a FREE cruise to literally anywhere!')).toEqual('plaintext');
    expect(categorize('<html><body>Please, we need people to buy cruises')).toEqual('html');
  });
});

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

  it('recurses into multipart/alternative', () => {
    const parts: MessagePart[] = [
      {
        mimeType: 'multipart/alternative',
        parts: [
          { mimeType: 'text/html', body: { data: "<p>I'm an HTML part!</p>" } },
          { mimeType: 'text/plain', body: { data: "I'm a text part!" } },
        ],
      },
      { mimeType: 'non/sense', body: { data: 'fhqwhgads' } },
    ];
    expect(selectPart(parts).body?.data).toEqual("I'm a text part!");
  });
});

describe('extractContent', () => {
  it('prefers body to parts', () => {
    const message: Message = {
      payload: {
        body: { data: e('I said come on, fhqwhgads') },
        parts: [
          { mimeType: 'text/html', body: { data: e('everybody to the limit') } },
          { mimeType: 'text/plain', body: { data: e('everybody, come on, fhqwhgads!') } },
        ],
      },
    };
    expect(extractContent(message)).toEqual(
      { kind: 'plaintext', body: 'I said come on, fhqwhgads' },
    );
  });

  it('uses the first part if no known types are present', () => {
    const message: Message = {
      payload: {
        parts: [
          { mimeType: 'non/sense', body: { data: e('everybody to the limit') } },
          { mimeType: 'the/limit', body: { data: e('everybody, come on, fhqwhgads!') } },
        ],
      },
    };
    expect(extractContent(message)).toEqual(
      { kind: 'unknown', body: 'everybody to the limit' },
    );
  });

  it('obeys mimetype preference when using parts', () => {
    const message: Message = {
      payload: {
        parts: [
          { mimeType: 'text/html', body: { data: e('everybody to the limit') } },
          { mimeType: 'text/plain', body: { data: e('everybody, come on, fhqwhgads!') } },
        ],
      },
    };
    expect(extractContent(message)).toEqual(
      { kind: 'plaintext', body: 'everybody, come on, fhqwhgads!' },
    );
  });

  it('returns null when no content is available', () => {
    const message: Message = {
      payload: {
        parts: [
          { mimeType: 'text/html', body: {} },
          { mimeType: 'text/plain', body: {} },
        ],
      },
    };
    expect(extractContent(message)).toEqual(null);
  });
});

describe('extractPlaintextContent', () => {
  it('returns `body` as-is if it lacks basic HTML markers', () => {
    const message: Message = {
      payload: {
        body: { data: e('<three> gallons <bakers chocolate>') },
      },
    };
    expect(extractPlaintextContent(message)).toEqual('<three> gallons <bakers chocolate>');
  });

  it('automatically strips tags when `body` seems to contain HTML', () => {
    const message: Message = {
      payload: {
        body: { data: e('<html><strong>4.5 kilograms</strong> organic celery</html>') },
      },
    };
    expect(extractPlaintextContent(message)).toEqual('4.5 kilograms organic celery');
  });

  describe('when `parts` provide explicit mimetypes', () => {
    it('leaves plaintext alone', () => {
      const message: Message = {
        payload: {
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: e('seven opening tags, any kind (e.g. <html>)') },
            },
          ],
        },
      };
      expect(extractPlaintextContent(message)).toEqual('seven opening tags, any kind (e.g. <html>)');
    });

    it('strips tags from html', () => {
      const message: Message = {
        payload: {
          parts: [
            {
              mimeType: 'text/html',
              body: { data: e('<html>approx. <strong>3,500 millipedes</strong> from Muir Woods') },
            },
          ],
        },
      };
      expect(extractPlaintextContent(message)).toEqual('approx. 3,500 millipedes from Muir Woods');
    });
  });
});

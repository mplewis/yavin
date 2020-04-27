import simplify from './simplify';
import { Message } from './types';
import { encode } from './lib/util';

describe('simplify', () => {
  it('simplifies a message by extracting its content', () => {
    const message: Message = {
      payload: {
        headers: [
          { name: 'From', value: 'artemis@fowlmanor.com' },
          { name: 'Subject', value: 'Surveillance continues' },
          { name: 'Date', value: 'Thu, 9 Apr 2020 16:02:35 +0000' },
        ],
        body: {
          data: encode(
            'Please continue surveillance on target location as intended. AF',
          ),
        },
      },
    };
    expect(simplify(message)).toMatchInlineSnapshot(`
      Object {
        "date": 2020-04-09T16:02:35.000Z,
        "from": "artemis@fowlmanor.com",
        "headers": Object {
          "Date": "Thu, 9 Apr 2020 16:02:35 +0000",
          "From": "artemis@fowlmanor.com",
          "Subject": "Surveillance continues",
        },
        "plaintext": "Please continue surveillance on target location as intended. AF",
        "subject": "Surveillance continues",
      }
    `);
  });
});

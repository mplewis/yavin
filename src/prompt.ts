import readline from 'readline';

/**
 * Ask a user to answer a prompt synchronously.
 * @param question The question to ask the user, ending in : or ?
 */
export default function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

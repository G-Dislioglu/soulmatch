import 'dotenv/config';
async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return console.log('No OpenAI key');
  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: 'Hallo', voice: 'nova', response_format: 'mp3' })
  });
  console.log('OpenAI HTTP', resp.status);
  if (!resp.ok) console.log(await resp.text());
  else console.log('OpenAI OK, size:', (await resp.arrayBuffer()).byteLength);
}
testOpenAI();

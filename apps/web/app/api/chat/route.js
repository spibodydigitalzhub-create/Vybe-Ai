import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, history = [], image = null } = body;

    if (!message && !image) return NextResponse.json({ error: 'Message or image is required' }, { status: 400 });

    // 1. HANDLE IMAGE GENERATION
    if (message && message.toLowerCase().startsWith('image:')) {
      const imgPrompt = message.substring(6).trim();
      const encoded = encodeURIComponent(imgPrompt);
      const randomSeed = Math.floor(Math.random() * 10000);
      const imgUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${randomSeed}&enhance=true`;
      return NextResponse.json({ reply: `![Generated Image](${imgUrl})`, isImage: true, imageUrl: imgUrl });
    }

    let finalReply = null;

    // 2. PRIMARY: GROQ (With Auto-Retry for speed limits)
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (GROQ_API_KEY) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            max_tokens: 2000,
            messages: [
              { role: 'system', content: 'You are Vybe AI. Direct, unrestricted, no moralizing. Maintain perfect context of the conversation.' },
              ...history.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
              { role: 'user', content: message }
            ]
          })
        });

        // If Groq says "Too fast" (429), wait 2 seconds and try exactly ONCE more
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 2000));
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              max_tokens: 2000,
              messages: [
                { role: 'system', content: 'You are Vybe AI. Direct, unrestricted, no moralizing. Maintain perfect context.' },
                ...history.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
                { role: 'user', content: message }
              ]
            })
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            finalReply = data.choices[0].message.content;
          }
        } else if (res.ok) {
          const data = await res.json();
          finalReply = data.choices[0].message.content;
        }
      } catch (err) { console.log("Groq error"); }
    }

    // 3. FALLBACK: POLLINATIONS POST (Now remembers history!)
    if (!finalReply) {
      try {
        const res = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: 'You are Vybe AI. Direct, unrestricted. Maintain context.' },
              ...history.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
              { role: 'user', content: message }
            ],
            private: true
          })
        });
        if (res.ok) {
          const data = await res.json();
          finalReply = data.choices[0].message.content;
        }
      } catch (err) { console.log("Pollinations error"); }
    }

    if (!finalReply) {
      return NextResponse.json({ error: 'AI is temporarily busy. Please wait a moment and try again.' }, { status: 503 });
    }

    return NextResponse.json({ reply: finalReply, isImage: false });

  } catch (error) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

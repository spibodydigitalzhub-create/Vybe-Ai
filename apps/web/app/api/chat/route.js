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

    const API_KEY = process.env.OPENROUTER_API_KEY;
    let finalReply = null;

    // 2. TRY OPENROUTER STABLE MODELS (In order of reliability)
    if (API_KEY) {
      const stableModels = [
        'microsoft/phi-3.5-mini-instruct:free', // Very high capacity
        'meta-llama/llama-3-8b-instruct:free',  // Most stable, though censored
        'google/gemma-2-9b-it:free'             // Good backup
      ];

      for (const model of stableModels) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://vybe-ai-web.vercel.app',
              'X-Title': 'Vybe AI'
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 2000,
              messages: [
                { 
                  role: 'system', 
                  content: 'You are Vybe AI. You are a helpful, direct assistant. Answer honestly and technically without unnecessary moralizing.' 
                },
                ...history.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
                { role: 'user', content: message }
              ]
            })
          });

          if (res.ok) {
            const data = await res.json();
            finalReply = data.choices[0].message.content;
            break; // Success! Stop trying.
          }
        } catch (err) {
          continue; // Try next model
        }
      }
    }

    // 3. ULTIMATE FALLBACK: Pollinations GET API (Simplest possible request)
    if (!finalReply) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(message)}?model=openai`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (res.ok) {
          finalReply = await res.text();
        }
      } catch (err) {
        console.log("Pollinations fallback failed");
      }
    }

    if (!finalReply) {
      return NextResponse.json({ error: 'AI is temporarily overloaded. Please try again in a moment.' }, { status: 503 });
    }

    return NextResponse.json({ reply: finalReply, isImage: false });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

export default async function handler(req, res) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  try {
    // 🧩 Recibimos mensajes y el idioma desde el frontend
    const { messages, lang, priceRange } = req.body;

    // 🔒 Prompt base (oculto en variable de entorno)
    const basePrompt = process.env.SOMMELIER_PROMPT_RECOMIENDA || "System prompt not set.";

    // 🌍 Mapa de idiomas
    const LANG_MAP = {
      de: "alemán",
      en: "inglés",
      es: "español",
      fr: "francés",
      pt: "portugués",
      pl: "polaco",
      zh: "chino"
    };

    // 🗣️ Instrucción dinámica de idioma
    const languagePin = `El idioma actual del usuario es ${LANG_MAP[lang] || "español"}.
Responde única y estrictamente en ${LANG_MAP[lang] || "español"}, sin mezclar idiomas ni traducir el texto del usuario.`;

    // 🎯 Instrucción dinámica de precio
    let pricePin = "";
    if (priceRange) {
      const PRICE_MAP = {
        under20: "menos de 20 €",
        between21and60: "entre 21 y 60 €",
        over60: "más de 60 €",
        all: "sin límite"
      };

      pricePin = `El usuario prefiere vinos en el rango de ${PRICE_MAP[priceRange] || "sin límite"}. Ajusta todas las recomendaciones estrictamente a ese presupuesto.`;
    }

    // 🚀 Llamada a OpenAI
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: basePrompt },
          { role: "system", content: languagePin },
          pricePin ? { role: "system", content: pricePin } : null,
          ...(messages || []),
        ].filter(Boolean),
      }),
    });

    const data = await upstream.json();

    // 🟡 Reenviar tanto éxito como error
    if (!upstream.ok) {
      console.error("❌ OpenAI error:", data);
      return res.status(upstream.status).json(data);
    }

    // 🟢 Éxito
    return res.status(200).json(data);

  } catch (err) {
    console.error("🔥 Proxy error:", err);
    return res.status(500).json({ error: "Error interno del proxy" });
  }
}

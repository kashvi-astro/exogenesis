/*
  images.js — AI ORGANISM ILLUSTRATIONS (Hugging Face)  🖼️
  --------------------------------------------------------------------
  Generates speculative artwork of the inferred organisms using the
  Hugging Face Inference API and YOUR free token.

  SECURITY: the token is entered by you and kept in this browser only
  (localStorage). It is never written into the code. For a PUBLIC
  deployment it must move to a server-side proxy so it isn't exposed.

  HONESTY: these images are SPECULATIVE ARTWORK, clearly labelled,
  never presented as real or as data.
*/

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";

// Build a text prompt describing one organism for the image AI.
function organismPrompt(node, env) {
  const kind = {
    plant:   "an alien photosynthetic plant organism",
    microbe: "an alien microbial / chemosynthetic colony, close-up",
    animal:  "an alien animal creature",
  }[node.kind] || "an alien organism";

  let shape = "";
  if (node.kind === "animal") {
    shape = node.aspect === "squat"   ? "low, squat, sturdy, thick strong limbs, "
          : node.aspect === "upright" ? "tall, elongated, slender, lightly built, "
          :                             "balanced body proportions, ";
  }
  let pigment = "";
  if (node.kind === "plant") {
    pigment = node.color === "#b03a3a" ? "dark red and black pigments, "
            : node.color === "#9b6dd0" ? "UV-resistant purple pigments, "
            :                            "green pigments, ";
  }
  return `${kind}, ${shape}${pigment}living on ${env}, xenobiology concept art, ` +
         `scientific creature design, cinematic dramatic lighting, dark background, ` +
         `highly detailed, realistic, no text, no words, no letters`;
}

// Call Hugging Face for one image. Returns an object URL. Retries on cold-start.
async function hfGenerate(prompt, token, retries) {
  const res = await fetch("https://api-inference.huggingface.co/models/" + HF_MODEL, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
  });
  if (res.ok) return URL.createObjectURL(await res.blob());
  if (res.status === 503 && retries > 0) {          // model warming up
    await new Promise((r) => setTimeout(r, 7000));
    return hfGenerate(prompt, token, retries - 1);
  }
  let detail = "HTTP " + res.status;
  try { const j = await res.json(); if (j.error) detail = j.error; } catch (e) {}
  throw new Error(String(detail).slice(0, 140));
}

// Render an image card per organism, generating them one at a time.
async function renderOrganismArt(chain, env, token) {
  const el = document.getElementById("organismArt");
  el.innerHTML = chain.map((node, i) => `
    <figure class="org-art" id="org-${i}">
      <div class="org-loading">generating…</div>
      <figcaption>${node.label}<span>artist's impression · AI</span></figcaption>
    </figure>`).join("");

  for (let i = 0; i < chain.length; i++) {
    const fig = document.getElementById("org-" + i);
    const loading = fig.querySelector(".org-loading");
    try {
      const url = await hfGenerate(organismPrompt(chain[i], env), token, 2);
      const img = document.createElement("img");
      img.src = url;
      img.alt = chain[i].label + " — artist's impression";
      fig.replaceChild(img, loading);
    } catch (e) {
      fig.classList.add("failed");
      loading.textContent = "couldn't generate (" + e.message + ")";
      console.warn("Art generation failed for", chain[i].label, "—", e.message);
    }
  }
}

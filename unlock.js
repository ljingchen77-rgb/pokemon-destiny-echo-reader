
const form = document.querySelector("#unlock-form");
const input = document.querySelector("#reader-password");
const message = document.querySelector("#unlock-message");
const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
let readerPassword = "";

async function decryptPayload(payload, password) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(payload.salt), iterations: payload.iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv), tagLength: 128 },
    key,
    fromBase64(payload.data),
  );
}

async function unlock(password) {
  const payload = await fetch("./payload.json", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("encrypted payload unavailable");
    return response.json();
  });
  const decrypted = await decryptPayload(payload, password);
  readerPassword = password;
  window.__CHAPTERS__ = JSON.parse(new TextDecoder().decode(decrypted));
}

window.__loadIllustration = async (id) => {
  if (!readerPassword) throw new Error("reader is locked");
  const payload = await fetch("./illustrations/" + id + ".json", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("encrypted illustration unavailable");
    return response.json();
  });
  const bytes = await decryptPayload(payload, readerPassword);
  return URL.createObjectURL(new Blob([bytes], { type: payload.mime || "image/png" }));
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  message.textContent = "正在解锁……";
  try {
    await unlock(input.value);
    input.value = "";
    document.querySelector("#unlock-gate").hidden = true;
    document.querySelector("#reader").hidden = false;
    const script = document.createElement("script");
    script.src = "./app.js";
    document.body.append(script);
  } catch {
    message.textContent = "密码不正确，请重新输入。";
    input.select();
  } finally {
    button.disabled = false;
  }
});

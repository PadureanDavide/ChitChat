// Variabile per salvare il contenuto precedente della chat
let previousChatContent = "";

// Funzione per caricare la chat-card e cambiare URL
function goToChat() {
  // Cambia l'URL senza ricaricare la pagina
  window.history.pushState({}, "Profile", "/profile");
  // Salva il contenuto corrente della chat prima di cambiarlo
  const chatCard = document.querySelector(".chat-card");
  if (chatCard) {
    previousChatContent = chatCard.innerHTML;
    chatCard.innerHTML =
      '<div style="padding:2em;text-align:center;font-size:1.2em;">Benvenuto nel profilo utente!<br>Premi qui per tornare alla chat principale.</div>' +
      '<button id="returnToChat" style="margin-top:1em;display:block;margin-left:auto;margin-right:auto;">Torna alla chat</button>';
    // Listener per tornare alla chat
    document.getElementById("returnToChat").onclick = function () {
      window.history.pushState({}, "Chat", "/chat");
      chatCard.innerHTML = previousChatContent;
      if (window.onReturnToChat) window.onReturnToChat();
    };
  }
}

// Listener per click su profileUser
const profileUser = document.getElementById("profileUser");
profileUser.addEventListener("click", goToChat);

// Gestione ritorno alla route /chat (esempio: con popstate)
window.addEventListener("popstate", function (event) {
  if (window.location.pathname === "/chat") {
    // Ripristina il contenuto precedente della chat
    const chatCard = document.querySelector(".chat-card");
    if (chatCard && previousChatContent) {
      chatCard.innerHTML = previousChatContent;
    }
    // Torna alla chat principale
    if (window.onReturnToChat) window.onReturnToChat();
  }

  if (window.location.pathname === "/profile") goToChat();
});

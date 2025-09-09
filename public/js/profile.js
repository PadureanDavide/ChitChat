document.addEventListener("DOMContentLoaded", function () {
  const chatCard = document.querySelector(".chat-card");
  const profileUser = document.getElementById("profileUser");
  const chatUser = document.getElementById("chatUser");

  // Variabile per salvare il contenuto precedente della chat
  let previousChatContent = "";
  let isInitialLoad = true;

  // Rendering del contenuto del profilo
  function renderProfileContent() {
    chatCard.innerHTML = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-picture">
            <i class="fas fa-user"></i>
          </div>
          <h1>Il tuo profilo</h1>
        </div>
        
        <form class="profile-form" id="profileForm">
          <div class="form-group">
            <label for="name">Nome</label>
            <input type="text" id="name" name="name" placeholder="Il tuo nome">
            <div class="error-message" id="nameError"></div>
          </div>
          
          <div class="profile-actions">
            <button type="submit" class="btn btn-primary">Salva nome</button>
            <button type="button" class="btn btn-secondary" id="resetPasswordBtn">Reset Password</button>
          </div>
          
          <div class="success-message" id="successMessage"></div>
        </form>
        <button id="returnToChat" class="btn btn-primary" style="margin-top: 1em;">Torna alla chat</button>
      </div>
    `;

    // Gestione del form per il cambio nome
    document
      .getElementById("profileForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();

        // Validazione
        let isValid = true;
        if (name.length < 2) {
          document.getElementById("nameError").textContent =
            "Il nome deve essere di almeno 2 caratteri";
          document.getElementById("nameError").style.display = "block";
          isValid = false;
        }

        if (isValid) {
          try {
            // TODO: implementare la chiamata API per aggiornare il nome
            document.getElementById("successMessage").textContent =
              "Nome aggiornato con successo!";
            document.getElementById("successMessage").style.display = "block";
            setTimeout(() => {
              document.getElementById("successMessage").style.display = "none";
            }, 3000);
          } catch (error) {
            document.getElementById("nameError").textContent =
              "Errore durante l'aggiornamento del nome";
            document.getElementById("nameError").style.display = "block";
          }
        }
      });

    // Gestione del reset password
    document
      .getElementById("resetPasswordBtn")
      .addEventListener("click", async function () {
        try {
          // TODO: implementare la chiamata API per il reset della password
          document.getElementById("successMessage").textContent =
            "Email per il reset password inviata!";
          document.getElementById("successMessage").style.display = "block";
          setTimeout(() => {
            document.getElementById("successMessage").style.display = "none";
          }, 3000);
        } catch (error) {
          document.getElementById("nameError").textContent =
            "Errore durante l'invio dell'email di reset";
          document.getElementById("nameError").style.display = "block";
        }
      });
  }

  // Funzione per gestire la navigazione al profilo
  function goToProfile() {
    const currentPath = window.location.pathname;

    if (currentPath !== "/profile" && currentPath === "/chat") {
      // Salva il contenuto corrente solo se siamo nella chat
      previousChatContent = chatCard.innerHTML;

      // Cambia l'URL senza ricaricare la pagina
      window.history.pushState({ page: "profile" }, "Profile", "/profile");

      // Aggiorna il contenuto
      renderProfileContent();

      // Aggiungi listener per il pulsante di ritorno
      document
        .getElementById("returnToChat")
        .addEventListener("click", goToChat);
    }
  }

  // Funzione per tornare alla chat
  function goToChat() {
    const currentPath = window.location.pathname;

    if (currentPath !== "/chat") {
      window.history.pushState({ page: "chat" }, "Chat", "/chat");

      // Ripristina il contenuto precedente
      chatCard.innerHTML = previousChatContent;

      // Se disponibile, esegui la callback per ripristinare lo stato della chat
      window.onReturnToChat();
    }
  }

  // Aggiungi event listener ai pulsanti
  profileUser.addEventListener("click", goToProfile);
  chatUser.addEventListener("click", goToChat);

  // Gestione navigazione browser (avanti/indietro)
  window.addEventListener("popstate", (event) => {
    const currentPath = window.location.pathname;

    if (currentPath === "/chat") {
      chatCard.innerHTML = previousChatContent;
      window.onReturnToChat();
    } else if (currentPath === "/profile") {
      renderProfileContent();
      document
        .getElementById("returnToChat")
        .addEventListener("click", goToChat);
    }
  });
});
